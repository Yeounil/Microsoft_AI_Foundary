import asyncio
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

from app.services.openai_service import OpenAIService
from app.services.supabase_user_interest_service import SupabaseUserInterestService
from app.services.news_service import NewsService
from app.services.news_db_service import NewsDBService

logger = logging.getLogger(__name__)

class AINewsRecommendationService:
    """AI 기반 자동 뉴스 추천 서비스 (GPT-5)"""

    def __init__(self):
        self.openai = OpenAIService()  # GPT-5 사용
        self.interest_service = SupabaseUserInterestService()
        
    async def get_ai_personalized_recommendations(
        self, 
        user_id: str, 
        limit: int = 10,
        force_refresh: bool = False
    ) -> Dict:
        """AI 기반 개인화 뉴스 추천"""
        try:
            logger.info(f"사용자 {user_id}에 대한 AI 뉴스 추천 시작")
            
            # 1. 사용자 관심사 조회
            user_interests = await self.interest_service.get_user_interests_for_recommendation(user_id)
            if not user_interests:
                return {
                    "user_id": user_id,
                    "message": "관심사를 먼저 추가해주세요.",
                    "recommendations": [],
                    "ai_summary": None
                }
            
            # 2. 관심사별 최신 뉴스 자동 수집 및 AI 분석
            ai_analyzed_news = await self._collect_and_analyze_news(user_interests, limit * 3)
            
            # 3. AI 기반 개인화 점수 계산
            personalized_news = await self._calculate_ai_personalization_scores(
                user_id, ai_analyzed_news, user_interests
            )
            
            # 4. 상위 뉴스 선택 및 정렬
            top_recommendations = sorted(
                personalized_news, 
                key=lambda x: x.get('ai_score', 0), 
                reverse=True
            )[:limit]
            
            # 5. AI 기반 개인화 요약 생성
            ai_summary = await self.openai.generate_personalized_summary(
                top_recommendations, user_interests
            )
            
            # 6. 결과 반환
            result = {
                "user_id": user_id,
                "user_interests": user_interests,
                "total_recommendations": len(top_recommendations),
                "recommendations": top_recommendations,
                "ai_summary": ai_summary,
                "generated_at": datetime.now().isoformat(),
                "recommendation_type": "ai_powered"
            }
            
            logger.info(f"사용자 {user_id}에게 {len(top_recommendations)}개 AI 추천 뉴스 생성 완료")
            return result
            
        except Exception as e:
            logger.error(f"AI 뉴스 추천 생성 오류 ({user_id}): {str(e)}")
            return {
                "user_id": user_id,
                "error": "AI 추천 생성 중 오류가 발생했습니다.",
                "recommendations": [],
                "ai_summary": None
            }
    
    async def _collect_and_analyze_news(
        self, 
        user_interests: List[str], 
        total_limit: int
    ) -> List[Dict]:
        """관심사별 뉴스 수집 및 AI 분석"""
        try:
            all_news = []
            per_interest_limit = max(5, total_limit // len(user_interests))
            
            logger.info(f"관심사 {len(user_interests)}개에 대해 각각 {per_interest_limit}개씩 뉴스 수집 시작")
            
            # 관심사별 병렬 뉴스 수집
            tasks = []
            for interest in user_interests:
                task = self._collect_news_for_interest(interest, per_interest_limit)
                tasks.append(task)
            
            # 병렬 실행
            news_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 결과 통합
            for i, result in enumerate(news_results):
                if isinstance(result, Exception):
                    logger.error(f"관심사 '{user_interests[i]}' 뉴스 수집 실패: {str(result)}")
                    continue
                
                if result:
                    all_news.extend(result)
            
            # 중복 제거 (URL 기준)
            unique_news = []
            seen_urls = set()
            for article in all_news:
                url = article.get('url', '')
                if url and url not in seen_urls:
                    unique_news.append(article)
                    seen_urls.add(url)
            
            logger.info(f"총 {len(unique_news)}개의 고유한 뉴스 수집 완료")
            return unique_news[:total_limit]
            
        except Exception as e:
            logger.error(f"뉴스 수집 및 분석 오류: {str(e)}")
            return []
    
    async def _collect_news_for_interest(self, interest: str, limit: int) -> List[Dict]:
        """특정 관심사에 대한 뉴스 수집"""
        try:
            # 1. 기존 뉴스 확인 (최근 뉴스)
            recent_news = await NewsDBService.get_latest_news_by_symbol(
                interest, limit=limit
            )
            
            if len(recent_news) >= limit:
                logger.info(f"{interest}: 기존 뉴스 {len(recent_news)}개 사용")
                return recent_news[:limit]
            
            # 2. 새 뉴스 크롤링
            logger.info(f"{interest}: 새 뉴스 크롤링 시작")
            crawled_news = await NewsService.crawl_and_save_stock_news(interest, limit)
            
            # 3. 최신 뉴스 다시 조회
            updated_news = await NewsDBService.get_latest_news_by_symbol(
                interest, limit=limit
            )
            
            return updated_news[:limit]
            
        except Exception as e:
            logger.error(f"관심사 '{interest}' 뉴스 수집 오류: {str(e)}")
            return []
    
    async def _calculate_ai_personalization_scores(
        self, 
        user_id: str, 
        news_articles: List[Dict], 
        user_interests: List[str]
    ) -> List[Dict]:
        """AI 기반 개인화 점수 계산"""
        try:
            scored_articles = []
            
            # 사용자 컨텍스트 생성 (향후 확장 가능)
            user_context = {
                "experience_level": "intermediate",  # 추후 프로필에서 가져올 수 있음
                "risk_tolerance": "moderate",
                "primary_interests": user_interests[:3]  # 상위 3개 관심사
            }
            
            # 각 뉴스에 대해 AI 분석 수행
            for article in news_articles:
                try:
                    # AI 관련성 분석
                    ai_analysis = await self.openai.analyze_news_relevance(
                        article, user_interests, user_context
                    )
                    
                    # 기본 점수 계산
                    base_score = self._calculate_base_score(article, user_interests)
                    
                    # AI 점수와 기본 점수 결합
                    ai_relevance_score = ai_analysis.get('relevance_score', 0.5)
                    combined_score = (ai_relevance_score * 0.7) + (base_score * 0.3)
                    
                    # 뉴스에 AI 분석 결과 추가
                    article.update({
                        'ai_score': combined_score,
                        'ai_analysis': ai_analysis,
                        'base_score': base_score,
                        'recommendation_reason': ai_analysis.get('recommendation', ''),
                        'key_topics': ai_analysis.get('key_topics', []),
                        'impact_level': ai_analysis.get('impact_level', 'medium')
                    })
                    
                    scored_articles.append(article)
                    
                except Exception as article_error:
                    logger.warning(f"개별 뉴스 분석 실패: {str(article_error)}")
                    # 실패한 경우 기본 점수만 사용
                    article['ai_score'] = self._calculate_base_score(article, user_interests)
                    article['recommendation_reason'] = "기본 관련성 분석"
                    scored_articles.append(article)
            
            return scored_articles
            
        except Exception as e:
            logger.error(f"AI 개인화 점수 계산 오류: {str(e)}")
            # 폴백: 기본 점수만 사용
            for article in news_articles:
                article['ai_score'] = self._calculate_base_score(article, user_interests)
                article['recommendation_reason'] = "기본 점수 계산"
            return news_articles
    
    def _calculate_base_score(self, article: Dict, user_interests: List[str]) -> float:
        """기본 점수 계산 (AI 분석 실패 시 폴백)"""
        try:
            score = 0.0
            title = article.get('title', '').lower()
            description = article.get('description', '').lower()
            symbol = article.get('symbol', '')
            
            # 1. 직접 관심사 매치 (40%)
            direct_match = 0.0
            for interest in user_interests:
                if interest.lower() in title:
                    direct_match += 0.3
                elif interest.lower() in description:
                    direct_match += 0.2
                elif interest == symbol:
                    direct_match += 0.4
            score += min(0.4, direct_match)
            
            # 2. 뉴스 신선도 (30%)
            freshness = self._calculate_news_freshness(article.get('published_at', ''))
            score += freshness * 0.3
            
            # 3. 소스 신뢰도 (20%)
            source_credibility = self._calculate_source_credibility(article.get('source', ''))
            score += source_credibility * 0.2
            
            # 4. 키워드 밀도 (10%)
            keyword_density = self._calculate_keyword_density(title + ' ' + description, user_interests)
            score += keyword_density * 0.1
            
            return min(1.0, max(0.0, score))
            
        except Exception as e:
            logger.warning(f"기본 점수 계산 오류: {str(e)}")
            return 0.5
    
    def _calculate_news_freshness(self, published_at: str) -> float:
        """뉴스 신선도 점수 계산"""
        try:
            if not published_at:
                return 0.5
            
            # ISO 형식 파싱
            if published_at.endswith('Z'):
                published_time = datetime.fromisoformat(published_at[:-1])
            else:
                published_time = datetime.fromisoformat(published_at)
            
            hours_ago = (datetime.now() - published_time).total_seconds() / 3600
            
            # 6시간 이내: 1.0, 24시간 이내: 0.8, 72시간 이내: 0.5, 그 이후: 0.2
            if hours_ago <= 6:
                return 1.0
            elif hours_ago <= 24:
                return 0.8
            elif hours_ago <= 72:
                return 0.5
            else:
                return 0.2
                
        except Exception:
            return 0.5
    
    def _calculate_source_credibility(self, source: str) -> float:
        """소스 신뢰도 점수 계산"""
        high_credibility_sources = [
            'reuters', 'bloomberg', 'wall street journal', 'financial times',
            'cnbc', 'marketwatch', 'yahoo finance', 'investing.com'
        ]
        
        medium_credibility_sources = [
            'cnn business', 'bbc', 'forbes', 'business insider',
            'thestreet', 'motley fool', '네이버뉴스', '연합뉴스'
        ]
        
        source_lower = source.lower()
        
        if any(hc_source in source_lower for hc_source in high_credibility_sources):
            return 1.0
        elif any(mc_source in source_lower for mc_source in medium_credibility_sources):
            return 0.7
        else:
            return 0.5
    
    def _calculate_keyword_density(self, text: str, user_interests: List[str]) -> float:
        """키워드 밀도 계산"""
        if not text or not user_interests:
            return 0.0
        
        text_lower = text.lower()
        word_count = len(text_lower.split())
        
        if word_count == 0:
            return 0.0
        
        keyword_matches = 0
        for interest in user_interests:
            keyword_matches += text_lower.count(interest.lower())
        
        density = keyword_matches / word_count
        return min(1.0, density * 10)  # 10% 밀도를 1.0으로 정규화
    
    async def get_ai_market_sentiment_analysis(
        self, 
        symbols: List[str], 
        days_back: int = 3
    ) -> Dict:
        """AI 기반 시장 감정 분석"""
        try:
            sentiment_results = {}
            
            for symbol in symbols:
                # 해당 종목 뉴스 수집
                news = await NewsDBService.get_news_for_analysis(
                    symbol, days=days_back, limit=20
                )
                
                if news:
                    # AI 감정 분석
                    sentiment_analysis = await self.openai.analyze_market_sentiment(
                        news, symbol
                    )
                    sentiment_results[symbol] = sentiment_analysis
                else:
                    sentiment_results[symbol] = {
                        "sentiment": "neutral",
                        "score": 0.0,
                        "reasoning": "분석할 뉴스가 없습니다."
                    }
            
            return {
                "sentiment_analysis": sentiment_results,
                "analysis_period": f"최근 {days_back}일",
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"AI 시장 감정 분석 오류: {str(e)}")
            return {"error": "감정 분석 중 오류가 발생했습니다."}
    
    async def generate_ai_news_insights(
        self, 
        user_id: str, 
        symbol: str
    ) -> Dict:
        """특정 종목에 대한 AI 인사이트 생성"""
        try:
            # 1. 최근 뉴스 수집
            recent_news = await NewsDBService.get_news_for_analysis(
                symbol, days=7, limit=10
            )
            
            if not recent_news:
                return {
                    "symbol": symbol,
                    "message": "분석할 뉴스가 없습니다.",
                    "insights": []
                }
            
            # 2. 감정 분석
            sentiment = await self.openai.analyze_market_sentiment(recent_news, symbol)
            
            # 3. 개인화 요약
            user_interests = await self.interest_service.get_user_interests_for_recommendation(user_id)
            summary = await self.openai.generate_personalized_summary(recent_news, user_interests)
            
            return {
                "symbol": symbol,
                "sentiment_analysis": sentiment,
                "personalized_summary": summary,
                "news_count": len(recent_news),
                "analysis_period": "최근 7일",
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"AI 인사이트 생성 오류 ({symbol}): {str(e)}")
            return {
                "symbol": symbol,
                "error": "AI 인사이트 생성 중 오류가 발생했습니다."
            }