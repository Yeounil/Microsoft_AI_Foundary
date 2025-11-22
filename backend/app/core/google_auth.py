from typing import Dict, Any, Optional
from urllib.parse import urlencode
from app.core.social_auth_base import SocialAuthProvider

class GoogleAuthProvider(SocialAuthProvider):
    """구글 로그인 제공자"""

    # 구글 OAuth 엔드포인트
    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        구글 로그인 인가 URL 생성

        Args:
            state: CSRF 방지를 위한 state 파라미터

        Returns:
            구글 인가 URL
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",  # 필요한 권한
            "access_type": "offline",  # refresh token 획득 (선택)
        }

        if state:
            params["state"] = state

        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """
        인가 코드로 구글 액세스 토큰 요청

        Args:
            code: 구글 인가 코드

        Returns:
            {
                "access_token": "액세스 토큰",
                "token_type": "Bearer",
                "expires_in": 만료 시간(초),
                "scope": "동의 항목",
                "id_token": "ID 토큰" (선택)
            }
        """
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        return await self._make_request(
            method="POST",
            url=self.TOKEN_URL,
            headers=headers,
            data=data
        )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        구글 액세스 토큰으로 사용자 정보 조회

        Args:
            access_token: 구글 액세스 토큰

        Returns:
            구글 사용자 정보 (원본 형식)
        """
        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        return await self._make_request(
            method="GET",
            url=self.USER_INFO_URL,
            headers=headers
        )

    def normalize_user_info(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        구글 사용자 정보를 통일된 형식으로 변환

        Args:
            user_info: 구글로부터 받은 원본 사용자 정보
            예시:
            {
                "id": "1234567890",
                "email": "user@gmail.com",
                "verified_email": true,
                "name": "John Doe",
                "given_name": "John",
                "family_name": "Doe",
                "picture": "https://lh3.googleusercontent.com/...",
                "locale": "ko"
            }

        Returns:
            정규화된 사용자 정보
        """
        # 구글 고유 ID (필수)
        provider_user_id = str(user_info.get("id"))

        # 이메일 (필수)
        email = user_info.get("email", "")

        # 이름 (기본값: google_user_{id})
        name = user_info.get("name", f"google_user_{provider_user_id}")

        # 프로필 이미지 (선택)
        profile_image = user_info.get("picture", "")

        # username 생성: 이메일 앞부분 사용
        if email:
            username = email.split("@")[0]
        else:
            username = name

        # username에 provider prefix 추가하여 충돌 방지
        username = f"google_{username}_{provider_user_id[:8]}"

        return {
            "provider": "google",
            "provider_user_id": provider_user_id,
            "email": email,
            "username": username,
            "nickname": name,
            "profile_image": profile_image
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        리프레시 토큰으로 새로운 액세스 토큰 발급

        Args:
            refresh_token: 구글 리프레시 토큰

        Returns:
            새로운 토큰 정보
        """
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        return await self._make_request(
            method="POST",
            url=self.TOKEN_URL,
            headers=headers,
            data=data
        )

    async def revoke_token(self, token: str) -> Dict[str, Any]:
        """
        구글 토큰 해제 (로그아웃)

        Args:
            token: 구글 액세스 토큰 또는 리프레시 토큰

        Returns:
            해제 결과
        """
        return await self._make_request(
            method="POST",
            url="https://oauth2.googleapis.com/revoke",
            params={"token": token}
        )
