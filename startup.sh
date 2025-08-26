#!/bin/bash

# Azure Web App 시작 스크립트
echo "Starting Finance AI Analyzer application..."

# 환경 변수 확인
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set"
fi

# 애플리케이션 디렉토리로 이동 (backend 내용이 루트에 배포됨)
cd /home/site/wwwroot

# 데이터베이스 초기화 (필요한 경우) - 오류 무시
echo "Initializing database..."
python -c "
try:
    from app.db.database import init_db
    init_db()
    print('Database initialized successfully')
except Exception as e:
    print(f'Database initialization warning: {e}')
    print('Continuing without database...')
" || echo "Database initialization skipped"

# FastAPI 서버 시작 (Azure에서는 port가 동적으로 할당됨)
PORT=${PORT:-8000}
echo "Starting server on port $PORT"

# gunicorn.conf.py 사용하여 서버 시작
exec gunicorn -c gunicorn.conf.py app.main:app