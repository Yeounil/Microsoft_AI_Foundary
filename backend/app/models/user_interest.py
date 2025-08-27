from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.user import Base

class UserInterest(Base):
    """사용자 관심 종목 모델"""
    __tablename__ = "user_interests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    market = Column(String(10), nullable=False)  # 'us' or 'kr'
    company_name = Column(String(100))
    priority = Column(Integer, default=1)  # 1: 높음, 2: 중간, 3: 낮음
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # 관계 설정 (user 모델과 연결)
    # user = relationship("User", back_populates="interests")

class UserNewsPreference(Base):
    """사용자 뉴스 선호도 모델"""
    __tablename__ = "user_news_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50))  # 'earnings', 'merger', 'analyst', 'market', etc.
    preference_score = Column(Float, default=0.0)  # -1.0 ~ 1.0 (싫어함 ~ 좋아함)
    updated_at = Column(DateTime, default=datetime.utcnow)

class UserNewsInteraction(Base):
    """사용자 뉴스 상호작용 추적"""
    __tablename__ = "user_news_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    news_url = Column(String(500), nullable=False)
    news_title = Column(String(200))
    symbol = Column(String(20))
    action = Column(String(20))  # 'view', 'like', 'dislike', 'share', 'bookmark'
    interaction_time = Column(Integer)  # 읽은 시간 (초)
    created_at = Column(DateTime, default=datetime.utcnow)

class NewsRecommendation(Base):
    """뉴스 추천 결과 저장"""
    __tablename__ = "news_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    news_url = Column(String(500), nullable=False)
    symbol = Column(String(20))
    recommendation_score = Column(Float)  # 추천 점수
    reason = Column(String(100))  # 추천 이유
    created_at = Column(DateTime, default=datetime.utcnow)
    is_shown = Column(Boolean, default=False)
    is_clicked = Column(Boolean, default=False)