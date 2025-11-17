import os
from typing import Optional
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

class Settings(BaseSettings):
    # Supabase Database
    supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
    supabase_key: Optional[str] = os.getenv("SUPABASE_KEY")
    
    # Legacy Database (SQLite 백업용)
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./finance_ai.db")
    database_api_key: Optional[str] = os.getenv("DATABASE_API_KEY")
    
    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60  # Access token: 1시간
    refresh_token_expire_days: int = 7  # Refresh token: 7일
    
    # OpenAI (GPT-5)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model_name: str = os.getenv("OPENAI_MODEL_NAME", "gpt-5")

    # Anthropic Claude
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    
    # External APIs
    alpha_vantage_api_key: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    news_api_key: str = os.getenv("NEWS_API_KEY", "")
    apify_api_token: str = os.getenv("APIFY_API_TOKEN", "")
    massive_api_key: str = os.getenv("MASSIVE_API_KEY", "")
    
    # Naver API
    naver_client_id: str = os.getenv("NAVER_CLIENT_ID", "")
    naver_client_secret: str = os.getenv("NAVER_CLIENT_SECRET", "")

    # Financial Modeling Prep API
    fmp_api_key: str = os.getenv("FMP_API_KEY", "")

    # Pinecone Vector DB
    pinecone_api_key: Optional[str] = os.getenv("PINECONE_API_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()