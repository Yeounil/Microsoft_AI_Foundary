import os
import sys
from pathlib import Path

# 현재 디렉토리를 Python 경로에 추가
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 환경 변수 설정
os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app
from app.db.database import init_db

# 데이터베이스 초기화
init_db()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
