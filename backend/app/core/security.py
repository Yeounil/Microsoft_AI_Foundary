import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings

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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT 리프레시 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """JWT 토큰 검증하여 username 반환"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        # 토큰 타입 확인
        if payload.get("type") != token_type:
            return None
        username: str = payload.get("sub")
        return username
    except JWTError:
        return None

# Supabase용 함수들 (bcrypt 직접 사용)
def get_password_hash(password: str) -> str:
    """bcrypt를 사용한 비밀번호 해싱"""
    # 비밀번호를 바이트로 변환
    password_bytes = password.encode('utf-8')

    # bcrypt는 72바이트 제한이 있으므로, 긴 비밀번호는 SHA-256으로 먼저 해싱
    if len(password_bytes) > 72:
        password_bytes = hashlib.sha256(password_bytes).hexdigest().encode('utf-8')

    # salt 생성 및 해싱
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 문자열로 변환하여 반환
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """bcrypt를 사용한 비밀번호 검증"""
    try:
        # 비밀번호를 바이트로 변환
        password_bytes = plain_password.encode('utf-8')

        # 긴 비밀번호는 SHA-256으로 먼저 해싱
        if len(password_bytes) > 72:
            password_bytes = hashlib.sha256(password_bytes).hexdigest().encode('utf-8')

        # 해시된 비밀번호를 바이트로 변환
        hashed_bytes = hashed_password.encode('utf-8')

        # 검증
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False