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
    from jose import jwt, JWTError
    from app.core.config import settings

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 토큰 값 확인 (디버깅)
        token = credentials.credentials
        logger.info(f"받은 토큰: {token[:20]}... (길이: {len(token)})")

        # JWT 토큰 디코딩
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        # 토큰 타입 확인
        if payload.get("type") != "access":
            logger.error(f"토큰 타입 불일치: {payload.get('type')}")
            raise credentials_exception

        # JWT에서 직접 user_id와 username 추출
        user_id: str = payload.get("user_id")
        username: str = payload.get("sub")

        if not user_id or not username:
            logger.error(f"토큰에 user_id 또는 username 없음 - user_id: {user_id}, username: {username}")
            raise credentials_exception

        logger.info(f"토큰 검증 성공 - user_id: {user_id}, username: {username}")

        # DB 조회 없이 JWT 정보만으로 반환 (더 빠름)
        return {
            "user_id": user_id,
            "username": username,
            "email": payload.get("email", "")  # email이 없을 수 있음
        }

    except JWTError as e:
        logger.error(f"JWT 디코딩 실패: {type(e).__name__} - {str(e)}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"토큰 검증 중 예외 발생: {type(e).__name__} - {str(e)}")
        raise credentials_exception

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