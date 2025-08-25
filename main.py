import os
import sys
from pathlib import Path

# 백엔드 디렉토리를 Python 경로에 추가
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# 환경 변수 설정
os.environ.setdefault("ENVIRONMENT", "production")

from backend.app.main import app
from backend.app.db.database import init_db

# 데이터베이스 초기화
init_db()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
