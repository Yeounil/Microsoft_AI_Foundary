import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from app.services.azure_openai_service import AzureOpenAIService
from app.services.supabase_user_interest_service import SupabaseUserInterestService
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class FastRecommendationService:
    """빠른 뉴스 추천 서비스 (DB의 사전 분석된 뉴스 사용)"""
    
    def __init__(self):
        self.azure_openai = AzureOpenAIService()
        self.interest_service = SupabaseUserInterestService()
    
    async def get_personalized_recommendations(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> Dict:
        """개인화된 뉴스 추천 (빠른 응답)"""
        try:
            logger.info(f"사용자 {user_id}에 대한 빠른 추천 생성 시작")
            
            # 1. 사용자 관심사 조회
            user_interests = await self.interest_service.get_user_interests_for_recommendation(user_id)
            
            if not user_interests:
                return {
                    "user_id": user_id,
                    "message": "관심사를 먼저 추가해주세요.",
                    "recommendations": [],
                    "ai_summary": None,
                    "recommendation_type": "fast"
                }
            
            # 2. DB에서 관심사 관련 뉴스 조회 (적합 점수 순)
            relevant_news = await self._get_relevant_news_from_db(user_interests, limit * 2)
            
            if not relevant_news:
                return {
                    "user_id": user_id,
                    "message": "관련 뉴스가 없습니다. 잠시 후 다시 시도해주세요.",
                    "recommendations": [],
                    "ai_summary": None,
                    "recommendation_type": "fast"
                }
            
            # 3. 사용자별 개인화 점수 계산 (빠른 계산)
            personalized_news = await self._calculate_personalization_scores(
                user_id, relevant_news, user_interests
            )
            
            # 4. 상위 추천 뉴스 선택
            top_recommendations = personalized_news[:limit]
            
            # 5. AI 요약 생성 (비동기로 처리하되 빠른 응답 우선)
            ai_summary = None
            try:
                if len(top_recommendations) >= 3:  # 충분한 뉴스가 있을 때만
                    ai_summary = await self.azure_openai.generate_personalized_summary(
                        top_recommendations[:5], user_interests
                    )
            except Exception as summary_error:
                logger.warning(f"AI 요약 생성 실패: {str(summary_error)}")
                ai_summary = {
                    "summary": "관심사 관련 최신 뉴스를 확인해보세요.",
                    "highlights": ["빠른 추천 모드로 제공됩니다."],
                    "market_outlook": "중립적",
                    "actionable_insights": ["상세 분석은 추후 제공됩니다."]
                }
            
            result = {
                "user_id": user_id,
                "user_interests": user_interests,
                "total_recommendations": len(top_recommendations),
                "recommendations": top_recommendations,
                "ai_summary": ai_summary,
                "generated_at": datetime.now().isoformat(),
                "recommendation_type": "fast"
            }
            
            logger.info(f"사용자 {user_id}에게 {len(top_recommendations)}개 빠른 추천 완료")
            return result
            
        except Exception as e:
            logger.error(f"빠른 추천 생성 오류 ({user_id}): {str(e)}")
            return {
                "user_id": user_id,
                "error": "추천 생성 중 오류가 발생했습니다.",
                "recommendations": [],
                "ai_summary": None,
                "recommendation_type": "fast"
            }
    
    async def _get_relevant_news_from_db(
        self, 
        user_interests: List[str], 
        limit: int
    ) -> List[Dict]:
        """DB에서 사용자 관심사 관련 뉴스 조회 (적합 점수 순)"""
        try:
            supabase = get_supabase()
            
            # 최근 3일간의 뉴스만 대상
            cutoff_date = (datetime.now() - timedelta(days=3)).isoformat()
            
            all_news = []
            
            # 각 관심사별로 뉴스 조회
            for interest in user_interests:
                try:
                    # 해당 종목의 뉴스를 적합 점수(relevance_score) 순으로 조회
                    result = supabase.table("news_articles")\
                        .select("*")\
                        .eq("symbol", interest)\
                        .gte("published_at", cutoff_date)\
                        .order("relevance_score", desc=True)\
                        .order("published_at", desc=True)\
                        .limit(15)\
                        .execute()
                    
                    if result.data:
                        for article in result.data:
                            article['matched_interest'] = interest
                        all_news.extend(result.data)
                        
                except Exception as interest_error:
                    logger.warning(f"관심사 '{interest}' 뉴스 조회 실패: {str(interest_error)}")
                    continue
            
            # 중복 제거 (URL 기준)
            unique_news = []
            seen_urls = set()
            
            for article in all_news:
                url = article.get('url', '')
                if url and url not in seen_urls:
                    unique_news.append(article)
                    seen_urls.add(url)
            
            # 적합 점수 순으로 정렬
            unique_news.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
            
            logger.info(f"DB에서 {len(unique_news)}개 관련 뉴스 조회 완료")
            return unique_news[:limit]
            
        except Exception as e:
            logger.error(f"DB 뉴스 조회 오류: {str(e)}")
            return []
    
    async def _calculate_personalization_scores(
        self, 
        user_id: str, 
        news_articles: List[Dict], 
        user_interests: List[str]
    ) -> List[Dict]:
        """사용자별 개인화 점수 계산 (다양성 알고리즘 적용)"""
        try:
            scored_articles = []
            
            # 사용자의 관심사 우선순위 (첫 번째가 가장 중요)
            interest_priorities = {interest: 1.0 - (i * 0.1) for i, interest in enumerate(user_interests[:5])}
            
            for article in news_articles:
                try:
                    # 1. 기존 적합 점수 가져오기
                    base_relevance = article.get('relevance_score', 0.5)
                    
                    # 2. 사용자별 관심사 우선순위 적용
                    matched_interest = article.get('matched_interest', '')
                    interest_priority = interest_priorities.get(matched_interest, 0.5)
                    
                    # 3. 뉴스 신선도 추가 고려
                    freshness_bonus = self._calculate_freshness_bonus(article.get('published_at', ''))
                    
                    # 4. 초기 개인화 점수 계산
                    personalization_score = (
                        base_relevance * 0.55 +      # 기존 적합 점수 55% (다양성 위해 감소)
                        interest_priority * 0.25 +   # 관심사 우선순위 25%
                        freshness_bonus * 0.1        # 신선도 보너스 10%
                    )
                    
                    # 기사에 점수 정보 추가
                    article['base_personalization_score'] = personalization_score
                    article['interest_priority'] = interest_priority
                    article['freshness_bonus'] = freshness_bonus
                    
                    scored_articles.append(article)
                    
                except Exception as article_error:
                    logger.warning(f"개별 기사 점수 계산 실패: {str(article_error)}")
                    article['base_personalization_score'] = article.get('relevance_score', 0.5)
                    scored_articles.append(article)
            
            # 5. 다양성 알고리즘 적용
            diversified_articles = self._apply_diversity_algorithm(scored_articles, user_interests)
            
            return diversified_articles
            
        except Exception as e:
            logger.error(f"개인화 점수 계산 오류: {str(e)}")
            return news_articles  # 실패 시 원본 반환
    
    def _calculate_freshness_bonus(self, published_at: str) -> float:
        """신선도 보너스 점수"""
        try:
            if not published_at:
                return 0.0
            
            # 날짜 파싱
            if published_at.endswith('Z'):
                published_time = datetime.fromisoformat(published_at[:-1])
            elif '+' in published_at:
                published_time = datetime.fromisoformat(published_at)
            else:
                published_time = datetime.fromisoformat(published_at)
            
            hours_ago = (datetime.now() - published_time.replace(tzinfo=None)).total_seconds() / 3600
            
            # 신선도 보너스 계산
            if hours_ago <= 2:
                return 1.0      # 2시간 이내: 최대 보너스
            elif hours_ago <= 8:
                return 0.7      # 8시간 이내: 높은 보너스
            elif hours_ago <= 24:
                return 0.4      # 24시간 이내: 보통 보너스
            else:
                return 0.1      # 그 이후: 최소 보너스
                
        except Exception:
            return 0.0
    
    def _apply_diversity_algorithm(
        self, 
        scored_articles: List[Dict], 
        user_interests: List[str]
    ) -> List[Dict]:
        """다양성 알고리즘 적용하여 균형잡힌 추천"""
        try:
            # 1. 관심사별로 뉴스 그룹핑
            interest_groups = {}
            for article in scored_articles:
                interest = article.get('matched_interest', 'unknown')
                if interest not in interest_groups:
                    interest_groups[interest] = []
                interest_groups[interest].append(article)
            
            # 2. 각 그룹 내에서 정렬 (점수 순)
            for interest in interest_groups:
                interest_groups[interest].sort(
                    key=lambda x: x.get('base_personalization_score', 0), 
                    reverse=True
                )
            
            # 3. 다양성 보너스 적용 및 균형 선택
            diversified_articles = []
            used_sources = set()
            used_time_slots = set()
            
            # 관심사별 최대 개수 계산
            max_per_interest = max(2, len(scored_articles) // len(user_interests))
            
            # 라운드 로빈 방식으로 각 관심사에서 순차 선택
            max_rounds = max_per_interest
            
            for round_num in range(max_rounds):
                for interest in user_interests:
                    if interest in interest_groups and len(interest_groups[interest]) > round_num:
                        article = interest_groups[interest][round_num]
                        
                        # 다양성 보너스 계산
                        diversity_bonus = self._calculate_diversity_bonus(
                            article, used_sources, used_time_slots
                        )
                        
                        # 최종 개인화 점수 계산
                        final_score = (
                            article.get('base_personalization_score', 0.5) * 0.85 +  # 기본 점수 85%
                            diversity_bonus * 0.15  # 다양성 보너스 15%
                        )
                        
                        article['personalization_score'] = final_score
                        article['diversity_bonus'] = diversity_bonus
                        
                        diversified_articles.append(article)
                        
                        # 사용된 소스와 시간대 기록
                        used_sources.add(article.get('source', ''))
                        time_slot = self._get_time_slot(article.get('published_at', ''))
                        used_time_slots.add(time_slot)
            
            # 4. 최종 점수로 다시 정렬
            diversified_articles.sort(
                key=lambda x: x.get('personalization_score', 0), 
                reverse=True
            )
            
            logger.info(f"다양성 알고리즘 적용: {len(diversified_articles)}개 뉴스, {len(interest_groups)}개 관심사")
            
            return diversified_articles
            
        except Exception as e:
            logger.error(f"다양성 알고리즘 오류: {str(e)}")
            # 폴백: 기본 점수로 정렬
            for article in scored_articles:
                article['personalization_score'] = article.get('base_personalization_score', 0.5)
            scored_articles.sort(key=lambda x: x['personalization_score'], reverse=True)
            return scored_articles
    
    def _calculate_diversity_bonus(
        self, 
        article: Dict, 
        used_sources: set, 
        used_time_slots: set
    ) -> float:
        """다양성 보너스 점수 계산"""
        bonus = 0.0
        
        # 1. 소스 다양성 보너스 (최대 0.3)
        source = article.get('source', '')
        if source and source not in used_sources:
            bonus += 0.3
        elif source in used_sources:
            bonus += 0.1  # 이미 사용된 소스는 낮은 보너스
        
        # 2. 시간대 다양성 보너스 (최대 0.2)
        time_slot = self._get_time_slot(article.get('published_at', ''))
        if time_slot not in used_time_slots:
            bonus += 0.2
        else:
            bonus += 0.05
        
        # 3. 카테고리 다양성 보너스 (최대 0.25)
        category_bonus = self._get_category_diversity_bonus(article)
        bonus += category_bonus
        
        # 4. 언어 다양성 보너스 (최대 0.15)
        language = article.get('language', 'en')
        if language == 'ko':  # 한국어 뉴스에 약간의 보너스
            bonus += 0.1
        else:
            bonus += 0.05
        
        # 5. 작성자 다양성 보너스 (최대 0.1)
        author = article.get('author', '')
        if author and len(author) > 0:
            bonus += 0.1
        
        return min(1.0, bonus)  # 최대 1.0으로 제한
    
    def _get_time_slot(self, published_at: str) -> str:
        """뉴스 발행 시간을 시간대 슬롯으로 변환"""
        try:
            if not published_at:
                return "unknown"
            
            # 날짜 파싱
            if published_at.endswith('Z'):
                published_time = datetime.fromisoformat(published_at[:-1])
            elif '+' in published_at:
                published_time = datetime.fromisoformat(published_at)
            else:
                published_time = datetime.fromisoformat(published_at)
            
            hour = published_time.hour
            
            # 시간대별 슬롯 분류
            if 0 <= hour < 6:
                return "dawn"      # 새벽 (0-6시)
            elif 6 <= hour < 12:
                return "morning"   # 오전 (6-12시)
            elif 12 <= hour < 18:
                return "afternoon" # 오후 (12-18시)
            else:
                return "evening"   # 저녁 (18-24시)
                
        except Exception:
            return "unknown"
    
    def _get_category_diversity_bonus(self, article: Dict) -> float:
        """카테고리 다양성 보너스"""
        title = article.get('title', '').lower()
        description = article.get('description', '').lower()
        text = f"{title} {description}"
        
        # 카테고리 키워드 매칭
        categories = {
            'earnings': ['earnings', '실적', 'revenue', 'profit', 'quarterly'],
            'analysis': ['analyst', 'rating', 'upgrade', 'downgrade', '분석', '전망'],
            'market': ['market', 'trading', 'index', '시장', '거래'],
            'technology': ['technology', 'innovation', 'ai', '기술', '혁신'],
            'merger': ['merger', 'acquisition', '인수', '합병', 'deal'],
            'regulation': ['regulation', 'policy', '규제', '정책', 'government'],
            'partnership': ['partnership', 'collaboration', '파트너십', '협력'],
            'competition': ['competitor', 'rival', '경쟁', 'vs', 'against']
        }
        
        matched_categories = []
        for category, keywords in categories.items():
            if any(keyword in text for keyword in keywords):
                matched_categories.append(category)
        
        # 카테고리 다양성에 따른 보너스
        if len(matched_categories) >= 2:
            return 0.25  # 복합 카테고리
        elif len(matched_categories) == 1:
            return 0.15  # 단일 카테고리
        else:
            return 0.05  # 일반 뉴스
    
    async def get_trending_news(self, limit: int = 10) -> Dict:
        """트렌딩 뉴스 조회 (적합 점수 기반)"""
        try:
            supabase = get_supabase()
            
            # 최근 24시간 뉴스 중 적합 점수가 높은 뉴스
            cutoff_date = (datetime.now() - timedelta(hours=24)).isoformat()
            
            result = supabase.table("news_articles")\
                .select("*")\
                .gte("published_at", cutoff_date)\
                .order("relevance_score", desc=True)\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()
            
            trending_news = result.data if result.data else []
            
            return {
                "trending_news": trending_news,
                "total_count": len(trending_news),
                "period": "최근 24시간",
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"트렌딩 뉴스 조회 오류: {str(e)}")
            return {
                "trending_news": [],
                "total_count": 0,
                "error": "트렌딩 뉴스 조회 중 오류 발생"
            }
    
    async def get_stock_specific_recommendations(
        self, 
        user_id: str, 
        symbol: str, 
        limit: int = 10
    ) -> Dict:
        """특정 종목에 대한 AI 기반 추천 뉴스"""
        try:
            logger.info(f"사용자 {user_id}의 {symbol} 종목 뉴스 추천 시작")
            
            # 1. 해당 종목의 뉴스 조회 (최근 7일)
            symbol_news = await self._get_symbol_news_from_db(symbol, limit * 2)
            
            if not symbol_news:
                # 뉴스가 없으면 백그라운드 수집 트리거 (비동기)
                try:
                    from app.services.news_service import NewsService
                    await NewsService.crawl_and_save_stock_news(symbol, 10)
                    # 다시 조회
                    symbol_news = await self._get_symbol_news_from_db(symbol, limit * 2)
                except Exception as crawl_error:
                    logger.warning(f"종목 {symbol} 뉴스 크롤링 실패: {str(crawl_error)}")
            
            if not symbol_news:
                return {
                    "user_id": user_id,
                    "symbol": symbol,
                    "message": f"{symbol} 관련 뉴스가 없습니다.",
                    "recommendations": [],
                    "ai_summary": None,
                    "recommendation_type": "stock_specific"
                }
            
            # 2. 사용자 관심사 조회 (개인화를 위해)
            user_interests = await self.interest_service.get_user_interests_for_recommendation(user_id)
            
            # 3. 종목별 개인화 점수 계산
            personalized_news = await self._calculate_stock_personalization_scores(
                user_id, symbol_news, symbol, user_interests
            )
            
            # 4. 상위 추천 선택
            top_recommendations = personalized_news[:limit]
            
            # 5. AI 요약 생성 (해당 종목 특화)
            ai_summary = None
            try:
                if len(top_recommendations) >= 3:
                    ai_summary = await self.azure_openai.generate_stock_specific_summary(
                        top_recommendations[:5], symbol
                    )
            except Exception as summary_error:
                logger.warning(f"{symbol} AI 요약 생성 실패: {str(summary_error)}")
                ai_summary = {
                    "summary": f"{symbol} 관련 최신 뉴스를 확인해보세요.",
                    "highlights": [f"{symbol} 종목 관련 주요 이슈들"],
                    "market_outlook": "중립적",
                    "actionable_insights": ["상세 분석은 추후 제공됩니다."]
                }
            
            result = {
                "user_id": user_id,
                "symbol": symbol,
                "user_interests": user_interests,
                "total_recommendations": len(top_recommendations),
                "recommendations": top_recommendations,
                "ai_summary": ai_summary,
                "generated_at": datetime.now().isoformat(),
                "recommendation_type": "stock_specific"
            }
            
            logger.info(f"사용자 {user_id}의 {symbol} 종목 추천 {len(top_recommendations)}개 완료")
            return result
            
        except Exception as e:
            logger.error(f"종목별 추천 생성 오류 ({symbol}): {str(e)}")
            return {
                "user_id": user_id,
                "symbol": symbol,
                "error": f"{symbol} 추천 생성 중 오류가 발생했습니다.",
                "recommendations": [],
                "ai_summary": None,
                "recommendation_type": "stock_specific"
            }
    
    async def _get_symbol_news_from_db(
        self, 
        symbol: str, 
        limit: int
    ) -> List[Dict]:
        """DB에서 특정 종목 뉴스 조회 (적합 점수 순)"""
        try:
            supabase = get_supabase()
            
            # 최근 7일간의 뉴스만 대상 (종목별 뉴스는 조금 더 긴 기간)
            cutoff_date = (datetime.now() - timedelta(days=7)).isoformat()
            
            # 해당 종목의 뉴스를 적합 점수 순으로 조회
            result = supabase.table("news_articles")\
                .select("*")\
                .eq("symbol", symbol)\
                .gte("published_at", cutoff_date)\
                .order("relevance_score", desc=True)\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()
            
            symbol_news = result.data if result.data else []
            
            # 각 뉴스에 매칭된 관심사 설정
            for article in symbol_news:
                article['matched_interest'] = symbol
            
            logger.info(f"DB에서 {symbol} 관련 뉴스 {len(symbol_news)}개 조회 완료")
            return symbol_news
            
        except Exception as e:
            logger.error(f"종목 {symbol} 뉴스 조회 오류: {str(e)}")
            return []
    
    async def _calculate_stock_personalization_scores(
        self, 
        user_id: str, 
        news_articles: List[Dict], 
        target_symbol: str,
        user_interests: List[str]
    ) -> List[Dict]:
        """종목별 개인화 점수 계산"""
        try:
            scored_articles = []
            
            # 타겟 종목이 사용자 관심사에 있는지 확인
            is_user_interest = target_symbol in user_interests
            user_interest_priority = 1.0 if is_user_interest else 0.7  # 관심사가 아니면 약간 낮춤
            
            for article in news_articles:
                try:
                    # 1. 기존 적합 점수 가져오기
                    base_relevance = article.get('relevance_score', 0.5)
                    
                    # 2. 종목 특화 점수 계산
                    symbol_specific_score = self._calculate_symbol_specific_score(article, target_symbol)
                    
                    # 3. 뉴스 신선도 추가 고려
                    freshness_bonus = self._calculate_freshness_bonus(article.get('published_at', ''))
                    
                    # 4. 개인화 점수 계산 (종목별로 조정)
                    personalization_score = (
                        base_relevance * 0.4 +              # 기본 적합 점수 40%
                        symbol_specific_score * 0.3 +       # 종목 특화 점수 30%
                        user_interest_priority * 0.2 +      # 사용자 관심도 20%
                        freshness_bonus * 0.1               # 신선도 보너스 10%
                    )
                    
                    # 기사에 점수 정보 추가
                    article['base_personalization_score'] = personalization_score
                    article['symbol_specific_score'] = symbol_specific_score
                    article['user_interest_priority'] = user_interest_priority
                    article['freshness_bonus'] = freshness_bonus
                    
                    scored_articles.append(article)
                    
                except Exception as article_error:
                    logger.warning(f"개별 기사 점수 계산 실패: {str(article_error)}")
                    article['base_personalization_score'] = article.get('relevance_score', 0.5)
                    scored_articles.append(article)
            
            # 5. 종목별 다양성 알고리즘 적용 (기존과 유사하지만 단일 종목 특화)
            diversified_articles = self._apply_symbol_diversity_algorithm(scored_articles, target_symbol)
            
            return diversified_articles
            
        except Exception as e:
            logger.error(f"종목별 개인화 점수 계산 오류: {str(e)}")
            return news_articles
    
    def _calculate_symbol_specific_score(self, article: Dict, target_symbol: str) -> float:
        """종목 특화 점수 계산"""
        try:
            score = 0.0
            title = article.get('title', '').lower()
            description = article.get('description', '').lower()
            
            # 1. 심볼 직접 매치 (최고점)
            if target_symbol.lower() in title:
                score += 0.4
            elif target_symbol.lower() in description:
                score += 0.3
            
            # 2. 회사명 매치 확인
            company_names = {
                'AAPL': ['apple', 'iphone', 'ipad', 'mac', 'tim cook'],
                'GOOGL': ['google', 'alphabet', 'youtube', 'android', 'sundar pichai'],
                'MSFT': ['microsoft', 'windows', 'office', 'azure', 'satya nadella'],
                'NVDA': ['nvidia', 'gpu', 'graphics', 'jensen huang', 'ai chip'],
                'TSLA': ['tesla', 'elon musk', 'electric vehicle', 'ev', 'model'],
                'AMZN': ['amazon', 'aws', 'prime', 'jeff bezos', 'andy jassy'],
                'META': ['meta', 'facebook', 'instagram', 'whatsapp', 'mark zuckerberg'],
                'NFLX': ['netflix', 'streaming', 'series', 'movies'],
                'CRM': ['salesforce', 'crm', 'marc benioff']
            }
            
            company_keywords = company_names.get(target_symbol.upper(), [])
            for keyword in company_keywords:
                if keyword in title:
                    score += 0.25
                    break
                elif keyword in description:
                    score += 0.15
                    break
            
            # 3. 재무/실적 키워드 보너스 (종목별 뉴스에서 중요)
            financial_keywords = ['earnings', 'revenue', 'profit', 'sales', 'guidance', 'outlook', '실적']
            for keyword in financial_keywords:
                if keyword in title or keyword in description:
                    score += 0.15
                    break
            
            # 4. 뉴스 카테고리 보너스
            if any(word in title + description for word in ['stock', 'shares', 'trading', 'analyst']):
                score += 0.1
            
            return min(1.0, max(0.0, score))
            
        except Exception as e:
            logger.warning(f"종목 특화 점수 계산 오류: {str(e)}")
            return 0.5
    
    def _apply_symbol_diversity_algorithm(
        self, 
        scored_articles: List[Dict], 
        target_symbol: str
    ) -> List[Dict]:
        """종목별 다양성 알고리즘 (단일 종목 내 다양성)"""
        try:
            # 종목별이므로 소스/시간대/카테고리 다양성에 집중
            diversified_articles = []
            used_sources = set()
            used_time_slots = set()
            used_categories = set()
            
            # 점수 순으로 정렬
            scored_articles.sort(
                key=lambda x: x.get('base_personalization_score', 0), 
                reverse=True
            )
            
            for article in scored_articles:
                # 다양성 보너스 계산
                diversity_bonus = self._calculate_symbol_diversity_bonus(
                    article, used_sources, used_time_slots, used_categories
                )
                
                # 최종 점수 계산
                final_score = (
                    article.get('base_personalization_score', 0.5) * 0.8 +  # 기본 점수 80%
                    diversity_bonus * 0.2  # 다양성 보너스 20%
                )
                
                article['personalization_score'] = final_score
                article['diversity_bonus'] = diversity_bonus
                
                diversified_articles.append(article)
                
                # 사용된 요소들 기록
                used_sources.add(article.get('source', ''))
                time_slot = self._get_time_slot(article.get('published_at', ''))
                used_time_slots.add(time_slot)
                
                # 카테고리 추가
                category = self._get_article_category(article)
                used_categories.add(category)
            
            # 최종 점수로 정렬
            diversified_articles.sort(
                key=lambda x: x.get('personalization_score', 0), 
                reverse=True
            )
            
            logger.info(f"종목 {target_symbol} 다양성 알고리즘 적용 완료: {len(diversified_articles)}개 뉴스")
            return diversified_articles
            
        except Exception as e:
            logger.error(f"종목별 다양성 알고리즘 오류: {str(e)}")
            # 폴백: 기본 점수로 정렬
            for article in scored_articles:
                article['personalization_score'] = article.get('base_personalization_score', 0.5)
            scored_articles.sort(key=lambda x: x['personalization_score'], reverse=True)
            return scored_articles
    
    def _calculate_symbol_diversity_bonus(
        self, 
        article: Dict, 
        used_sources: set, 
        used_time_slots: set,
        used_categories: set
    ) -> float:
        """종목별 다양성 보너스 계산"""
        bonus = 0.0
        
        # 1. 소스 다양성 (40%)
        source = article.get('source', '')
        if source and source not in used_sources:
            bonus += 0.4
        elif source in used_sources:
            bonus += 0.1
        
        # 2. 시간대 다양성 (30%)
        time_slot = self._get_time_slot(article.get('published_at', ''))
        if time_slot not in used_time_slots:
            bonus += 0.3
        else:
            bonus += 0.05
        
        # 3. 카테고리 다양성 (30%)
        category = self._get_article_category(article)
        if category not in used_categories:
            bonus += 0.3
        else:
            bonus += 0.05
        
        return min(1.0, bonus)
    
    def _get_article_category(self, article: Dict) -> str:
        """기사 카테고리 추출"""
        title = article.get('title', '').lower()
        description = article.get('description', '').lower()
        text = f"{title} {description}"
        
        # 카테고리 키워드 매칭 (종목별 특화)
        if any(word in text for word in ['earnings', 'revenue', 'profit', '실적', 'quarterly']):
            return 'earnings'
        elif any(word in text for word in ['analyst', 'rating', 'upgrade', 'downgrade', '분석']):
            return 'analysis'
        elif any(word in text for word in ['market', 'trading', 'stock', '주식', '시장']):
            return 'market'
        elif any(word in text for word in ['product', 'launch', 'innovation', '신제품', '출시']):
            return 'product'
        elif any(word in text for word in ['merger', 'acquisition', 'deal', '인수', '합병']):
            return 'corporate'
        elif any(word in text for word in ['regulation', 'policy', '규제', '정책']):
            return 'regulatory'
        else:
            return 'general'