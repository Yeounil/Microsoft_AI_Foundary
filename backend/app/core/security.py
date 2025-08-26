import hashlib
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password_sha256(password: str) -> str:
    """SHA-256으로 비밀번호 해싱"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password_sha256(plain_password: str, hashed_password: str) -> bool:
    """SHA-256 해싱된 비밀번호 검증"""
    return hash_password_sha256(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT 액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None

# Supabase용 함수들 (passlib 사용)
def get_password_hash(password: str) -> str:
    """passlib을 사용한 비밀번호 해싱"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """passlib을 사용한 비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)