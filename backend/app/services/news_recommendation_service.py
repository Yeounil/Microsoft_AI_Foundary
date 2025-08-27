from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
import math
import re
from collections import defaultdict

from app.models.user_interest import UserInterest, UserNewsPreference, UserNewsInteraction, NewsRecommendation
from app.models.user import User
from app.services.sqlite_news_service import SQLiteNewsService
from app.services.openai_service import OpenAIService

logger = logging.getLogger(__name__)

class NewsRecommendationService:
    """뉴스 추천 알고리즘 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
        self.openai_service = OpenAIService()
    
    async def get_personalized_news_recommendations(
        self, 
        user_id: int, 
        limit: int = 10,
        days_back: int = 7
    ) -> List[Dict]:
        """사용자 맞춤 뉴스 추천"""
        try:
            logger.info(f"사용자 {user_id}에 대한 뉴스 추천 생성 시작")
            
            # 1. 사용자 관심 종목 가져오기
            user_interests = self._get_user_interests(user_id)
            if not user_interests:
                logger.info(f"사용자 {user_id}의 관심 종목이 없음")
                return []
            
            # 2. 관심 종목별 최신 뉴스 수집
            all_news = []
            for interest in user_interests:
                news = await SQLiteNewsService.get_latest_news_by_symbol(
                    interest.symbol, 
                    limit=20, 
                    days_back=days_back
                )
                for article in news:
                    article['user_interest_priority'] = interest.priority
                    article['symbol'] = interest.symbol
                all_news.extend(news)
            
            # 3. 뉴스 점수 계산 및 추천
            scored_news = await self._score_news_for_user(user_id, all_news)
            
            # 4. 상위 뉴스 선택
            recommended_news = sorted(scored_news, key=lambda x: x['recommendation_score'], reverse=True)[:limit]
            
            # 5. 추천 결과 DB 저장
            await self._save_recommendations(user_id, recommended_news)
            
            logger.info(f"사용자 {user_id}에게 {len(recommended_news)}개 뉴스 추천 완료")
            return recommended_news
            
        except Exception as e:
            logger.error(f"뉴스 추천 생성 중 오류: {str(e)}")
            return []
    
    async def add_user_interest(
        self, 
        user_id: int, 
        symbol: str, 
        market: str, 
        company_name: str = None,
        priority: int = 1
    ) -> bool:
        """사용자 관심 종목 추가"""
        try:
            # 기존 관심 종목 확인
            existing = self.db.query(UserInterest).filter(
                and_(
                    UserInterest.user_id == user_id,
                    UserInterest.symbol == symbol,
                    UserInterest.market == market,
                    UserInterest.is_active == True
                )
            ).first()
            
            if existing:
                existing.priority = priority
                existing.updated_at = datetime.utcnow()
            else:
                new_interest = UserInterest(
                    user_id=user_id,
                    symbol=symbol,
                    market=market,
                    company_name=company_name,
                    priority=priority
                )
                self.db.add(new_interest)
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"관심 종목 추가 오류: {str(e)}")
            self.db.rollback()
            return False
    
    async def remove_user_interest(self, user_id: int, symbol: str, market: str) -> bool:
        """사용자 관심 종목 제거"""
        try:
            interest = self.db.query(UserInterest).filter(
                and_(
                    UserInterest.user_id == user_id,
                    UserInterest.symbol == symbol,
                    UserInterest.market == market
                )
            ).first()
            
            if interest:
                interest.is_active = False
                self.db.commit()
                return True
            return False
            
        except Exception as e:
            logger.error(f"관심 종목 제거 오류: {str(e)}")
            self.db.rollback()
            return False
    
    async def track_news_interaction(
        self, 
        user_id: int, 
        news_url: str, 
        action: str,
        news_title: str = None,
        symbol: str = None,
        interaction_time: int = 0
    ) -> bool:
        """사용자 뉴스 상호작용 추적"""
        try:
            interaction = UserNewsInteraction(
                user_id=user_id,
                news_url=news_url,
                news_title=news_title,
                symbol=symbol,
                action=action,
                interaction_time=interaction_time
            )
            self.db.add(interaction)
            self.db.commit()
            
            # 선호도 업데이트
            await self._update_user_preferences(user_id, action, news_title, symbol)
            
            return True
            
        except Exception as e:
            logger.error(f"뉴스 상호작용 추적 오류: {str(e)}")
            self.db.rollback()
            return False
    
    def get_user_interests(self, user_id: int) -> List[Dict]:
        """사용자 관심 종목 목록 조회"""
        try:
            interests = self.db.query(UserInterest).filter(
                and_(
                    UserInterest.user_id == user_id,
                    UserInterest.is_active == True
                )
            ).order_by(UserInterest.priority, desc(UserInterest.created_at)).all()
            
            return [
                {
                    "id": interest.id,
                    "symbol": interest.symbol,
                    "market": interest.market,
                    "company_name": interest.company_name,
                    "priority": interest.priority,
                    "created_at": interest.created_at.isoformat()
                }
                for interest in interests
            ]
            
        except Exception as e:
            logger.error(f"관심 종목 조회 오류: {str(e)}")
            return []
    
    async def _score_news_for_user(self, user_id: int, news_articles: List[Dict]) -> List[Dict]:
        """사용자에 대한 뉴스 점수 계산"""
        try:
            # 사용자 선호도 가져오기
            preferences = self._get_user_preferences(user_id)
            recent_interactions = self._get_recent_interactions(user_id, days=30)
            
            scored_articles = []
            
            for article in news_articles:
                score = await self._calculate_article_score(
                    user_id, article, preferences, recent_interactions
                )
                
                article['recommendation_score'] = score
                article['recommendation_reason'] = self._get_recommendation_reason(article, score)
                scored_articles.append(article)
            
            return scored_articles
            
        except Exception as e:
            logger.error(f"뉴스 점수 계산 오류: {str(e)}")
            # 오류 시에도 기본 점수와 이유 추가
            for article in news_articles:
                article['recommendation_score'] = 0.5
                article['recommendation_reason'] = "기본 추천"
            return news_articles
    
    async def _calculate_article_score(
        self, 
        user_id: int, 
        article: Dict, 
        preferences: Dict, 
        interactions: List[Dict]
    ) -> float:
        """개별 뉴스 기사 점수 계산"""
        score = 0.0
        
        # 1. 관심 종목 우선순위 점수 (40%)
        priority = article.get('user_interest_priority', 3)
        priority_score = (4 - priority) / 3.0 * 0.4  # 1순위=1.0, 3순위=0.33
        score += priority_score
        
        # 2. 뉴스 신선도 점수 (20%)
        freshness_score = self._calculate_freshness_score(article.get('published_at', ''))
        score += freshness_score * 0.2
        
        # 3. 카테고리 선호도 점수 (20%)
        category_score = self._calculate_category_score(article, preferences)
        score += category_score * 0.2
        
        # 4. 과거 상호작용 기반 점수 (15%)
        interaction_score = self._calculate_interaction_score(article, interactions)
        score += interaction_score * 0.15
        
        # 5. AI 기반 내용 관련성 점수 (5%)
        try:
            relevance_score = await self._calculate_ai_relevance_score(user_id, article)
            score += relevance_score * 0.05
        except:
            pass  # AI 점수 실패해도 계속 진행
        
        return min(1.0, max(0.0, score))  # 0-1 범위로 정규화
    
    def _calculate_freshness_score(self, published_at: str) -> float:
        """뉴스 신선도 점수 계산"""
        try:
            if not published_at:
                return 0.0
            
            published_time = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            hours_ago = (datetime.now() - published_time.replace(tzinfo=None)).total_seconds() / 3600
            
            # 24시간 이내: 1.0, 168시간(7일) 이후: 0.0
            if hours_ago <= 24:
                return 1.0
            elif hours_ago >= 168:
                return 0.0
            else:
                return 1.0 - (hours_ago - 24) / 144  # 선형 감소
                
        except:
            return 0.5  # 파싱 실패 시 중간 점수
    
    def _calculate_category_score(self, article: Dict, preferences: Dict) -> float:
        """카테고리 기반 선호도 점수"""
        title = (article.get('title') or '').lower()
        description = (article.get('description') or '').lower()
        
        # 키워드 기반 카테고리 분류
        categories = {
            'earnings': ['earnings', '실적', '수익', 'revenue', 'profit'],
            'merger': ['merger', 'acquisition', '인수', '합병', 'm&a'],
            'analyst': ['analyst', 'rating', 'upgrade', 'downgrade', '애널리스트', '목표가'],
            'market': ['market', 'index', '시장', '지수', 'trading'],
            'technology': ['technology', 'innovation', '기술', '혁신', 'ai', 'tech']
        }
        
        detected_categories = []
        for category, keywords in categories.items():
            if any(keyword in title or keyword in description for keyword in keywords):
                detected_categories.append(category)
        
        if not detected_categories:
            return 0.5  # 중립
        
        # 선호도 점수 평균 계산
        scores = [preferences.get(cat, 0.0) for cat in detected_categories]
        return (sum(scores) / len(scores) + 1) / 2  # -1~1을 0~1로 변환
    
    def _calculate_interaction_score(self, article: Dict, interactions: List[Dict]) -> float:
        """과거 상호작용 기반 점수"""
        symbol = article.get('symbol', '')
        if not symbol or not interactions:
            return 0.5
        
        # 같은 종목 뉴스와의 상호작용 찾기
        symbol_interactions = [i for i in interactions if i.get('symbol') == symbol]
        if not symbol_interactions:
            return 0.5
        
        # 긍정적 상호작용 비율 계산
        positive_actions = ['like', 'share', 'bookmark']
        negative_actions = ['dislike']
        
        positive_count = sum(1 for i in symbol_interactions if i.get('action') in positive_actions)
        negative_count = sum(1 for i in symbol_interactions if i.get('action') in negative_actions)
        total_count = len(symbol_interactions)
        
        if total_count == 0:
            return 0.5
        
        return (positive_count - negative_count) / total_count + 0.5
    
    async def _calculate_ai_relevance_score(self, user_id: int, article: Dict) -> float:
        """AI 기반 내용 관련성 점수"""
        try:
            user_interests = self._get_user_interests(user_id)
            interest_symbols = [i.symbol for i in user_interests]
            
            # 간단한 키워드 매칭으로 대체 (OpenAI 호출 최소화)
            title = article.get('title', '').lower()
            description = article.get('description', '').lower()
            
            relevance_keywords = []
            for interest in user_interests:
                if interest.company_name:
                    relevance_keywords.extend(interest.company_name.lower().split())
                relevance_keywords.append(interest.symbol.lower())
            
            matches = sum(1 for keyword in relevance_keywords 
                         if keyword in title or keyword in description)
            
            return min(1.0, matches / len(relevance_keywords)) if relevance_keywords else 0.5
            
        except:
            return 0.5
    
    def _get_user_interests(self, user_id: int) -> List[UserInterest]:
        """사용자 관심 종목 조회"""
        return self.db.query(UserInterest).filter(
            and_(
                UserInterest.user_id == user_id,
                UserInterest.is_active == True
            )
        ).all()
    
    def _get_user_preferences(self, user_id: int) -> Dict[str, float]:
        """사용자 선호도 조회"""
        preferences = self.db.query(UserNewsPreference).filter(
            UserNewsPreference.user_id == user_id
        ).all()
        
        return {pref.category: pref.preference_score for pref in preferences}
    
    def _get_recent_interactions(self, user_id: int, days: int = 30) -> List[Dict]:
        """최근 상호작용 조회"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        interactions = self.db.query(UserNewsInteraction).filter(
            and_(
                UserNewsInteraction.user_id == user_id,
                UserNewsInteraction.created_at >= cutoff_date
            )
        ).all()
        
        return [
            {
                'symbol': i.symbol,
                'action': i.action,
                'interaction_time': i.interaction_time,
                'news_title': i.news_title
            }
            for i in interactions
        ]
    
    def _get_recommendation_reason(self, article: Dict, score: float) -> str:
        """추천 이유 생성"""
        priority = article.get('user_interest_priority', 3)
        symbol = article.get('symbol', '')
        
        if score > 0.8:
            return f"관심 종목 {symbol}의 중요 뉴스"
        elif score > 0.6:
            return f"관심 종목 {symbol} 관련"
        elif priority == 1:
            return f"우선 관심 종목 {symbol}"
        else:
            return f"{symbol} 뉴스"
    
    async def _save_recommendations(self, user_id: int, recommendations: List[Dict]):
        """추천 결과 DB 저장"""
        try:
            for article in recommendations:
                recommendation = NewsRecommendation(
                    user_id=user_id,
                    news_url=article.get('url', ''),
                    symbol=article.get('symbol', ''),
                    recommendation_score=article.get('recommendation_score', 0.0),
                    reason=article.get('recommendation_reason', '')
                )
                self.db.add(recommendation)
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"추천 결과 저장 오류: {str(e)}")
            self.db.rollback()
    
    async def _update_user_preferences(self, user_id: int, action: str, news_title: str, symbol: str):
        """사용자 선호도 업데이트"""
        try:
            # 액션에 따른 가중치
            action_weights = {
                'like': 0.1,
                'share': 0.15,
                'bookmark': 0.2,
                'view': 0.05,
                'dislike': -0.1
            }
            
            weight = action_weights.get(action, 0.0)
            if weight == 0.0:
                return
            
            # 뉴스 제목에서 카테고리 추출 후 선호도 업데이트
            # 실제 구현에서는 더 정교한 NLP 분석 필요
            
        except Exception as e:
            logger.error(f"선호도 업데이트 오류: {str(e)}")