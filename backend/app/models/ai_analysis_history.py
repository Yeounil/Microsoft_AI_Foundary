from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json

Base = declarative_base()

class AIAnalysisHistory(Base):
    __tablename__ = "ai_analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    market = Column(String, default='us', nullable=False, index=True)
    company_name = Column(String)
    analysis_type = Column(String, default='stock_analysis')
    analysis_prompt = Column(Text)
    analysis_result = Column(Text, nullable=False)
    referenced_news_count = Column(Integer, default=0)
    referenced_news_sources = Column(Text)  # JSON string
    stock_price_at_analysis = Column(Float)
    analysis_period = Column(String, default='1y')
    analysis_interval = Column(String, default='1d')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'symbol': self.symbol,
            'market': self.market,
            'company_name': self.company_name,
            'analysis_type': self.analysis_type,
            'analysis_prompt': self.analysis_prompt,
            'analysis_result': self.analysis_result,
            'referenced_news_count': self.referenced_news_count,
            'referenced_news_sources': json.loads(self.referenced_news_sources) if self.referenced_news_sources else [],
            'stock_price_at_analysis': self.stock_price_at_analysis,
            'analysis_period': self.analysis_period,
            'analysis_interval': self.analysis_interval,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

    def set_referenced_news_sources(self, sources_list):
        """뉴스 소스 리스트를 JSON 문자열로 저장"""
        self.referenced_news_sources = json.dumps(sources_list) if sources_list else None

    def get_referenced_news_sources(self):
        """저장된 JSON 문자열을 리스트로 반환"""
        return json.loads(self.referenced_news_sources) if self.referenced_news_sources else []