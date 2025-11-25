from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, HTTPException, status, Request, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
import os

from app.core.config import settings
from app.core.kakao_auth import KakaoAuthProvider
from app.core.google_auth import GoogleAuthProvider
from app.core.security import create_access_token, create_refresh_token
from app.services.direct_db_service import DirectDBService
from app.services.supabase_data_service import SupabaseDataService
from app.services.refresh_token_service import RefreshTokenService

router = APIRouter()
logger = logging.getLogger(__name__)


class SocialLoginRequest(BaseModel):
    """소셜 로그인 요청"""
    code: str  # 인가 코드
    state: Optional[str] = None  # CSRF 방지용 state


class Token(BaseModel):
    """토큰 응답"""
    access_token: str
    refresh_token: str
    token_type: str


# 소셜 로그인 제공자 팩토리
def get_social_provider(provider: str):
    """소셜 로그인 제공자 인스턴스 생성"""
    if provider == "kakao":
        return KakaoAuthProvider(
            client_id=settings.kakao_client_id,
            client_secret=settings.kakao_client_secret,
            redirect_uri=settings.kakao_redirect_uri
        )
    elif provider == "google":
        return GoogleAuthProvider(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            redirect_uri=settings.google_redirect_uri
        )
    elif provider == "naver":
        # Naver 제공자는 나중에 구현
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Naver login is not implemented yet"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )


@router.get("/{provider}/authorize")
async def get_authorization_url(provider: str, state: Optional[str] = None):
    """
    소셜 로그인 인가 URL 조회

    Args:
        provider: 소셜 로그인 제공자 (kakao, google, naver)
        state: CSRF 방지용 state 파라미터

    Returns:
        인가 URL
    """
    try:
        social_provider = get_social_provider(provider)
        auth_url = social_provider.get_authorization_url(state=state)

        return {
            "provider": provider,
            "authorization_url": auth_url
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"인가 URL 생성 실패 ({provider}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.post("/{provider}/login", response_model=Token)
async def social_login(provider: str, login_request: SocialLoginRequest, request: Request, response: Response):
    """
    소셜 로그인 처리

    Args:
        provider: 소셜 로그인 제공자 (kakao, google, naver)
        login_request: 인가 코드 및 state

    Returns:
        자체 JWT 토큰 (access_token, refresh_token)
    """
    logger.info(f"{provider} 소셜 로그인 시작")

    try:
        # 1. 소셜 로그인 제공자 초기화
        social_provider = get_social_provider(provider)

        # 2. 인가 코드로 소셜 액세스 토큰 획득
        token_data = await social_provider.get_access_token(login_request.code)
        social_access_token = token_data.get("access_token")

        if not social_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from provider"
            )

        # 3. 소셜 액세스 토큰으로 사용자 정보 조회
        social_user_info = await social_provider.get_user_info(social_access_token)

        # 4. 사용자 정보 정규화
        normalized_user = social_provider.normalize_user_info(social_user_info)

        logger.info(f"정규화된 사용자 정보: provider={normalized_user['provider']}, "
                    f"provider_user_id={normalized_user['provider_user_id']}, "
                    f"email={normalized_user['email']}")

        # 5. DB에서 사용자 조회 (provider + provider_user_id)
        direct_service = DirectDBService()
        existing_user = await direct_service.get_user_by_social(
            provider=normalized_user['provider'],
            provider_user_id=normalized_user['provider_user_id']
        )

        # 6. 사용자가 없으면 새로 생성
        if not existing_user:
            logger.info(f"신규 {provider} 사용자 생성")

            # username 중복 방지: 이미 존재하면 숫자 추가
            username = normalized_user['username']
            counter = 1
            while await direct_service.check_user_exists(username=username):
                username = f"{normalized_user['username']}_{counter}"
                counter += 1

            # 이메일 중복 체크
            if await direct_service.check_user_exists(email=normalized_user['email']):
                # 이미 다른 방법(일반 회원가입 등)으로 가입된 이메일
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already registered with another method"
                )

            existing_user = await direct_service.create_social_user_direct(
                username=username,
                email=normalized_user['email'],
                provider=normalized_user['provider'],
                provider_user_id=normalized_user['provider_user_id'],
                profile_image=normalized_user.get('profile_image')
            )

            if not existing_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )

            # 활동 로그 (선택적)
            try:
                data_service = SupabaseDataService()
                await data_service.log_user_activity(
                    user_id=existing_user['id'],
                    activity_type="social_user_registration",
                    details={
                        "provider": provider,
                        "username": existing_user['username'],
                        "email": existing_user['email']
                    }
                )
            except Exception as log_error:
                logger.warning(f"활동 로그 실패 (무시됨): {log_error}")

        # 7. 자체 JWT 토큰 생성
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

        access_token = create_access_token(
            data={"sub": existing_user['username'], "user_id": existing_user['id']},
            expires_delta=access_token_expires
        )

        refresh_token = create_refresh_token(
            data={"sub": existing_user['username'], "user_id": existing_user['id']},
            expires_delta=refresh_token_expires
        )

        # 8. Refresh Token을 DB에 저장
        try:
            token_service = RefreshTokenService()
            client_ip = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

            await token_service.store_refresh_token(
                user_id=existing_user['id'],
                refresh_token=refresh_token,
                expires_at=datetime.now(timezone.utc) + refresh_token_expires,
                device_info=user_agent,
                ip_address=client_ip
            )
        except Exception as e:
            logger.warning(f"Refresh token 저장 실패 (무시됨): {e}")

        # 9. 로그인 활동 로그 (선택적)
        try:
            data_service = SupabaseDataService()
            await data_service.log_user_activity(
                user_id=existing_user['id'],
                activity_type="social_login",
                details={
                    "provider": provider,
                    "username": existing_user['username']
                }
            )
        except Exception as log_error:
            logger.warning(f"로그인 활동 로그 실패 (무시됨): {log_error}")

        logger.info(f"{provider} 소셜 로그인 성공: user_id={existing_user['id']}")

        # HttpOnly 쿠키에 토큰 저장
        is_production = os.getenv("ENVIRONMENT", "development") == "production"

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=is_production,
            samesite="lax",
            max_age=settings.access_token_expire_minutes * 60,
            path="/",
            domain=None
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_production,
            samesite="lax",
            max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
            path="/",
            domain=None
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"{provider} 소셜 로그인 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Social login failed: {str(e)}"
        )


@router.get("/{provider}/user-info")
async def get_social_user_info(provider: str, access_token: str):
    """
    소셜 로그인 액세스 토큰으로 사용자 정보 조회 (디버깅/테스트용)

    Args:
        provider: 소셜 로그인 제공자
        access_token: 소셜 로그인 액세스 토큰

    Returns:
        소셜 제공자의 사용자 정보 (원본 + 정규화)
    """
    try:
        social_provider = get_social_provider(provider)
        raw_user_info = await social_provider.get_user_info(access_token)
        normalized_user_info = social_provider.normalize_user_info(raw_user_info)

        return {
            "provider": provider,
            "raw": raw_user_info,
            "normalized": normalized_user_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정보 조회 실패 ({provider}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )
