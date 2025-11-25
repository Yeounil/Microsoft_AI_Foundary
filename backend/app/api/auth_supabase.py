from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.services.supabase_user_service import SupabaseUserService, UserCreate, UserLogin, UserResponse
from app.services.supabase_data_service import SupabaseDataService
from app.services.direct_db_service import DirectDBService
from app.services.refresh_token_service import RefreshTokenService
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.core.config import settings
from typing import Dict, Any, Optional
from fastapi.security import HTTPBearer as HTTPBearerClass
import jwt

router = APIRouter()
security = HTTPBearer()

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None  # 쿠키 기반 인증 시 body에서 생략 가능

# 의존성 함수들
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Dict[str, Any]:
    """JWT 토큰에서 현재 사용자 정보 추출 (Authorization 헤더 또는 쿠키)"""
    token = None

    # 1. Authorization 헤더에서 토큰 확인 (우선)
    if credentials and credentials.credentials:
        token = credentials.credentials
    # 2. 쿠키에서 토큰 확인 (fallback)
    elif request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        username = verify_token(token)
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_service = SupabaseUserService()
    user = await user_service.get_user_by_username(username=username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """활성 사용자인지 확인"""
    # 기본적으로 모든 사용자를 활성 상태로 간주 (is_active 필드가 없으므로)
    # 필요시 나중에 is_active 필드를 테이블에 추가할 수 있음
    is_active = current_user.get("is_active", True)  # 기본값을 True로 설정
    if not is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# API 엔드포인트들
@router.post("/register", response_model=Dict[str, Any])
async def register(user: UserCreate):
    """새 사용자 등록"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"회원가입 요청: username={user.username}, email={user.email}")

    direct_service = DirectDBService()
    data_service = SupabaseDataService()

    try:
        # 중복 사용자 확인
        username_exists = await direct_service.check_user_exists(username=user.username)
        if username_exists:
            raise HTTPException(
                status_code=400,
                detail="Username already registered"
            )
        
        email_exists = await direct_service.check_user_exists(email=user.email)
        if email_exists:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # 새 사용자 생성 (RLS 우회)
        new_user = await direct_service.create_user_direct(
            username=user.username,
            email=user.email, 
            password=user.password
        )
        
        if not new_user:
            raise HTTPException(
                status_code=500,
                detail="Failed to create user"
            )
        
        # 사용자 활동 로그 (선택적 - 실패해도 무시)
        try:
            await data_service.log_user_activity(
                user_id=new_user['id'],
                activity_type="user_registration",
                details={"username": user.username, "email": user.email}
            )
        except Exception as log_error:
            # 로그 실패는 무시
            print(f"활동 로그 실패 (무시됨): {log_error}")
        
        return {
            "message": "User created successfully",
            "user": new_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, request: Request, response: Response):
    """사용자 로그인"""
    user_service = SupabaseUserService()
    data_service = SupabaseDataService()
    token_service = RefreshTokenService()

    # username 또는 email 중 하나가 제공되어야 함
    username_or_email = user_credentials.username or user_credentials.email
    if not username_or_email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username or email is required"
        )

    # 사용자 인증
    user = await user_service.authenticate_user(
        username_or_email,
        user_credentials.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 액세스 토큰 및 리프레시 토큰 생성
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

    access_token = create_access_token(
        data={"sub": user['username'], "user_id": user['id']},
        expires_delta=access_token_expires
    )

    refresh_token = create_refresh_token(
        data={"sub": user['username'], "user_id": user['id']},
        expires_delta=refresh_token_expires
    )

    # Refresh Token을 DB에 저장
    try:
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        await token_service.store_refresh_token(
            user_id=user['id'],
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + refresh_token_expires,
            device_info=user_agent,
            ip_address=client_ip
        )
    except Exception as e:
        print(f"Refresh token 저장 실패: {e}")
        # 토큰 저장 실패는 치명적이지 않으므로 계속 진행

    # 로그인 활동 로그 (선택적 - 실패해도 무시)
    try:
        await data_service.log_user_activity(
            user_id=user['id'],
            activity_type="user_login",
            details={"username": user['username']}
        )
    except Exception as log_error:
        # 로그 실패는 무시
        print(f"로그인 활동 로그 실패 (무시됨): {log_error}")

    # HttpOnly 쿠키에 access_token 저장 (SSE 인증용)
    # 개발 환경에서는 secure=False (HTTP 허용)
    import os
    is_production = os.getenv("ENVIRONMENT", "development") == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # JavaScript에서 접근 불가 (XSS 방지)
        secure=is_production,  # 프로덕션에서만 HTTPS 필수
        samesite="lax", # CSRF 방지
        max_age=settings.access_token_expire_minutes * 60,  # 초 단위
        path="/",
        domain=None  # 도메인 제한 없음 (localhost 호환)
    )

    # refresh_token도 HttpOnly 쿠키에 저장
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,  # 7일
        path="/",
        domain=None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=Dict[str, Any])
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """현재 사용자 정보 조회"""
    return {
        "id": current_user['id'],
        "username": current_user['username'],
        "email": current_user['email']
    }

@router.get("/verify")
async def verify_token_endpoint(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """토큰 유효성 검증"""
    return {"valid": True, "username": current_user['username'], "user_id": current_user['id']}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    refresh_request: Optional[RefreshTokenRequest] = None
):
    """리프레시 토큰을 사용하여 새로운 액세스 토큰 발급

    refresh_token은 다음 순서로 확인:
    1. Request body (하위 호환성)
    2. HttpOnly 쿠키
    """
    import logging
    logger = logging.getLogger(__name__)

    user_service = SupabaseUserService()
    token_service = RefreshTokenService()

    # refresh_token 가져오기: body > cookie
    current_refresh_token = None
    if refresh_request and refresh_request.refresh_token:
        current_refresh_token = refresh_request.refresh_token
    elif request.cookies.get("refresh_token"):
        current_refresh_token = request.cookies.get("refresh_token")

    if not current_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 리프레시 토큰 JWT 검증
    try:
        username = verify_token(current_refresh_token, token_type="refresh")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        logger.warning("Refresh token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid refresh token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 사용자 정보 조회
    user = await user_service.get_user_by_username(username=username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # DB에서 Refresh Token 검증
    try:
        is_valid = await token_service.verify_refresh_token(
            user_id=user['id'],
            refresh_token=current_refresh_token
        )

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token DB verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 새로운 액세스 토큰 및 리프레시 토큰 생성
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.refresh_token_expire_days)

    new_access_token = create_access_token(
        data={"sub": user['username'], "user_id": user['id']},
        expires_delta=access_token_expires
    )

    new_refresh_token = create_refresh_token(
        data={"sub": user['username'], "user_id": user['id']},
        expires_delta=refresh_token_expires
    )

    # Refresh Token 회전 (기존 토큰 폐기 + 새 토큰 저장)
    try:
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        await token_service.rotate_refresh_token(
            user_id=user['id'],
            old_refresh_token=current_refresh_token,
            new_refresh_token=new_refresh_token,
            expires_at=datetime.now(timezone.utc) + refresh_token_expires,
            device_info=user_agent,
            ip_address=client_ip
        )
    except Exception as e:
        print(f"Refresh token 회전 실패: {e}")

    # HttpOnly 쿠키에 새 토큰 설정
    import os
    is_production = os.getenv("ENVIRONMENT", "development") == "production"

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        domain=None
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
        domain=None
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.put("/profile")
async def update_profile(
    update_data: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 프로필 업데이트"""
    user_service = SupabaseUserService()
    data_service = SupabaseDataService()
    
    # 비밀번호 필드는 별도 처리 필요
    allowed_fields = ["email"]  # 업데이트 가능한 필드만 허용
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=400,
            detail="No valid fields to update"
        )
    
    updated_user = await user_service.update_user(current_user['id'], filtered_data)
    if not updated_user:
        raise HTTPException(
            status_code=500,
            detail="Failed to update profile"
        )
    
    # 활동 로그 (선택적)
    try:
        await data_service.log_user_activity(
            user_id=current_user['id'],
            activity_type="profile_update",
            details={"updated_fields": list(filtered_data.keys())}
        )
    except Exception as log_error:
        print(f"프로필 업데이트 로그 실패 (무시됨): {log_error}")
    
    return {
        "message": "Profile updated successfully",
        "user": updated_user
    }

@router.get("/profile")
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """사용자 프로필 조회"""
    user_service = SupabaseUserService()
    
    profile = await user_service.get_user_profile(current_user['id'])
    
    return {
        "user": current_user,
        "profile": profile
    }

@router.put("/profile")
async def update_user_profile(
    profile_data: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 프로필 업데이트"""
    user_service = SupabaseUserService()
    
    # 프로필이 없으면 생성, 있으면 업데이트
    existing_profile = await user_service.get_user_profile(current_user['id'])
    
    if existing_profile:
        updated_profile = await user_service.update_user_profile(
            current_user['id'], 
            profile_data
        )
    else:
        from app.services.supabase_user_service import UserProfileCreate
        profile_create = UserProfileCreate(**profile_data)
        updated_profile = await user_service.create_user_profile(
            current_user['id'], 
            profile_create
        )
    
    return {
        "message": "Profile updated successfully",
        "profile": updated_profile
    }

@router.get("/interests")
async def get_user_interests(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """사용자 관심사 조회"""
    user_service = SupabaseUserService()
    
    interests = await user_service.get_user_interests(current_user['id'])
    
    return {
        "interests": interests,
        "total_count": len(interests)
    }

@router.post("/interests")
async def add_user_interest(
    interest_data: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 관심사 추가"""
    user_service = SupabaseUserService()
    
    interest = await user_service.add_user_interest(
        current_user['id'],
        interest_data['interest']
    )
    
    if not interest:
        raise HTTPException(status_code=500, detail="Failed to add interest")
    
    return {
        "message": "Interest added successfully",
        "interest": interest
    }

@router.delete("/interests/{interest_id}")
async def remove_user_interest(
    interest_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """사용자 관심사 제거"""
    user_service = SupabaseUserService()

    success = await user_service.remove_user_interest(
        current_user['id'],
        interest_id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Interest not found")

    return {"message": "Interest removed successfully"}

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    refresh_request: Optional[RefreshTokenRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """로그아웃 - Refresh Token 폐기 및 쿠키 삭제

    refresh_token은 다음 순서로 확인:
    1. Request body (하위 호환성)
    2. HttpOnly 쿠키
    """
    token_service = RefreshTokenService()

    # refresh_token 가져오기: body > cookie
    refresh_token = None
    if refresh_request and refresh_request.refresh_token:
        refresh_token = refresh_request.refresh_token
    elif request.cookies.get("refresh_token"):
        refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        try:
            await token_service.revoke_refresh_token(
                user_id=current_user['id'],
                refresh_token=refresh_token
            )
        except Exception as e:
            print(f"Logout token revoke failed: {e}")

    # HttpOnly 쿠키 삭제
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

    return {"message": "Logged out successfully"}

@router.post("/logout-all")
async def logout_all(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """모든 기기에서 로그아웃 - 사용자의 모든 Refresh Token 폐기"""
    token_service = RefreshTokenService()

    try:
        await token_service.revoke_all_user_tokens(user_id=current_user['id'])
    except Exception as e:
        print(f"Logout all failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to logout from all devices")

    return {"message": "Logged out from all devices successfully"}

@router.get("/sessions")
async def get_active_sessions(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """사용자의 활성 세션 목록 조회"""
    token_service = RefreshTokenService()

    try:
        sessions = await token_service.get_user_active_tokens(user_id=current_user['id'])
        return {
            "total_sessions": len(sessions),
            "sessions": sessions
        }
    except Exception as e:
        print(f"Get sessions failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")