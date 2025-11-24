"""
Refresh Token 관리 서비스
Supabase Cloud DB에 Refresh Token을 저장하고 관리
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import hashlib
from app.core.config import settings
from supabase import create_client, Client


class RefreshTokenService:
    def __init__(self):
        self.supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

    def _hash_token(self, token: str) -> str:
        """토큰을 SHA-256으로 해싱 (DB에 평문 저장 방지)"""
        return hashlib.sha256(token.encode()).hexdigest()

    async def store_refresh_token(
        self,
        user_id: str,
        refresh_token: str,
        expires_at: datetime,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Refresh Token을 DB에 저장

        Args:
            user_id: 사용자 ID
            refresh_token: Refresh Token (평문)
            expires_at: 만료 시각
            device_info: 디바이스 정보 (선택)
            ip_address: IP 주소 (선택)

        Returns:
            저장된 토큰 정보
        """
        token_hash = self._hash_token(refresh_token)

        data = {
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
            "device_info": device_info,
            "ip_address": ip_address,
            "is_revoked": False
        }

        response = self.supabase.table("refresh_tokens").insert(data).execute()

        if response.data:
            return response.data[0]
        return None

    async def verify_refresh_token(
        self,
        user_id: str,
        refresh_token: str
    ) -> bool:
        """
        Refresh Token의 유효성 검증

        Args:
            user_id: 사용자 ID
            refresh_token: 검증할 Refresh Token

        Returns:
            유효하면 True, 아니면 False
        """
        token_hash = self._hash_token(refresh_token)

        # DB에서 토큰 조회
        response = self.supabase.table("refresh_tokens")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("token_hash", token_hash)\
            .eq("is_revoked", False)\
            .execute()

        if not response.data or len(response.data) == 0:
            return False

        token_data = response.data[0]

        # 만료 시간 확인
        expires_at = datetime.fromisoformat(token_data["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.now(timezone.utc):
            # 만료된 토큰은 자동으로 폐기 처리
            await self.revoke_refresh_token(user_id, refresh_token)
            return False

        return True

    async def revoke_refresh_token(
        self,
        user_id: str,
        refresh_token: str
    ) -> bool:
        """
        Refresh Token 폐기 (로그아웃 등)

        Args:
            user_id: 사용자 ID
            refresh_token: 폐기할 Refresh Token

        Returns:
            성공 시 True
        """
        token_hash = self._hash_token(refresh_token)

        response = self.supabase.table("refresh_tokens")\
            .update({
                "is_revoked": True,
                "revoked_at": datetime.now(timezone.utc).isoformat()
            })\
            .eq("user_id", user_id)\
            .eq("token_hash", token_hash)\
            .execute()

        return response.data is not None

    async def revoke_all_user_tokens(self, user_id: str) -> bool:
        """
        사용자의 모든 Refresh Token 폐기 (모든 기기에서 로그아웃)

        Args:
            user_id: 사용자 ID

        Returns:
            성공 시 True
        """
        response = self.supabase.table("refresh_tokens")\
            .update({
                "is_revoked": True,
                "revoked_at": datetime.now(timezone.utc).isoformat()
            })\
            .eq("user_id", user_id)\
            .eq("is_revoked", False)\
            .execute()

        return response.data is not None

    async def get_user_active_tokens(self, user_id: str) -> list:
        """
        사용자의 활성 토큰 목록 조회

        Args:
            user_id: 사용자 ID

        Returns:
            활성 토큰 목록
        """
        response = self.supabase.table("refresh_tokens")\
            .select("id, device_info, ip_address, created_at, expires_at")\
            .eq("user_id", user_id)\
            .eq("is_revoked", False)\
            .gt("expires_at", datetime.now(timezone.utc).isoformat())\
            .order("created_at", desc=True)\
            .execute()

        return response.data if response.data else []

    async def cleanup_expired_tokens(self) -> int:
        """
        만료된 토큰 정리 (주기적으로 실행)

        Returns:
            삭제된 토큰 개수
        """
        # 30일 이전에 폐기된 토큰 또는 만료된 토큰 삭제
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        response = self.supabase.table("refresh_tokens")\
            .delete()\
            .or_(f"expires_at.lt.{datetime.now(timezone.utc).isoformat()},and(is_revoked.eq.true,revoked_at.lt.{cutoff_date})")\
            .execute()

        return len(response.data) if response.data else 0

    async def rotate_refresh_token(
        self,
        user_id: str,
        old_refresh_token: str,
        new_refresh_token: str,
        expires_at: datetime,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Refresh Token 회전 (기존 토큰 폐기 + 새 토큰 저장)

        Args:
            user_id: 사용자 ID
            old_refresh_token: 기존 Refresh Token
            new_refresh_token: 새로운 Refresh Token
            expires_at: 새 토큰의 만료 시각
            device_info: 디바이스 정보
            ip_address: IP 주소

        Returns:
            성공 시 True
        """
        # 기존 토큰 폐기
        await self.revoke_refresh_token(user_id, old_refresh_token)

        # 새 토큰 저장
        result = await self.store_refresh_token(
            user_id=user_id,
            refresh_token=new_refresh_token,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address
        )

        return result is not None
