from typing import List, Dict, Optional
from supabase import Client
from app.db.supabase_client import get_supabase
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SupabaseUserInterestService:
    """Supabase 기반 사용자 관심사 관리 서비스"""
    
    def __init__(self):
        self.supabase: Client = get_supabase()
        self.table_name = "user_interests"
    
    async def add_user_interest(self, user_id: str, interest: str) -> Optional[Dict]:
        """사용자 관심사 추가"""
        try:
            # 중복 체크
            existing = await self.get_user_interest_by_symbol(user_id, interest)
            if existing:
                logger.info(f"관심사 '{interest}'가 이미 존재합니다")
                return existing
            
            interest_data = {
                "user_id": user_id,
                "interest": interest
            }
            
            result = self.supabase.table(self.table_name).insert(interest_data).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"관심사 '{interest}' 추가 완료")
                return result.data[0]
            
            return None
            
        except Exception as e:
            logger.error(f"관심사 추가 중 오류: {str(e)}")
            return None
    
    async def get_user_interests(self, user_id: str) -> List[Dict]:
        """사용자의 모든 관심사 조회"""
        try:
            result = self.supabase.table(self.table_name)\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"관심사 조회 중 오류: {str(e)}")
            return []
    
    async def get_user_interest_by_symbol(self, user_id: str, interest: str) -> Optional[Dict]:
        """특정 관심사 조회"""
        try:
            result = self.supabase.table(self.table_name)\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("interest", interest)\
                .execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"관심사 조회 중 오류: {str(e)}")
            return None
    
    async def remove_user_interest(self, user_id: str, interest_id: int) -> bool:
        """사용자 관심사 삭제"""
        try:
            result = self.supabase.table(self.table_name)\
                .delete()\
                .eq("id", interest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            success = len(result.data) > 0
            if success:
                logger.info(f"관심사 ID {interest_id} 삭제 완료")
            
            return success
            
        except Exception as e:
            logger.error(f"관심사 삭제 중 오류: {str(e)}")
            return False
    
    async def remove_user_interest_by_symbol(self, user_id: str, interest: str) -> bool:
        """사용자 관심사를 심볼로 삭제"""
        try:
            result = self.supabase.table(self.table_name)\
                .delete()\
                .eq("user_id", user_id)\
                .eq("interest", interest)\
                .execute()
            
            success = len(result.data) > 0
            if success:
                logger.info(f"관심사 '{interest}' 삭제 완료")
            
            return success
            
        except Exception as e:
            logger.error(f"관심사 삭제 중 오류: {str(e)}")
            return False
    
    async def get_user_interests_for_recommendation(self, user_id: str) -> List[str]:
        """추천용 사용자 관심사 목록 (단순 심볼 리스트)"""
        try:
            interests = await self.get_user_interests(user_id)
            return [interest['interest'] for interest in interests]
            
        except Exception as e:
            logger.error(f"추천용 관심사 조회 중 오류: {str(e)}")
            return []
    
    async def update_user_interest(self, user_id: str, interest_id: int, new_interest: str) -> bool:
        """사용자 관심사 업데이트"""
        try:
            result = self.supabase.table(self.table_name)\
                .update({"interest": new_interest})\
                .eq("id", interest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            success = len(result.data) > 0
            if success:
                logger.info(f"관심사 ID {interest_id} 업데이트 완료")
            
            return success
            
        except Exception as e:
            logger.error(f"관심사 업데이트 중 오류: {str(e)}")
            return False
    
    async def get_interest_statistics(self, user_id: str) -> Dict:
        """사용자 관심사 통계"""
        try:
            interests = await self.get_user_interests(user_id)
            
            return {
                "total_count": len(interests),
                "interests": [interest['interest'] for interest in interests],
                "created_dates": [interest.get('created_at', '') for interest in interests]
            }
            
        except Exception as e:
            logger.error(f"관심사 통계 조회 중 오류: {str(e)}")
            return {"total_count": 0, "interests": [], "created_dates": []}