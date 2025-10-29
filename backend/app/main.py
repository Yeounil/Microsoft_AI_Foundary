from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.api import stocks
from app.api import auth_supabase, analysis_supabase, news_supabase, recommendations_supabase, news_v1, analysis_v1
from app.services.news_scheduler import get_scheduler

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작과 종료 시 실행될 작업"""
    # 시작 시
    logger.info("=" * 60)
    logger.info("🚀 AI Finance News Recommendation System 시작")
    logger.info("=" * 60)

    # 뉴스 크롤링 스케줄러 시작
    try:
        scheduler = get_scheduler()
        await scheduler.start()
        logger.info("✅ 뉴스 크롤링 스케줄러 시작 완료")
    except Exception as e:
        logger.error(f"❌ 스케줄러 시작 실패: {str(e)}")

    yield

    # 종료 시
    logger.info("🛑 서버 종료 중...")
    try:
        scheduler = get_scheduler()
        await scheduler.stop()
        logger.info("✅ 스케줄러 정상 종료")
    except Exception as e:
        logger.error(f"❌ 스케줄러 종료 실패: {str(e)}")

app = FastAPI(
    title="AI Finance News Recommendation System",
    description="AI-powered financial news recommendation and analysis system with Supabase Cloud",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://*.web.app",
        "https://*.firebaseapp.com",
        "*"  # 프로덕션에서는 구체적인 도메인으로 변경 필요
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stock data API (still using v1 for compatibility)
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])

# v1 APIs (for frontend compatibility)
app.include_router(news_v1.router, prefix="/api/v1/news", tags=["news-v1"])
app.include_router(analysis_v1.router, prefix="/api/v1/analysis", tags=["analysis-v1"])

# Main Supabase API routes
app.include_router(auth_supabase.router, prefix="/api/v2/auth", tags=["authentication"])
app.include_router(analysis_supabase.router, prefix="/api/v2/analysis", tags=["analysis"])
app.include_router(news_supabase.router, prefix="/api/v2/news", tags=["news"])
app.include_router(recommendations_supabase.router, prefix="/api/v2/recommendations", tags=["recommendations"])

@app.get("/")
async def root():
    return {"message": "AI Finance News Recommendation System", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

