from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx

class SocialAuthProvider(ABC):
    """소셜 로그인 제공자의 추상 베이스 클래스"""

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    @abstractmethod
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        소셜 로그인 인가 URL 생성

        Args:
            state: CSRF 방지를 위한 state 파라미터

        Returns:
            인가 URL
        """
        pass

    @abstractmethod
    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """
        인가 코드로 액세스 토큰 요청

        Args:
            code: 인가 코드

        Returns:
            액세스 토큰 정보 (access_token, token_type, expires_in 등)
        """
        pass

    @abstractmethod
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        액세스 토큰으로 사용자 정보 조회

        Args:
            access_token: 소셜 로그인 액세스 토큰

        Returns:
            사용자 정보 (provider별로 형식이 다를 수 있음)
        """
        pass

    @abstractmethod
    def normalize_user_info(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        제공자별 사용자 정보를 통일된 형식으로 변환

        Args:
            user_info: 제공자로부터 받은 원본 사용자 정보

        Returns:
            정규화된 사용자 정보 {
                "provider": "kakao/google/naver",
                "provider_user_id": "고유 ID",
                "email": "이메일",
                "username": "사용자명",
                "profile_image": "프로필 이미지 URL (optional)"
            }
        """
        pass

    async def _make_request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        HTTP 요청 헬퍼 메서드

        Args:
            method: HTTP 메서드 (GET, POST 등)
            url: 요청 URL
            headers: 요청 헤더
            data: 요청 바디 (form data)
            params: URL 쿼리 파라미터

        Returns:
            JSON 응답
        """
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                data=data,
                params=params
            )
            response.raise_for_status()
            return response.json()
