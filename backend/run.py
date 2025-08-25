import uvicorn
from app.db.database import init_db

if __name__ == "__main__":
    # 데이터베이스 초기화
    init_db()
    
    # 서버 실행
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )