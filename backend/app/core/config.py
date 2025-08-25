import os
from typing import Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./finance_ai.db")
    
    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Azure OpenAI (Optional)
    azure_openai_endpoint: Optional[str] = os.getenv("AZURE_OPENAI_ENDPOINT")
    azure_openai_key: Optional[str] = os.getenv("AZURE_OPENAI_KEY")
    azure_openai_version: str = os.getenv("AZURE_OPENAI_VERSION", "2023-12-01-preview")
    
    # External APIs
    alpha_vantage_api_key: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    news_api_key: str = os.getenv("NEWS_API_KEY", "")
    
    class Config:
        env_file = ".env"

settings = Settings()