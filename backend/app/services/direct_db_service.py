import httpx
import json
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.security import get_password_hash
import logging

logger = logging.getLogger(__name__)

class DirectDBService:
    """RLS를 우회하여 직접 Supabase REST API를 호출하는 서비스"""
    
    def __init__(self):
        self.supabase_url = settings.supabase_url
        self.supabase_key = settings.supabase_key
        self.api_url = f"{self.supabase_url}/rest/v1"
        
    async def create_user_direct(self, username: str, email: str, password: str) -> Optional[Dict[str, Any]]:
        """RLS를 우회하여 사용자를 직접 생성"""
        try:
            # 비밀번호 해시화
            hashed_password = get_password_hash(password)
            
            # 사용자 데이터 준비 (UUID 수동 생성)
            user_data = {
                "id": str(uuid.uuid4()),  # UUID 수동 생성
                "username": username,
                "email": email,
                "hashed_password": hashed_password
            }
            
            # HTTP 요청 헤더 설정
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            
            # 직접 HTTP POST 요청
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/auth_users",
                    json=user_data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        user = result[0]
                        # 비밀번호 제거
                        if 'hashed_password' in user:
                            del user['hashed_password']
                        return user
                    elif isinstance(result, dict):
                        if 'hashed_password' in result:
                            del result['hashed_password']
                        return result
                else:
                    logger.error(f"직접 사용자 생성 실패: {response.status_code} - {response.text}")
                    
                    # 에러 메시지 파싱
                    try:
                        error_data = response.json()
                        if isinstance(error_data, dict):
                            error_message = error_data.get('message', 'Unknown error')
                            if 'duplicate key' in error_message.lower():
                                if 'username' in error_message.lower():
                                    raise Exception("Username already registered")
                                elif 'email' in error_message.lower():
                                    raise Exception("Email already registered")
                            raise Exception(error_message)
                    except json.JSONDecodeError:
                        raise Exception(f"HTTP {response.status_code}: {response.text}")
                        
        except httpx.TimeoutException:
            logger.error("직접 DB 요청 타임아웃")
            raise Exception("데이터베이스 연결 타임아웃")
        except httpx.RequestError as e:
            logger.error(f"직접 DB 요청 오류: {str(e)}")
            raise Exception("데이터베이스 연결 오류")
        except Exception as e:
            logger.error(f"직접 사용자 생성 중 오류: {str(e)}")
            raise
            
        return None
    
    async def check_user_exists(self, username: str = None, email: str = None) -> bool:
        """사용자 존재 확인 (중복 검사용)"""
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            query_params = []
            if username:
                query_params.append(f"username=eq.{username}")
            if email:
                query_params.append(f"email=eq.{email}")
            
            query_string = "&".join(query_params) if query_params else ""
            url = f"{self.api_url}/auth_users?select=id&{query_string}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    result = response.json()
                    return len(result) > 0
                else:
                    logger.warning(f"사용자 존재 확인 실패: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"사용자 존재 확인 중 오류: {str(e)}")
            return False

    async def get_user_by_social(self, provider: str, provider_user_id: str) -> Optional[Dict[str, Any]]:
        """소셜 로그인 제공자와 사용자 ID로 사용자 조회"""
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }

            # provider와 provider_user_id로 조회
            url = f"{self.api_url}/auth_users?provider=eq.{provider}&provider_user_id=eq.{provider_user_id}&select=*"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)

                if response.status_code == 200:
                    result = response.json()
                    if len(result) > 0:
                        user = result[0]
                        # 비밀번호 제거
                        if 'hashed_password' in user:
                            del user['hashed_password']
                        return user
                    return None
                else:
                    logger.warning(f"소셜 사용자 조회 실패: {response.status_code}")
                    return None

        except Exception as e:
            logger.error(f"소셜 사용자 조회 중 오류: {str(e)}")
            return None

    async def create_social_user_direct(
        self,
        username: str,
        email: str,
        provider: str,
        provider_user_id: str,
        profile_image: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """소셜 로그인 사용자를 직접 생성 (비밀번호 없음)"""
        try:
            # 소셜 로그인 사용자는 비밀번호가 없으므로 임의의 해시값 생성
            # 실제로는 로그인에 사용되지 않음
            dummy_password_hash = get_password_hash(str(uuid.uuid4()))

            # 사용자 데이터 준비
            user_data = {
                "id": str(uuid.uuid4()),
                "username": username,
                "email": email,
                "hashed_password": dummy_password_hash,
                "provider": provider,
                "provider_user_id": provider_user_id,
                "profile_image": profile_image
            }

            # HTTP 요청 헤더 설정
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }

            # 직접 HTTP POST 요청
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/auth_users",
                    json=user_data,
                    headers=headers,
                    timeout=30.0
                )

                if response.status_code == 201:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        user = result[0]
                        # 비밀번호 제거
                        if 'hashed_password' in user:
                            del user['hashed_password']
                        return user
                    elif isinstance(result, dict):
                        if 'hashed_password' in result:
                            del result['hashed_password']
                        return result
                else:
                    logger.error(f"소셜 사용자 생성 실패: {response.status_code} - {response.text}")

                    # 에러 메시지 파싱
                    try:
                        error_data = response.json()
                        if isinstance(error_data, dict):
                            error_message = error_data.get('message', 'Unknown error')
                            if 'duplicate key' in error_message.lower():
                                if 'username' in error_message.lower():
                                    raise Exception("Username already registered")
                                elif 'email' in error_message.lower():
                                    raise Exception("Email already registered")
                            raise Exception(error_message)
                    except json.JSONDecodeError:
                        raise Exception(f"HTTP {response.status_code}: {response.text}")

        except httpx.TimeoutException:
            logger.error("소셜 사용자 생성 타임아웃")
            raise Exception("데이터베이스 연결 타임아웃")
        except httpx.RequestError as e:
            logger.error(f"소셜 사용자 생성 요청 오류: {str(e)}")
            raise Exception("데이터베이스 연결 오류")
        except Exception as e:
            logger.error(f"소셜 사용자 생성 중 오류: {str(e)}")
            raise

        return None