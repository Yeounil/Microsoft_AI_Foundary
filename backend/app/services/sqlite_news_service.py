from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
import logging

from app.db.database import SessionLocal
from app.models.news_article import NewsArticle

logger = logging.getLogger(__name__)

class SQLiteNewsService:
    """SQLite 기반 뉴스 데이터베이스 서비스"""
    
    @staticmethod
    async def save_news_articles(articles: List[Dict]) -> List[int]:
        """뉴스 기사들을 SQLite 데이터베이스에 저장 (중복 체크 포함)"""
        db = SessionLocal()
        try:
            saved_ids = []
            
            for article in articles:
                # URL 중복 체크
                existing = db.query(NewsArticle).filter(NewsArticle.url == article["url"]).first()
                
                if existing:
                    logger.info(f"이미 존재하는 뉴스: {article['url']}")
                    continue
                
                # published_at 파싱
                published_at = None
                if article.get("published_at"):
                    try:
                        published_at = datetime.fromisoformat(article["published_at"].replace('Z', '+00:00'))
                    except:
                        published_at = None
                
                # 새 뉴스 저장
                news_article = NewsArticle(
                    symbol=article.get("symbol"),
                    title=article.get("title", ""),
                    description=article.get("description", ""),
                    content=article.get("content", ""),
                    url=article["url"],
                    source=article.get("source", ""),
                    author=article.get("author", ""),
                    published_at=published_at,
                    image_url=article.get("image_url", ""),
                    language=article.get("language", "en"),
                    category=article.get("category", "finance"),
                    api_source=article.get("api_source", "unknown")
                )
                
                db.add(news_article)
                db.commit()
                db.refresh(news_article)
                
                saved_ids.append(news_article.id)
                logger.info(f"뉴스 저장 완료: {article['title']}")
            
            return saved_ids
            
        except Exception as e:
            logger.error(f"뉴스 저장 중 오류: {str(e)}")
            db.rollback()
            return []
        finally:
            db.close()
    
    @staticmethod
    async def get_latest_news_by_symbol(symbol: str, limit: int = 10, days_back: int = 7) -> List[Dict]:
        """특정 종목의 최신 뉴스 가져오기"""
        db = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            
            articles = db.query(NewsArticle).filter(
                and_(
                    NewsArticle.symbol == symbol,
                    NewsArticle.published_at >= cutoff_date
                )
            ).order_by(desc(NewsArticle.published_at)).limit(limit).all()
            
            return [
                {
                    "id": article.id,
                    "symbol": article.symbol,
                    "title": article.title,
                    "description": article.description,
                    "content": article.content,
                    "url": article.url,
                    "source": article.source,
                    "author": article.author,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "image_url": article.image_url,
                    "language": article.language,
                    "category": article.category,
                    "api_source": article.api_source
                }
                for article in articles
            ]
            
        except Exception as e:
            logger.error(f"뉴스 조회 중 오류: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    async def get_latest_financial_news(limit: int = 10, language: str = "en") -> List[Dict]:
        """최신 금융 뉴스 가져오기"""
        db = SessionLocal()
        try:
            articles = db.query(NewsArticle).filter(
                and_(
                    NewsArticle.language == language,
                    NewsArticle.category.in_(["finance", "market"])
                )
            ).order_by(desc(NewsArticle.published_at)).limit(limit).all()
            
            return [
                {
                    "id": article.id,
                    "symbol": article.symbol,
                    "title": article.title,
                    "description": article.description,
                    "content": article.content,
                    "url": article.url,
                    "source": article.source,
                    "author": article.author,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "image_url": article.image_url,
                    "language": article.language,
                    "category": article.category,
                    "api_source": article.api_source
                }
                for article in articles
            ]
            
        except Exception as e:
            logger.error(f"금융 뉴스 조회 중 오류: {str(e)}")
            return []
        finally:
            db.close()
    
    @staticmethod
    async def check_article_exists(url: str) -> bool:
        """기사 URL이 이미 존재하는지 확인"""
        db = SessionLocal()
        try:
            exists = db.query(NewsArticle).filter(NewsArticle.url == url).first()
            return exists is not None
            
        except Exception as e:
            logger.error(f"중복 체크 중 오류: {str(e)}")
            return False
        finally:
            db.close()
    
    @staticmethod
    async def get_news_for_analysis(symbol: str, days: int = 7, limit: int = 20) -> List[Dict]:
        """AI 분석용 뉴스 데이터 가져오기"""
        db = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            articles = db.query(NewsArticle).filter(
                and_(
                    NewsArticle.symbol == symbol,
                    NewsArticle.published_at >= cutoff_date
                )
            ).order_by(desc(NewsArticle.published_at)).limit(limit).all()
            
            return [
                {
                    "id": article.id,
                    "symbol": article.symbol,
                    "title": article.title,
                    "description": article.description,
                    "content": article.content,
                    "url": article.url,
                    "source": article.source,
                    "author": article.author,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "image_url": article.image_url,
                    "language": article.language,
                    "category": article.category,
                    "api_source": article.api_source
                }
                for article in articles
            ]
            
        except Exception as e:
            logger.error(f"분석용 뉴스 조회 중 오류: {str(e)}")
            return []
        finally:
            db.close()