from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserCreate, UserLogin, UserResponse, Token
from app.core.security import hash_password_sha256, verify_password_sha256, create_access_token
from app.core.auth import get_current_active_user
from app.core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # 기존 사용자 확인
    db_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    # 새 사용자 생성
    hashed_password = hash_password_sha256(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user or not verify_password_sha256(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """현재 사용자 정보 조회"""
    return current_user

@router.get("/verify")
async def verify_token_endpoint(current_user: User = Depends(get_current_active_user)):
    """토큰 유효성 검증"""
    return {"valid": True, "username": current_user.username}