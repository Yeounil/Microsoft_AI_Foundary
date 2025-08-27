from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, stocks, news, analysis, recommendations
from app.api import auth_supabase, analysis_supabase, news_supabase

app = FastAPI(
    title="Finance AI Analyzer with Supabase",
    description="AI-powered financial analysis and stock tracking system with Supabase integration",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy SQLite API routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication-legacy"])
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])
app.include_router(news.router, prefix="/api/v1/news", tags=["news-legacy"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis-legacy"])

# New Supabase API routes (recommended)
app.include_router(auth_supabase.router, prefix="/api/v2/auth", tags=["authentication"])
app.include_router(analysis_supabase.router, prefix="/api/v2/analysis", tags=["analysis"])
app.include_router(news_supabase.router, prefix="/api/v2/news", tags=["news"])

# News Recommendation API routes
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])

@app.get("/")
async def root():
    return {"message": "Finance AI Analyzer API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}