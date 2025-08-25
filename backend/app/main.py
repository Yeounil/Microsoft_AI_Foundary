import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.api import auth, stocks, news, analysis

app = FastAPI(
    title="Finance AI Analyzer",
    description="AI-powered financial analysis and stock tracking system",
    version="1.0.0",
)

# CORS 설정 - 운영 환경에서는 더 제한적으로 설정
allowed_origins = [
    "http://localhost:3000",  # 개발용
    "https://*.azurewebsites.net",  # Azure Web App
]

if os.getenv("ENVIRONMENT") == "production":
    # 운영 환경에서는 실제 도메인 추가
    allowed_origins.extend([
        "https://your-domain.com",
        "https://www.your-domain.com"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])
app.include_router(news.router, prefix="/api/v1/news", tags=["news"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])

# 정적 파일 서빙 (React 앱)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    @app.get("/")
    async def serve_spa():
        """React SPA 메인 페이지 서빙"""
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Finance AI Analyzer API", "version": "1.0.0"}
    
    # React Router를 위한 catch-all 라우트
    @app.get("/{full_path:path}")
    async def serve_spa_routes(full_path: str):
        """React Router SPA를 위한 모든 경로 처리"""
        # API 경로는 제외
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # 정적 파일 요청 처리
        if full_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Static file not found")
            
        # 모든 다른 경로는 React 앱으로 전달
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not found")
else:
    @app.get("/")
    async def root():
        """API 전용 모드"""
        return {"message": "Finance AI Analyzer API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/health")
async def api_health_check():
    """API 상태 확인"""
    return {"status": "healthy", "service": "Finance AI Analyzer API"}