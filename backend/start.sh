#!/bin/bash
set -e
echo "Starting application..."
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"
echo "Python path: $PYTHONPATH"
echo "Port: ${PORT:-8080}"

export PYTHONPATH=/app:$PYTHONPATH
echo "Updated Python path: $PYTHONPATH"

echo "Files in /app:"
ls -la /app/
echo "Files in /app/app:"
ls -la /app/app/

echo "Testing Python import..."
python -c "import sys; print('Python sys.path:'); [print(f'  {p}') for p in sys.path]"
python -c "import app; print('App module imported successfully')"
python -c "import app.main; print('App.main imported successfully')"
python -c "from app.main import app; print('FastAPI app imported successfully')"

echo "Starting uvicorn..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level debug