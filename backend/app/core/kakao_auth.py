from typing import Dict, Any, Optional
from urllib.parse import urlencode
from app.core.social_auth_base import SocialAuthProvider

class KakaoAuthProvider(SocialAuthProvider):
    """카카오 로그인 제공자"""

    # 카카오 OAuth 엔드포인트
    AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
    TOKEN_URL = "https://kauth.kakao.com/oauth/token"
    USER_INFO_URL = "https://kapi.kakao.com/v2/user/me"

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        카카오 로그인 인가 URL 생성

        Args:
            state: CSRF 방지를 위한 state 파라미터

        Returns:
            카카오 인가 URL
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code"
        }

        if state:
            params["state"] = state

        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """
        인가 코드로 카카오 액세스 토큰 요청

        Args:
            code: 카카오 인가 코드

        Returns:
            {
                "access_token": "액세스 토큰",
                "token_type": "bearer",
                "refresh_token": "리프레시 토큰",
                "expires_in": 만료 시간(초),
                "scope": "동의 항목",
                "refresh_token_expires_in": 리프레시 토큰 만료 시간(초)
            }
        """
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "code": code
        }

        # client_secret이 있는 경우에만 추가 (선택사항)
        if self.client_secret:
            data["client_secret"] = self.client_secret

        headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        return await self._make_request(
            method="POST",
            url=self.TOKEN_URL,
            headers=headers,
            data=data
        )

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        카카오 액세스 토큰으로 사용자 정보 조회

        Args:
            access_token: 카카오 액세스 토큰

        Returns:
            카카오 사용자 정보 (원본 형식)
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        return await self._make_request(
            method="GET",
            url=self.USER_INFO_URL,
            headers=headers
        )

    def normalize_user_info(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        카카오 사용자 정보를 통일된 형식으로 변환

        Args:
            user_info: 카카오로부터 받은 원본 사용자 정보

        Returns:
            정규화된 사용자 정보
        """
        kakao_account = user_info.get("kakao_account", {})
        profile = kakao_account.get("profile", {})

        # 카카오 고유 ID (필수)
        provider_user_id = str(user_info.get("id"))

        # 이메일 (동의한 경우에만 제공)
        email = kakao_account.get("email", "")

        # 닉네임 (기본값: kakao_user_{id})
        nickname = profile.get("nickname", f"kakao_user_{provider_user_id}")

        # 프로필 이미지 (선택)
        profile_image = profile.get("profile_image_url", "")

        # username 생성: 이메일이 있으면 이메일 앞부분, 없으면 닉네임 사용
        if email:
            username = email.split("@")[0]
        else:
            username = nickname

        # username에 provider prefix 추가하여 충돌 방지
        username = f"kakao_{username}_{provider_user_id[:8]}"

        return {
            "provider": "kakao",
            "provider_user_id": provider_user_id,
            "email": email or f"{username}@kakao.temp",  # 이메일이 없으면 임시 이메일 생성
            "username": username,
            "nickname": nickname,
            "profile_image": profile_image
        }

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        리프레시 토큰으로 새로운 액세스 토큰 발급

        Args:
            refresh_token: 카카오 리프레시 토큰

        Returns:
            새로운 토큰 정보
        """
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "refresh_token": refresh_token
        }

        if self.client_secret:
            data["client_secret"] = self.client_secret

        headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        return await self._make_request(
            method="POST",
            url=self.TOKEN_URL,
            headers=headers,
            data=data
        )

    async def unlink(self, access_token: str) -> Dict[str, Any]:
        """
        카카오 계정 연결 해제 (회원 탈퇴)

        Args:
            access_token: 카카오 액세스 토큰

        Returns:
            연결 해제 결과
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

        return await self._make_request(
            method="POST",
            url="https://kapi.kakao.com/v1/user/unlink",
            headers=headers
        )
