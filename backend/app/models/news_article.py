from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.models.user import Base

class NewsArticle(Base):
    """뉴스 기사 모델"""
    __tablename__ = "news_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20))  # 관련 종목 심볼 (NULL 가능 - 일반 금융뉴스의 경우)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    content = Column(Text)  # 전체 기사 내용 (AI 분석용)
    url = Column(String(500), unique=True, nullable=False)  # 중복 체크용 고유 URL
    source = Column(String(100))
    author = Column(String(100))
    published_at = Column(DateTime)
    image_url = Column(String(500))
    language = Column(String(10), default='en')  # 'en', 'ko'
    category = Column(String(50), default='finance')  # 'finance', 'stock', 'market' 등
    api_source = Column(String(50))  # 'newsapi', 'naver', 'manual' 등 출처 구분
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)