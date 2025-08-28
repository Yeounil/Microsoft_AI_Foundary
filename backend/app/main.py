from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import stocks
from app.api import auth_supabase, analysis_supabase, news_supabase, recommendations_supabase

app = FastAPI(
    title="AI Finance News Recommendation System",
    description="AI-powered financial news recommendation and analysis system with Supabase Cloud",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stock data API (still using v1 for compatibility)
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])

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