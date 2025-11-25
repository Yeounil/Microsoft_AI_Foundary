import sys
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime
from typing import Dict, Any

# Windows에서 Playwright subprocess 지원을 위한 Event Loop Policy 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    print(f"[WINDOWS] Event loop policy set to: {asyncio.get_event_loop_policy().__class__.__name__}")

from app.core.config import settings
from app.api import stocks, stock_data
from app.api import auth_supabase, social_auth, analysis_supabase, news_supabase, recommendations_supabase, news_v1, analysis_v1, embeddings, websocket_realtime, news_ai_score, news_translation, news_report_v1, pdf, subscriptions, notifications_sse
from app.services.news_scheduler import get_scheduler
from app.db.supabase_client import get_supabase

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
    logger.info("[STARTUP] AI Finance News Recommendation System starting")
    logger.info("=" * 60)
    logger.info(f"[CONFIG] SECRET_KEY: {settings.secret_key[:10]}... (length: {len(settings.secret_key)})")
    logger.info(f"[CONFIG] ALGORITHM: {settings.algorithm}")
    logger.info(f"[CONFIG] ACCESS_TOKEN_EXPIRE: {settings.access_token_expire_minutes} minutes")

    # 뉴스 크롤링 스케줄러 시작
    try:
        scheduler = get_scheduler()
        await scheduler.start()
        logger.info("[OK] News crawling scheduler started successfully")
    except Exception as e:
        logger.error(f"[ERROR] Scheduler startup failed: {str(e)}")

    yield

    # 종료 시
    logger.info("[SHUTDOWN] Server shutting down...")
    try:
        scheduler = get_scheduler()
        await scheduler.stop()
        logger.info("[OK] Scheduler shut down gracefully")
    except Exception as e:
        logger.error(f"[ERROR] Scheduler shutdown failed: {str(e)}")

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
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Stock data API (still using v1 for compatibility)
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])

# v1 APIs (for frontend compatibility)
app.include_router(news_v1.router, prefix="/api/v1/news", tags=["news-v1"])
app.include_router(analysis_v1.router, prefix="/api/v1/analysis", tags=["analysis-v1"])
app.include_router(news_report_v1.router, prefix="/api/v1/news-report", tags=["news-report-v1"])

# Main Supabase API routes
app.include_router(auth_supabase.router, prefix="/api/v2/auth", tags=["authentication"])
app.include_router(social_auth.router, prefix="/api/v2/social-auth", tags=["social-authentication"])
app.include_router(analysis_supabase.router, prefix="/api/v2/analysis", tags=["analysis"])
app.include_router(news_supabase.router, prefix="/api/v2/news", tags=["news"])
app.include_router(recommendations_supabase.router, prefix="/api/v2/recommendations", tags=["recommendations"])

# Financial Embeddings API (Pinecone)
app.include_router(embeddings.router, prefix="/api/v2/embeddings", tags=["embeddings"])

# RAG (Retrieval Augmented Generation) API - 제거됨: GPT-5 사용 최소화
# app.include_router(rag.router, prefix="/api/v2/rag", tags=["rag"])

# Real-time WebSocket API (FMP)
app.include_router(websocket_realtime.router, prefix="/api/v2/realtime", tags=["realtime"])

# News AI Score API (GPT-5 기반 뉴스 영향도 평가)
app.include_router(news_ai_score.router, prefix="/api/v2/news-ai-score", tags=["news-ai-score"])

# News Translation API (Claude Sonnet API 기반 뉴스 번역)
app.include_router(news_translation.router, prefix="/api/v2/news-translation", tags=["news-translation"])

# PDF Generation API
app.include_router(pdf.router, prefix="/api/v2/pdf", tags=["pdf"])

# Email Subscription API
app.include_router(subscriptions.router, prefix="/api/v2/subscriptions", tags=["subscriptions"])

# SSE Notifications API
app.include_router(notifications_sse.router, prefix="/api/v1/notifications", tags=["notifications"])

# Stock Data Collection API
app.include_router(stock_data.router)

@app.get("/")
async def root():
    return {"message": "AI Finance News Recommendation System", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    """기본 헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """상세 헬스 체크 - 모든 의존성 확인"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "services": {}
    }

    # 1. API 서버 상태
    health_status["services"]["api_server"] = {
        "status": "running",
        "message": "FastAPI server is running"
    }

    # 2. Supabase 데이터베이스 연결 확인
    try:
        supabase = get_supabase()
        # 간단한 쿼리로 연결 확인
        result = supabase.table("users").select("id").limit(1).execute()
        health_status["services"]["supabase_db"] = {
            "status": "connected",
            "message": "Successfully connected to Supabase database"
        }
    except Exception as e:
        health_status["services"]["supabase_db"] = {
            "status": "error",
            "message": f"Supabase connection failed: {str(e)}"
        }
        health_status["status"] = "degraded"

    # 3. 뉴스 크롤링 스케줄러 상태
    try:
        scheduler = get_scheduler()
        health_status["services"]["news_scheduler"] = {
            "status": "running" if scheduler.is_running else "stopped",
            "message": "News scheduler is " + ("running" if scheduler.is_running else "stopped")
        }
    except Exception as e:
        health_status["services"]["news_scheduler"] = {
            "status": "error",
            "message": f"Scheduler check failed: {str(e)}"
        }

    # 4. 설정 확인
    health_status["services"]["configuration"] = {
        "api_keys": {
            "openai": "configured" if settings.openai_api_key else "missing",
            "fmp": "configured" if settings.fmp_api_key else "missing",
            "apify": "configured" if settings.apify_api_token else "missing",
            "supabase": "configured" if settings.supabase_url and settings.supabase_key else "missing"
        }
    }

    # 5. 시스템 정보
    import os
    health_status["system"] = {
        "uptime": "running",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

    return health_status

@app.get("/health/services")
async def check_services() -> Dict[str, Any]:
    """각 서비스별 상태 체크"""
    services_status = {
        "timestamp": datetime.now().isoformat(),
        "services": {}
    }

    # Supabase 상태
    try:
        supabase = get_supabase()
        supabase.table("users").select("id").limit(1).execute()
        services_status["services"]["supabase"] = "✅ Connected"
    except Exception as e:
        services_status["services"]["supabase"] = f"❌ Error: {str(e)}"

    # API Keys 상태
    services_status["api_keys"] = {
        "openai": "✅ Configured" if settings.openai_api_key else "⚠️ Missing",
        "fmp": "✅ Configured" if settings.fmp_api_key else "⚠️ Missing",
        "apify": "✅ Configured" if settings.apify_api_token else "⚠️ Missing",
        "supabase": "✅ Configured" if settings.supabase_url else "⚠️ Missing"
    }

    # 스케줄러 상태
    try:
        scheduler = get_scheduler()
        services_status["services"]["scheduler"] = {
            "status": "✅ Running" if scheduler.is_running else "⚠️ Stopped",
            "is_running": scheduler.is_running
        }
    except Exception as e:
        services_status["services"]["scheduler"] = f"❌ Error: {str(e)}"

    return services_status

