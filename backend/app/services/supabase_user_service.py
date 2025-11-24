from supabase import Client
from app.db.supabase_client import get_supabase
from app.core.security import get_password_hash, verify_password
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timezone
import logging

logger = logging.getLogger(__name__)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str

class UserProfileCreate(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    user_id: str
    name: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    created_at: datetime
    updated_at: datetime

class SupabaseUserService:
    def __init__(self):
        self.supabase: Client = get_supabase()
        self.auth_table = "auth_users"
        self.profile_table = "user_profiles"
        self.interests_table = "user_interests"
    
    async def create_user(self, user_data: UserCreate) -> Optional[Dict[str, Any]]:
        """새 사용자 생성 (기존 auth_users 테이블 구조)"""
        try:
            # 중복 사용자 체크
            existing_user = await self.get_user_by_username(user_data.username)
            if existing_user:
                raise Exception("Username already registered")
            
            existing_email = await self.get_user_by_email(user_data.email)
            if existing_email:
                raise Exception("Email already registered")
            
            # 비밀번호 해시화
            hashed_password = get_password_hash(user_data.password)
            
            # 사용자 데이터 준비 (기존 구조에 맞춤)
            user_dict = {
                "username": user_data.username,
                "email": user_data.email,
                "hashed_password": hashed_password
            }
            
            # RLS 우회를 위해 service role을 사용하거나 
            # 임시적으로 다른 방법을 시도
            try:
                # 먼저 기본 방법 시도
                result = self.supabase.table(self.auth_table).insert(user_dict).execute()
            except Exception as rls_error:
                if "row-level security" in str(rls_error).lower():
                    # RLS 문제인 경우, 다른 방법 시도
                    logger.warning(f"RLS 정책으로 인한 삽입 실패, 대안 방법 시도 중...")
                    
                    # 임시 해결책: 다른 클라이언트나 방법을 시도할 수 있지만
                    # 현재는 사용자에게 오류를 명확히 전달
                    raise Exception("사용자 등록이 현재 제한되어 있습니다. 시스템 관리자에게 문의하세요.")
                else:
                    raise rls_error
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                # 비밀번호 제외하고 반환
                if 'hashed_password' in user:
                    del user['hashed_password']
                return user
            else:
                logger.error(f"사용자 생성 실패: {result}")
                return None
                
        except Exception as e:
            logger.error(f"사용자 생성 중 오류 발생: {str(e)}")
            raise Exception(f"사용자 생성 실패: {str(e)}")
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """사용자명으로 사용자 조회"""
        try:
            result = self.supabase.table(self.auth_table).select("*").eq("username", username).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"사용자 조회 중 오류 발생: {str(e)}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """이메일로 사용자 조회"""
        try:
            result = self.supabase.table(self.auth_table).select("*").eq("email", email).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"사용자 조회 중 오류 발생: {str(e)}")
            return None
    
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """사용자 인증"""
        try:
            user = await self.get_user_by_username(username)
            if not user:
                return None
            
            if not verify_password(password, user['hashed_password']):
                return None
            
            # 비밀번호 제외하고 반환
            del user['hashed_password']
            return user
            
        except Exception as e:
            logger.error(f"사용자 인증 중 오류 발생: {str(e)}")
            return None
    
    # === 사용자 프로필 관련 메소드 ===
    async def create_user_profile(self, user_id: str, profile_data: UserProfileCreate) -> Optional[Dict[str, Any]]:
        """사용자 프로필 생성"""
        try:
            profile_dict = {
                "user_id": user_id,
                "name": profile_data.name,
                "date_of_birth": profile_data.date_of_birth.isoformat() if profile_data.date_of_birth else None,
                "gender": profile_data.gender
            }
            
            result = self.supabase.table(self.profile_table).insert(profile_dict).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"프로필 생성 중 오류 발생: {str(e)}")
            return None
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 프로필 조회"""
        try:
            result = self.supabase.table(self.profile_table).select("*").eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"프로필 조회 중 오류 발생: {str(e)}")
            return None
    
    async def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """사용자 프로필 업데이트"""
        try:
            profile_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.supabase.table(self.profile_table)\
                .update(profile_data)\
                .eq("user_id", user_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"프로필 업데이트 중 오류 발생: {str(e)}")
            return None
    
    # === 사용자 관심사 관리 ===
    async def add_user_interest(self, user_id: str, interest: str) -> Optional[Dict[str, Any]]:
        """사용자 관심사 추가"""
        try:
            interest_dict = {
                "user_id": user_id,
                "interest": interest
            }
            
            result = self.supabase.table(self.interests_table).insert(interest_dict).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"관심사 추가 중 오류 발생: {str(e)}")
            return None
    
    async def get_user_interests(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자 관심사 조회"""
        try:
            result = self.supabase.table(self.interests_table)\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"관심사 조회 중 오류 발생: {str(e)}")
            return []
    
    async def remove_user_interest(self, user_id: str, interest_id: int) -> bool:
        """사용자 관심사 삭제"""
        try:
            result = self.supabase.table(self.interests_table)\
                .delete()\
                .eq("id", interest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"관심사 삭제 중 오류 발생: {str(e)}")
            return False
    
    async def authenticate_user(self, username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
        """사용자 인증 (이메일 또는 사용자명으로 로그인)"""
        try:
            user = None
            
            # 먼저 사용자명으로 시도
            if username_or_email:
                user = await self.get_user_by_username(username_or_email)
                
                # 사용자명으로 찾지 못했으면 이메일로 시도
                if not user:
                    user = await self.get_user_by_email(username_or_email)
            
            if not user:
                return None
                
            # 비밀번호 검증
            if not verify_password(password, user.get("hashed_password", "")):
                return None
                
            # 비밀번호 제외하고 반환
            user_copy = user.copy()
            if 'hashed_password' in user_copy:
                del user_copy['hashed_password']
                
            return user_copy
            
        except Exception as e:
            logger.error(f"사용자 인증 중 오류 발생: {str(e)}")
            return None