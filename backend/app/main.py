from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, stocks, news, analysis

app = FastAPI(
    title="Finance AI Analyzer",
    description="AI-powered financial analysis and stock tracking system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])
app.include_router(news.router, prefix="/api/v1/news", tags=["news"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])

@app.get("/")
async def root():
    return {"message": "Finance AI Analyzer API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}