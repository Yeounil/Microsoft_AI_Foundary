from supabase import create_client, Client
from app.core.config import settings
from typing import Optional

class SupabaseClient:
    """Supabase 클라이언트 싱글톤"""
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Supabase 클라이언트 인스턴스 반환"""
        if cls._instance is None:
            if not settings.supabase_url or not settings.supabase_key:
                raise ValueError("SUPABASE_URL과 SUPABASE_KEY가 환경변수에 설정되어야 합니다.")
            
            cls._instance = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
        return cls._instance

def get_supabase() -> Client:
    """의존성 주입용 Supabase 클라이언트 반환"""
    return SupabaseClient.get_client()