#!/bin/bash

# Azure Web App 시작 스크립트
echo "Starting Finance AI Analyzer application..."

# 환경 변수 확인
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set"
fi

# 백엔드 디렉토리로 이동
cd /home/site/wwwroot/backend

# 데이터베이스 초기화 (필요한 경우)
python -c "from app.db.database import init_db; init_db()"

# FastAPI 서버 시작 (Azure에서는 port가 동적으로 할당됨)
PORT=${PORT:-8000}
echo "Starting server on port $PORT"

gunicorn --bind 0.0.0.0:$PORT --workers 1 --worker-class uvicorn.workers.UvicornWorker app.main:app