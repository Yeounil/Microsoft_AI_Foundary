#!/bin/bash

# Azure Web App 시작 스크립트
echo "Starting Finance AI Analyzer application..."

# 환경 변수 설정 및 확인
export PYTHONPATH="/home/site/wwwroot:$PYTHONPATH"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1

echo "Python path: $PYTHONPATH"
echo "Current directory: $(pwd)"
echo "Contents: $(ls -la)"

# 애플리케이션 디렉토리로 이동 (backend 내용이 루트에 배포됨)
cd /home/site/wwwroot

# Python 모듈 확인
python -c "import sys; print('Python version:', sys.version); print('Python path:', sys.path)" || echo "Python check failed"

# 데이터베이스 초기화 (필요한 경우) - 오류 무시
echo "Initializing database..."
python -c "
try:
    import os
    os.environ['DATABASE_URL'] = 'sqlite:///./finance_ai.db'
    from app.db.database import init_db
    init_db()
    print('Database initialized successfully')
except ImportError as ie:
    print(f'Import error: {ie}')
except Exception as e:
    print(f'Database initialization warning: {e}')
    print('Continuing without database...')
" || echo "Database initialization skipped"

# FastAPI 서버 시작 (Azure에서는 port가 동적으로 할당됨)
PORT=${PORT:-8000}
echo "Starting server on port $PORT"

# 간단한 import 테스트
python -c "from app.main import app; print('App import successful')" || echo "App import failed"

# gunicorn.conf.py 사용하여 서버 시작
exec gunicorn -c gunicorn.conf.py app.main:app