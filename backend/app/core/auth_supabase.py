from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase_user_service import SupabaseUserService
from app.core.security import verify_token
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """현재 인증된 사용자 가져오기 (Supabase)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        username = verify_token(credentials.credentials)
        if username is None:
            raise credentials_exception
    except Exception as e:
        logger.error(f"토큰 검증 실패: {str(e)}")
        raise credentials_exception
    
    # Supabase에서 사용자 정보 조회
    user_service = SupabaseUserService()
    user = await user_service.get_user_by_username(username)
    
    if user is None:
        raise credentials_exception
    
    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"]
    }

async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """현재 활성 사용자 가져오기 (Supabase)"""
    # Supabase에서는 활성/비활성 상태를 별도로 관리하지 않으므로 바로 반환
    return current_user

# 실제 사용자 인증 (임시 사용자 제거)
async def get_current_user_or_create_temp(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """현재 사용자 인증 (Supabase) - 임시 사용자 로직 제거"""
    # 실제 인증만 허용 - 임시 사용자 로직 제거
    return await get_current_user(credentials)