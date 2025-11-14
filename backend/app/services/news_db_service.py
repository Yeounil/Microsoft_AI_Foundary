from typing import List, Dict, Optional
from datetime import datetime
import logging
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class NewsDBService:
    """뉴스 데이터베이스 관련 서비스"""
    
    @staticmethod
    async def save_news_articles(articles: List[Dict]) -> List[int]:
        """뉴스 기사들을 데이터베이스에 저장 (중복 체크 포함)"""
        try:
            supabase = get_supabase()
            saved_ids = []
            
            for article in articles:
                # URL 중복 체크
                existing = supabase.table("news_articles").select("id").eq("url", article["url"]).execute()
                
                if existing.data:
                    logger.info(f"이미 존재하는 뉴스: {article['url']}")
                    continue
                
                # 새 뉴스 저장
                news_data = {
                    "symbol": article.get("symbol"),
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "content": article.get("content", ""),
                    "body": article.get("body", ""),  # ✅ newsapi.ai 기사 본문
                    "url": article["url"],
                    "source": article.get("source", ""),
                    "author": article.get("author", ""),
                    "published_at": article.get("published_at"),
                    "image_url": article.get("image_url", ""),
                    "language": article.get("language", "en"),
                    "category": article.get("category", "finance"),
                    "api_source": article.get("api_source", "unknown")
                }
                
                result = supabase.table("news_articles").insert(news_data).execute()
                
                if result.data:
                    saved_ids.append(result.data[0]["id"])
                    logger.info(f"뉴스 저장 완료: {article['title']}")
            
            return saved_ids
            
        except Exception as e:
            logger.error(f"뉴스 저장 중 오류: {str(e)}")
            return []
    
    @staticmethod
    async def get_latest_news_by_symbol(symbol: str, limit: int = 10) -> List[Dict]:
        """특정 종목의 최신 뉴스 가져오기"""
        try:
            supabase = get_supabase()
            
            result = supabase.table("news_articles").select("*")\
                .eq("symbol", symbol)\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"뉴스 조회 중 오류: {str(e)}")
            return []
    
    @staticmethod
    async def get_latest_financial_news(limit: int = 10, language: str = "en") -> List[Dict]:
        """최신 금융 뉴스 가져오기"""
        try:
            supabase = get_supabase()
            
            result = supabase.table("news_articles").select("*")\
                .eq("language", language)\
                .in_("category", ["finance", "market"])\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"금융 뉴스 조회 중 오류: {str(e)}")
            return []
    
    @staticmethod
    async def check_article_exists(url: str) -> bool:
        """기사 URL이 이미 존재하는지 확인"""
        try:
            supabase = get_supabase()
            
            result = supabase.table("news_articles").select("id").eq("url", url).execute()
            
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            logger.error(f"중복 체크 중 오류: {str(e)}")
            return False
    
    @staticmethod
    async def get_news_for_analysis(symbol: str, days: int = 7, limit: int = 20) -> List[Dict]:
        """AI 분석용 뉴스 데이터 가져오기"""
        try:
            supabase = get_supabase()

            # 최근 N일간의 날짜 계산 (Python에서)
            from datetime import datetime, timedelta
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

            # 최근 N일간의 뉴스 가져오기
            result = supabase.table("news_articles").select("*")\
                .eq("symbol", symbol)\
                .gte("published_at", cutoff_date)\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"분석용 뉴스 조회 중 오류: {str(e)}")
            return []

    @staticmethod
    async def get_last_crawl_date_for_symbol(symbol: str) -> Optional[str]:
        """특정 종목의 마지막 크롤링 날짜 조회

        Args:
            symbol: 종목 심볼

        Returns:
            마지막 뉴스의 published_at (ISO 8601 형식) 또는 None
        """
        try:
            supabase = get_supabase()

            # 해당 종목의 가장 최근 뉴스 조회
            result = supabase.table("news_articles")\
                .select("published_at")\
                .eq("symbol", symbol)\
                .order("published_at", desc=True)\
                .limit(1)\
                .execute()

            if result.data and len(result.data) > 0:
                published_at = result.data[0].get("published_at")
                logger.info(f"[LAST_CRAWL] {symbol}: Last article published at {published_at}")
                return published_at

            logger.info(f"[LAST_CRAWL] {symbol}: No previous articles found")
            return None

        except Exception as e:
            logger.error(f"마지막 크롤링 날짜 조회 중 오류: {str(e)}")
            return None

    @staticmethod
    async def delete_old_news(days: int = 365) -> int:
        """N일 이상 된 뉴스 삭제 (기본값: 1년)

        Args:
            days: 삭제 대상 기한 (기본값 365일)

        Returns:
            삭제된 뉴스 개수
        """
        try:
            supabase = get_supabase()

            from datetime import datetime, timedelta
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

            # N일 이전의 뉴스 조회
            result = supabase.table("news_articles").select("id")\
                .lt("published_at", cutoff_date)\
                .execute()

            if not result.data:
                logger.info(f"[CLEANUP] {days}일 이상 된 뉴스가 없습니다")
                return 0

            old_article_ids = [article["id"] for article in result.data]
            deleted_count = 0

            # 배치로 삭제 (Supabase 제한: 한 번에 많은 개수 삭제 불가)
            batch_size = 100
            for i in range(0, len(old_article_ids), batch_size):
                batch_ids = old_article_ids[i:i+batch_size]

                # OR 조건으로 삭제
                delete_result = supabase.table("news_articles").delete()\
                    .in_("id", batch_ids)\
                    .execute()

                deleted_count += len(batch_ids)
                logger.info(f"[CLEANUP] {len(batch_ids)}개 뉴스 삭제 완료")

            logger.info(f"[CLEANUP] 총 {deleted_count}개의 {days}일 이상 된 뉴스 삭제 완료")
            return deleted_count

        except Exception as e:
            logger.error(f"뉴스 삭제 중 오류: {str(e)}")
            return 0