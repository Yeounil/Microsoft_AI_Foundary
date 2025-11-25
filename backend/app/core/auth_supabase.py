from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase_user_service import SupabaseUserService
from app.core.security import verify_token
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """현재 인증된 사용자 가져오기 (Supabase) - Authorization 헤더 또는 HttpOnly 쿠키 지원"""
    from jose import jwt, JWTError
    from app.core.config import settings
    from app.db.supabase_client import get_supabase

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Authorization 헤더에서 토큰 추출 (우선)
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
        logger.info(f"[AUTH] Authorization 헤더에서 토큰 추출")
    # 2. HttpOnly 쿠키에서 토큰 추출 (fallback)
    elif request.cookies.get("access_token"):
        token = request.cookies.get("access_token")
        logger.info(f"[AUTH] 쿠키에서 토큰 추출")

    if not token:
        logger.error("[AUTH] 토큰이 없음 (헤더/쿠키 모두 없음)")
        raise credentials_exception

    try:
        # 토큰 값 확인 (디버깅)
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
        email: str = payload.get("email", "")

        if not user_id or not username:
            logger.error(f"토큰에 user_id 또는 username 없음 - user_id: {user_id}, username: {username}")
            raise credentials_exception

        logger.info(f"토큰 검증 성공 - user_id: {user_id}, username: {username}")

        # DB에서 사용자 확인 및 없으면 자동 생성 (구글 로그인 사용자)
        supabase = get_supabase()
        try:
            # 사용자 존재 여부 확인
            existing_user = supabase.table("auth_users").select("*").eq("id", user_id).execute()

            if not existing_user.data or len(existing_user.data) == 0:
                # 사용자가 없으면 자동 생성 (구글 로그인)
                logger.info(f"[AUTH] 구글 로그인 사용자 자동 생성 - user_id: {user_id}")

                new_user = {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "hashed_password": ""  # 구글 로그인은 비밀번호 없음
                }

                create_result = supabase.table("auth_users").insert(new_user).execute()

                if create_result.data and len(create_result.data) > 0:
                    logger.info(f"[AUTH] 구글 로그인 사용자 생성 완료 - user_id: {user_id}")
                else:
                    logger.error(f"[AUTH] 사용자 생성 실패 - user_id: {user_id}")

        except Exception as db_error:
            logger.error(f"[AUTH] DB 작업 중 오류: {str(db_error)}")
            # DB 오류가 있어도 JWT가 유효하면 계속 진행

        # JWT 정보 반환
        return {
            "user_id": user_id,
            "username": username,
            "email": email
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
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """현재 사용자 인증 (Supabase) - 임시 사용자 로직 제거"""
    # 실제 인증만 허용 - 임시 사용자 로직 제거
    return await get_current_user(request, credentials)