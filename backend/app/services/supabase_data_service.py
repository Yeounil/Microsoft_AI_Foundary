from supabase import Client
from app.db.supabase_client import get_supabase
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

class SupabaseDataService:
    """기존 테이블 구조에 맞춘 Supabase 데이터 서비스"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
        # 기존 테이블 구조에 맞춘 테이블명
        self.news_history_table = "news_history"
        self.search_history_table = "search_history" 
        self.ai_analysis_table = "ai_analysis_history"
        self.favorites_table = "user_favorites"
    
    # === 검색 기록 관리 ===
    async def add_search_history(self, user_id: str, symbol: str) -> Optional[Dict[str, Any]]:
        """주식 검색 기록 추가"""
        try:
            search_record = {
                "user_id": user_id,
                "symbol": symbol.upper()
            }
            
            result = self.supabase.table(self.search_history_table).insert(search_record).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"검색 기록 추가 중 오류: {str(e)}")
            return None
    
    async def get_search_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """사용자 검색 기록 조회"""
        try:
            result = self.supabase.table(self.search_history_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .order("searched_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"검색 기록 조회 중 오류: {str(e)}")
            return []
    
    # === 뉴스 조회 기록 관리 ===
    async def add_news_history(self, user_id: str, article_url: str, title: str = None) -> Optional[Dict[str, Any]]:
        """뉴스 조회 기록 추가"""
        try:
            news_record = {
                "user_id": user_id,
                "article_url": article_url,
                "title": title
            }
            
            result = self.supabase.table(self.news_history_table).insert(news_record).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"뉴스 기록 추가 중 오류: {str(e)}")
            return None
    
    async def get_news_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """사용자 뉴스 조회 기록"""
        try:
            result = self.supabase.table(self.news_history_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .order("viewed_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"뉴스 기록 조회 중 오류: {str(e)}")
            return []
    
    # === AI 분석 데이터 관련 메소드 ===
    async def save_ai_analysis(
        self, 
        user_id: str, 
        symbol: str, 
        analysis_type: str,
        analysis_content: str,
        additional_data: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """AI 분석 결과 저장 (기존 구조에 맞춤)"""
        try:
            analysis_record = {
                "user_id": user_id,
                "symbol": symbol.upper(),
                "analysis_type": analysis_type,  # 'stock_analysis', 'news_summary', 'market_summary'
                "analysis_content": analysis_content,
                "additional_data": json.dumps(additional_data or {})
            }
            
            result = self.supabase.table(self.ai_analysis_table).insert(analysis_record).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"AI 분석 저장 중 오류: {str(e)}")
            return None
    
    async def get_user_ai_analyses(
        self, 
        user_id: str, 
        analysis_type: str = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """사용자의 AI 분석 기록 조회"""
        try:
            query = self.supabase.table(self.ai_analysis_table)\
                .select("*")\
                .eq("user_id", user_id)
            
            if analysis_type:
                query = query.eq("analysis_type", analysis_type)
                
            result = query.order("created_at", desc=True).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"AI 분석 조회 중 오류: {str(e)}")
            return []
    
    async def get_ai_analyses_by_symbol(
        self, 
        user_id: str, 
        symbol: str, 
        analysis_type: str = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """특정 종목의 AI 분석 기록 조회"""
        try:
            query = self.supabase.table(self.ai_analysis_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("symbol", symbol.upper())
            
            if analysis_type:
                query = query.eq("analysis_type", analysis_type)
                
            result = query.order("created_at", desc=True).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"종목별 AI 분석 조회 중 오류: {str(e)}")
            return []
    
    # === 관심 종목 관리 ===
    async def add_favorite_stock(
        self, 
        user_id: str, 
        symbol: str, 
        company_name: str = ""
    ) -> Optional[Dict[str, Any]]:
        """관심 종목 추가 (기존 구조에 맞춤)"""
        try:
            # 중복 확인
            existing = self.supabase.table(self.favorites_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("symbol", symbol.upper())\
                .execute()
            
            if existing.data and len(existing.data) > 0:
                return existing.data[0]  # 이미 존재함
            
            favorite_record = {
                "user_id": user_id,
                "symbol": symbol.upper(),
                "company_name": company_name
            }
            
            result = self.supabase.table(self.favorites_table).insert(favorite_record).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"관심 종목 추가 중 오류: {str(e)}")
            return None
    
    async def get_user_favorites(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자 관심 종목 조회"""
        try:
            result = self.supabase.table(self.favorites_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .order("added_at", desc=True)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"관심 종목 조회 중 오류: {str(e)}")
            return []
    
    async def remove_favorite_stock(self, user_id: str, symbol: str) -> bool:
        """관심 종목 제거"""
        try:
            result = self.supabase.table(self.favorites_table)\
                .delete()\
                .eq("user_id", user_id)\
                .eq("symbol", symbol.upper())\
                .execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"관심 종목 제거 중 오류: {str(e)}")
            return False
    
    # === 편의 메소드들 ===
    async def save_stock_analysis(
        self, 
        user_id: str, 
        symbol: str, 
        analysis_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """주식 분석 결과 저장 (편의 메소드)"""
        return await self.save_ai_analysis(
            user_id=user_id,
            symbol=symbol,
            analysis_type="stock_analysis",
            analysis_content=analysis_data.get("analysis", ""),
            additional_data=analysis_data
        )
    
    async def save_news_summary(
        self, 
        user_id: str, 
        news_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """뉴스 요약 결과 저장 (편의 메소드)"""
        return await self.save_ai_analysis(
            user_id=user_id,
            symbol=news_data.get("query", "NEWS"),
            analysis_type="news_summary",
            analysis_content=news_data.get("ai_summary", ""),
            additional_data=news_data
        )
    
    async def get_user_stock_analyses(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """사용자 주식 분석 기록 조회 (편의 메소드)"""
        return await self.get_user_ai_analyses(
            user_id=user_id,
            analysis_type="stock_analysis",
            limit=limit
        )
    
    async def get_user_news_summaries(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """사용자 뉴스 요약 기록 조회 (편의 메소드)"""
        return await self.get_user_ai_analyses(
            user_id=user_id,
            analysis_type="news_summary",
            limit=limit
        )
    
    async def get_stock_analysis_by_symbol(self, user_id: str, symbol: str, limit: int = 5) -> List[Dict[str, Any]]:
        """특정 종목 분석 기록 조회 (편의 메소드)"""
        return await self.get_ai_analyses_by_symbol(
            user_id=user_id,
            symbol=symbol,
            analysis_type="stock_analysis",
            limit=limit
        )