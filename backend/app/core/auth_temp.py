from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from typing import Optional
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """현재 인증된 사용자 가져오기 (선택사항)"""
    if not credentials:
        logger.warning("No authentication credentials provided")
        return None
    
    try:
        from app.core.security import verify_token
        username = verify_token(credentials.credentials)
        if username is None:
            logger.warning(f"Invalid token: {credentials.credentials[:20]}...")
            return None
        
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            logger.warning(f"User not found: {username}")
            return None
        
        return user
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None

async def get_current_user_or_create_temp(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """현재 사용자 가져오기 또는 임시 사용자 생성"""
    
    # 인증된 사용자가 있으면 반환
    if credentials:
        try:
            from app.core.security import verify_token
            username = verify_token(credentials.credentials)
            if username:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    return user
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
    
    # 임시 사용자 확인/생성
    temp_user = db.query(User).filter(User.username == "temp_user").first()
    if not temp_user:
        logger.info("Creating temporary user for development")
        from app.core.security import get_password_hash
        temp_user = User(
            username="temp_user",
            email="temp@example.com",
            hashed_password=get_password_hash("temp_password"),
            is_active=True
        )
        db.add(temp_user)
        db.commit()
        db.refresh(temp_user)
        logger.info(f"Temporary user created with ID: {temp_user.id}")
    
    return temp_user