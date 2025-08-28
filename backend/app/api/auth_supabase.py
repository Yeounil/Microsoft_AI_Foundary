from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.services.supabase_user_service import SupabaseUserService, UserCreate, UserLogin, UserResponse
from app.services.supabase_data_service import SupabaseDataService
from app.services.direct_db_service import DirectDBService
from app.core.security import create_access_token, verify_token
from app.core.config import settings
from typing import Dict, Any, Optional
import jwt

router = APIRouter()
security = HTTPBearer()

class Token(BaseModel):
    access_token: str
    token_type: str

# 의존성 함수들
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """JWT 토큰에서 현재 사용자 정보 추출"""
    try:
        username = verify_token(credentials.credentials)
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
async def login(user_credentials: UserLogin):
    """사용자 로그인"""
    user_service = SupabaseUserService()
    data_service = SupabaseDataService()
    
    # 사용자 인증
    user = await user_service.authenticate_user(
        user_credentials.username, 
        user_credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 액세스 토큰 생성
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user['username'], "user_id": user['id']},
        expires_delta=access_token_expires
    )
    
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
    
    return {"access_token": access_token, "token_type": "bearer"}

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