#!/usr/bin/env python3
"""
테스트용 JWT 토큰 생성 스크립트
"""

from datetime import datetime, timedelta
from jose import jwt

# 백엔드 설정과 동일한 값 사용
SECRET_KEY = "your_super_secret_key_change_this_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_test_token(username: str = "temp_user") -> str:
    """테스트용 JWT 토큰 생성"""
    to_encode = {"sub": username}
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

if __name__ == "__main__":
    token = create_test_token()
    print("테스트용 JWT 토큰:")
    print(token)
    print("\n프론트엔드에서 이 토큰을 localStorage에 저장하세요:")
    print(f"localStorage.setItem('token', '{token}');")