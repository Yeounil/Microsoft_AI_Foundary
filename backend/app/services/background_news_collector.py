import asyncio
import logging
from typing import List, Dict, Set
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import threading

from app.services.openai_service import OpenAIService
from app.services.news_service import NewsService
from app.services.news_db_service import NewsDBService
from app.services.supabase_user_interest_service import SupabaseUserInterestService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class BackgroundNewsCollector:
    """백그라운드 뉴스 수집 및 AI 분석 서비스 (멀티스레드, GPT-5)"""

    def __init__(self):
        self.openai = OpenAIService()  # GPT-5 사용
        self.interest_service = SupabaseUserInterestService()
        # 뉴스 수집용 스레드 풀 (종목별 병렬 처리)
        self.collection_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="news-collector")
        # AI 분석용 스레드 풀 (분석 병렬 처리)
        self.analysis_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="ai-analyzer")
        self._lock = threading.Lock()
        
    async def collect_popular_symbols_news(self, limit_per_symbol: int = 100) -> Dict:
        """인기 해외 주식 100개의 뉴스를 Reuters API로만 백그라운드에서 수집 (멀티스레드)"""
        crawl_start_time = datetime.now()

        try:
            logger.info("[BACKGROUND_CRAWL] Starting background news collection (multithreaded, Reuters only)")

            # 1. 인기 해외 주식 100개 목록 (기본 목록 사용 - 사용자 관심사와 무관하게 항상 이들 종목 크롤링)
            popular_symbols = self._get_default_popular_symbols()

            logger.info(f"[BACKGROUND_CRAWL] Target symbols: {len(popular_symbols)} stocks (Reuters API only, no article limit per symbol)")

            # 2. 각 종목별로 뉴스 수집을 별도 스레드에서 실행
            loop = asyncio.get_event_loop()
            futures = []

            for symbol in popular_symbols:
                # 각 종목 수집을 별도 스레드에서 실행
                future = loop.run_in_executor(
                    self.collection_executor,
                    self._collect_and_analyze_symbol_news_sync,
                    symbol,
                    limit_per_symbol
                )
                futures.append((symbol, future))

            # 3. 모든 스레드의 작업 완료 대기
            total_collected = 0
            successful_symbols = []
            failed_symbols = []

            for symbol, future in futures:
                try:
                    result = await future
                    collected_count = result.get('collected_count', 0)
                    total_collected += collected_count
                    successful_symbols.append({
                        'symbol': symbol,
                        'count': collected_count
                    })
                    # 성공한 경우 이력 기록
                    await self._record_crawl_history(
                        symbol, collected_count, "scheduled", "completed"
                    )
                    logger.info(f"[THREAD] Symbol {symbol} collection completed: {collected_count} articles")
                except Exception as e:
                    logger.error(f"[THREAD] Symbol {symbol} news collection failed: {str(e)}")
                    failed_symbols.append(symbol)
                    # 실패한 경우에도 이력 기록
                    await self._record_crawl_history(
                        symbol, 0, "scheduled", "failed", str(e)
                    )

            logger.info(f"[BACKGROUND_CRAWL] Collection completed: Total {total_collected} articles collected (multithreaded)")
            logger.info(f"[BACKGROUND_CRAWL] Successful: {len(successful_symbols)}, Failed: {len(failed_symbols)}")

            return {
                "status": "completed",
                "total_collected": total_collected,
                "successful_symbols": successful_symbols,
                "failed_symbols": failed_symbols,
                "collection_time": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[ERROR] Error during background news collection: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "total_collected": 0
            }
    
    def _get_default_popular_symbols(self) -> List[str]:
        """대중적인 해외 주식 100개 기본 목록 반환"""
        # 기술주, 금융, 헬스케어, 소비재, 에너지, 산업재 등 다양한 섹터 포함
        return [
            # Tech (20개)
            "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "NFLX", "CRM",
            "ORACLE", "ADOBE", "INTEL", "AMD", "MU", "QCOM", "IBM", "CSCO", "HPQ", "AVGO",

            # Finance (15개)
            "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "CB",
            "BLK", "AIG", "MMC", "ICE", "CBOE",

            # Healthcare (15개)
            "JNJ", "UNH", "PFE", "ABBV", "MRK", "TMO", "LLY", "ABT", "AMGN", "GILD",
            "CVS", "AMAT", "REGN", "BIIB", "VRTX",

            # Retail/Consumer (15개)
            "WMT", "TGT", "HD", "LOW", "MCD", "SBUX", "KO", "PEP", "NKE", "VFC",
            "LULU", "DKS", "RH", "ORCL", "COST",

            # Industrials (10개)
            "CAT", "BA", "MMM", "RTX", "HON", "JCI", "PCAR", "GE", "DE", "LMT",

            # Energy (10개)
            "XOM", "CVX", "COP", "MPC", "PSX", "VLO", "EOG", "OXY", "MRO", "SLB",

            # Communications (5개)
            "VZ", "T", "TMUS", "CMCSA", "CHTR",

            # Real Estate (5개)
            "SPG", "DLR", "PLD", "PSA", "EQIX",

            # Utilities (5개)
            "NEE", "DUK", "SO", "EXC", "AEP"
        ]

    async def _get_popular_symbols(self) -> List[str]:
        """사용자 관심사 기반 인기 종목 추출 (현재 미사용 - 레거시)"""
        try:
            supabase = get_supabase()

            # user_interests 테이블에서 가장 많이 등장하는 종목들을 추출
            result = supabase.table("user_interests")\
                .select("interest")\
                .execute()

            if not result.data:
                return []

            # 종목별 등장 횟수 계산
            symbol_counts = {}
            for item in result.data:
                symbol = item.get('interest', '')
                if symbol:
                    symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1

            # 상위 15개 종목 선택
            popular_symbols = sorted(symbol_counts.items(), key=lambda x: x[1], reverse=True)[:15]
            return [symbol for symbol, count in popular_symbols]

        except Exception as e:
            logger.error(f"[ERROR] Error extracting popular symbols: {str(e)}")
            return []
    
    def _collect_and_analyze_symbol_news_sync(self, symbol: str, limit: int) -> Dict:
        """특정 종목의 뉴스를 수집하고 AI 분석 (동기 버전 - 스레드에서 실행)"""
        try:
            logger.info(f"[THREAD_{threading.current_thread().name}] Starting news crawl for {symbol}")

            # 새로운 이벤트 루프 생성 (각 스레드마다 독립적인 루프)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # 1. 뉴스 크롤링 (Reuters API만 사용, 상위 20개 기사)
                news_articles = loop.run_until_complete(
                    NewsService.crawl_and_save_stock_news(symbol, limit)
                )

                if not news_articles:
                    logger.warning(f"[THREAD_{threading.current_thread().name}] No articles collected for {symbol}")
                    return {"symbol": symbol, "collected_count": 0, "analyzed_count": 0}

                # 2. AI 분석 및 적합 점수 계산 (멀티스레드로 병렬 처리)
                analyzed_articles = self._analyze_articles_relevance_sync(news_articles, symbol)

                # 3. 분석 결과를 DB에 저장
                loop.run_until_complete(self._save_analyzed_articles(analyzed_articles))

                logger.info(f"[THREAD_{threading.current_thread().name}] {symbol}: {len(news_articles)} articles collected, {len(analyzed_articles)} analyzed")

                return {
                    "symbol": symbol,
                    "collected_count": len(news_articles),
                    "analyzed_count": len(analyzed_articles)
                }
            finally:
                loop.close()

        except Exception as e:
            logger.error(f"[THREAD] Error collecting/analyzing news for {symbol}: {str(e)}")
            raise e

    async def _collect_and_analyze_symbol_news(self, symbol: str, limit: int) -> Dict:
        """특정 종목의 뉴스를 수집하고 AI 분석 (async 버전, 레거시)"""
        try:
            logger.info(f"[ASYNC] Starting news crawl for {symbol}")

            # 1. 뉴스 크롤링 (Reuters API만)
            news_articles = await NewsService.crawl_and_save_stock_news(symbol, limit)

            if not news_articles:
                return {"symbol": symbol, "collected_count": 0, "analyzed_count": 0}

            # 2. AI 분석 및 적합 점수 계산 (비동기)
            analyzed_articles = await self._analyze_articles_relevance(news_articles, symbol)

            # 3. 분석 결과를 DB에 저장 (적합 점수 포함)
            await self._save_analyzed_articles(analyzed_articles)

            logger.info(f"[ASYNC] {symbol}: {len(news_articles)} articles collected, {len(analyzed_articles)} analyzed")

            return {
                "symbol": symbol,
                "collected_count": len(news_articles),
                "analyzed_count": len(analyzed_articles)
            }

        except Exception as e:
            logger.error(f"[ASYNC] Error collecting/analyzing news for {symbol}: {str(e)}")
            raise e
    
    def _analyze_articles_relevance_sync(self, articles: List[Dict], symbol: str) -> List[Dict]:
        """뉴스 기사들의 일반적 적합성 분석 (동기 버전 - 멀티스레드로 병렬 처리)"""
        try:
            analyzed_articles = []

            # AI 분석을 병렬로 수행하기 위한 함수
            def analyze_single_article(article):
                try:
                    # 1. 기본 점수 계산
                    base_score = self._calculate_base_relevance_score(article, symbol)

                    # 2. AI 분석 (선택적 - 실패해도 무시)
                    ai_score = 0.5  # 기본값
                    try:
                        # 새로운 이벤트 루프에서 AI 분석 실행
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            ai_analysis = loop.run_until_complete(
                                self.openai.analyze_news_relevance(
                                    article, [symbol], {"experience_level": "general"}
                                )
                            )
                            ai_score = ai_analysis.get('relevance_score', 0.5)
                        finally:
                            loop.close()
                    except:
                        pass  # AI 분석 실패 시 기본 점수 사용

                    # 3. 최종 적합성 점수 계산 (기본 60% + AI 40%)
                    final_relevance_score = (base_score * 0.6) + (ai_score * 0.4)

                    # 기사에 점수 추가
                    article['relevance_score'] = final_relevance_score
                    article['base_score'] = base_score
                    article['ai_score'] = ai_score
                    article['analyzed_at'] = datetime.now().isoformat()

                    return article

                except Exception as article_error:
                    logger.warning(f"[WARN] Article analysis failed: {str(article_error)}")
                    # 실패한 경우 기본 점수만 사용
                    article['relevance_score'] = 0.5
                    article['base_score'] = 0.5
                    article['ai_score'] = 0.5
                    return article

            # 병렬 처리: 여러 기사를 동시에 분석
            with ThreadPoolExecutor(max_workers=3) as executor:
                analyzed_articles = list(executor.map(analyze_single_article, articles))

            logger.info(f"[AI_ANALYSIS] Analyzed {len(analyzed_articles)} articles (parallel processing)")
            return analyzed_articles

        except Exception as e:
            logger.error(f"[ERROR] Error analyzing article relevance: {str(e)}")
            # 폴백: 모든 기사에 기본 점수 설정
            for article in articles:
                article['relevance_score'] = 0.5
                article['base_score'] = 0.5
                article['ai_score'] = 0.5
            return articles

    async def _analyze_articles_relevance(self, articles: List[Dict], symbol: str) -> List[Dict]:
        """뉴스 기사들의 일반적 적합성 분석 (Azure OpenAI 사용)"""
        try:
            analyzed_articles = []

            # 각 기사에 대해 기본 적합성 점수 계산
            for article in articles:
                try:
                    # 1. 기본 점수 계산
                    base_score = self._calculate_base_relevance_score(article, symbol)

                    # 2. AI 분석 (선택적 - 실패해도 무시)
                    ai_score = 0.5  # 기본값
                    try:
                        # 간단한 AI 관련성 분석 (사용자별이 아닌 일반적)
                        ai_analysis = await self.openai.analyze_news_relevance(
                            article, [symbol], {"experience_level": "general"}
                        )
                        ai_score = ai_analysis.get('relevance_score', 0.5)
                    except:
                        pass  # AI 분석 실패 시 기본 점수 사용

                    # 3. 최종 적합성 점수 계산 (기본 60% + AI 40%)
                    final_relevance_score = (base_score * 0.6) + (ai_score * 0.4)

                    # 기사에 점수 추가
                    article['relevance_score'] = final_relevance_score
                    article['base_score'] = base_score
                    article['ai_score'] = ai_score
                    article['analyzed_at'] = datetime.now().isoformat()

                    analyzed_articles.append(article)

                except Exception as article_error:
                    logger.warning(f"[WARN] Article analysis failed: {str(article_error)}")
                    # 실패한 경우 기본 점수만 사용
                    article['relevance_score'] = 0.5
                    article['base_score'] = 0.5
                    article['ai_score'] = 0.5
                    analyzed_articles.append(article)

            return analyzed_articles

        except Exception as e:
            logger.error(f"[ERROR] Error analyzing article relevance: {str(e)}")
            # 폴백: 모든 기사에 기본 점수 설정
            for article in articles:
                article['relevance_score'] = 0.5
                article['base_score'] = 0.5
                article['ai_score'] = 0.5
            return articles

    def _calculate_base_relevance_score(self, article: Dict, symbol: str) -> float:
        """기본 적합성 점수 계산"""
        try:
            score = 0.0
            title = article.get('title', '').lower()
            description = article.get('description', '').lower()
            
            # 1. 종목 심볼 직접 매치 (30%)
            if symbol.lower() in title:
                score += 0.25
            elif symbol.lower() in description:
                score += 0.15
            
            # 회사명 매치 확인
            company_names = {
                'AAPL': ['apple', 'iphone', 'ipad', 'mac'],
                'GOOGL': ['google', 'alphabet', 'youtube', 'android'],
                'MSFT': ['microsoft', 'windows', 'office', 'azure'],
                'NVDA': ['nvidia', 'gpu', 'graphics'],
                'TSLA': ['tesla', 'elon', 'electric vehicle', 'ev'],
                'AMZN': ['amazon', 'aws', 'prime'],
                'META': ['meta', 'facebook', 'instagram', 'whatsapp']
            }
            
            company_keywords = company_names.get(symbol.upper(), [])
            for keyword in company_keywords:
                if keyword in title:
                    score += 0.15
                    break
                elif keyword in description:
                    score += 0.1
                    break
            
            # 2. 뉴스 신선도 (25%)
            freshness = self._calculate_freshness_score(article.get('published_at', ''))
            score += freshness * 0.25
            
            # 3. 소스 신뢰도 (20%)
            source_credibility = self._calculate_source_score(article.get('source', ''))
            score += source_credibility * 0.2
            
            # 4. 금융/주식 관련 키워드 (25%)
            finance_keywords = ['stock', 'shares', 'market', 'trading', 'investor', 'earnings', 'revenue', 'profit']
            finance_score = 0.0
            for keyword in finance_keywords:
                if keyword in title or keyword in description:
                    finance_score += 0.1
                    if finance_score >= 0.25:
                        break
            score += min(0.25, finance_score)
            
            return min(1.0, max(0.0, score))
            
        except Exception as e:
            logger.warning(f"[WARN] Error calculating base score: {str(e)}")
            return 0.5

    def _calculate_freshness_score(self, published_at: str) -> float:
        """뉴스 신선도 점수"""
        try:
            if not published_at:
                return 0.3
            
            # 다양한 날짜 형식 처리
            if published_at.endswith('Z'):
                published_time = datetime.fromisoformat(published_at[:-1])
            elif '+' in published_at:
                published_time = datetime.fromisoformat(published_at)
            else:
                published_time = datetime.fromisoformat(published_at)
            
            hours_ago = (datetime.now() - published_time.replace(tzinfo=None)).total_seconds() / 3600
            
            # 신선도 점수 계산
            if hours_ago <= 6:
                return 1.0      # 6시간 이내: 최고점
            elif hours_ago <= 24:
                return 0.8      # 24시간 이내: 높은점수
            elif hours_ago <= 72:
                return 0.5      # 3일 이내: 보통
            else:
                return 0.2      # 3일 이후: 낮은점수
                
        except Exception as e:
            logger.warning(f"[WARN] Error calculating freshness score: {str(e)}")
            return 0.3

    def _calculate_source_score(self, source: str) -> float:
        """소스 신뢰도 점수"""
        if not source:
            return 0.5
        
        source_lower = source.lower()
        
        # 높은 신뢰도 소스
        high_credibility = ['reuters', 'bloomberg', 'wall street journal', 'financial times', 'cnbc', 'marketwatch', 'yahoo finance']
        if any(hc in source_lower for hc in high_credibility):
            return 1.0
        
        # 중간 신뢰도 소스
        medium_credibility = ['cnn business', 'bbc', 'forbes', 'business insider', 'investing.com', 'yahoo entertainment']
        if any(mc in source_lower for mc in medium_credibility):
            return 0.7
        
        return 0.5  # 기본값
    
    async def _save_analyzed_articles(self, analyzed_articles: List[Dict]):
        """분석된 기사들을 DB에 저장 (적합 점수 포함)"""
        try:
            supabase = get_supabase()
            
            for article in analyzed_articles:
                # 기존 기사 업데이트 (적합 점수 추가)
                update_data = {
                    "relevance_score": article.get('relevance_score', 0.5),
                    "base_score": article.get('base_score', 0.5),
                    "ai_score": article.get('ai_score', 0.5),
                    "analyzed_at": article.get('analyzed_at'),
                    "updated_at": datetime.now().isoformat()
                }
                
                # URL로 찾아서 업데이트
                result = supabase.table("news_articles")\
                    .update(update_data)\
                    .eq("url", article["url"])\
                    .execute()
                
                if not result.data:
                    logger.warning(f"기사 업데이트 실패: {article.get('url')}")
            
        except Exception as e:
            logger.error(f"[ERROR] Error saving analyzed articles: {str(e)}")

    async def _record_crawl_history(
        self,
        symbol: str,
        articles_collected: int,
        crawl_type: str = "scheduled",
        status: str = "completed",
        error_message: str = None
    ):
        """크롤링 이력을 DB에 기록"""
        try:
            supabase = get_supabase()

            crawl_data = {
                "symbol": symbol,
                "crawl_type": crawl_type,
                "articles_collected": articles_collected,
                "crawl_completed_at": datetime.now().isoformat(),
                "status": status,
                "error_message": error_message
            }

            result = supabase.table("news_crawl_history").insert(crawl_data).execute()

            if result.data:
                logger.info(f"[HISTORY] Crawl history recorded: {symbol} ({articles_collected} articles)")

        except Exception as e:
            logger.error(f"[ERROR] Error recording crawl history: {str(e)}")

    async def cleanup_old_news(self, days_old: int = 7):
        """오래된 뉴스 정리"""
        try:
            supabase = get_supabase()
            cutoff_date = (datetime.now() - timedelta(days=days_old)).isoformat()

            result = supabase.table("news_articles")\
                .delete()\
                .lt("published_at", cutoff_date)\
                .execute()

            deleted_count = len(result.data) if result.data else 0
            logger.info(f"[CLEANUP] Old news cleanup completed: {deleted_count} articles deleted")

            return {"deleted_count": deleted_count}

        except Exception as e:
            logger.error(f"[ERROR] Error cleaning up old news: {str(e)}")
            return {"deleted_count": 0}

    def shutdown(self):
        """스레드 풀 정리"""
        logger.info("[SHUTDOWN] Shutting down background news collector")
        self.collection_executor.shutdown(wait=True)
        self.analysis_executor.shutdown(wait=True)
        logger.info("[SHUTDOWN] Thread pool cleanup completed")