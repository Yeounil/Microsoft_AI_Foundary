import os

# Azure Web App에서 PORT 환경 변수 사용
bind = f"0.0.0.0:{os.environ.get('PORT', 8000)}"

# Worker 설정
workers = 1  # Azure Free/Basic 티어에서는 CPU 제한이 있음
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# 타임아웃 설정
timeout = 120
keepalive = 5

# 로깅
accesslog = "-"  # stdout으로 출력
errorlog = "-"   # stderr로 출력
loglevel = "info"

# 보안
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# 프로세스 관리
max_requests = 1000
max_requests_jitter = 100
preload_app = True

# Azure 환경 최적화
def when_ready(server):
    server.log.info("Finance AI Analyzer is ready to serve requests")

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)
    
def worker_abort(worker):
    worker.log.info("Worker received SIGABRT signal")