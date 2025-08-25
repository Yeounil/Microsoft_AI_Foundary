# 🚀 Azure Web App 배포 가이드

## 📋 사전 준비사항

### 필수 요구사항
- Azure 구독 계정
- Azure CLI 설치 (선택사항)
- OpenAI API 키

## 🔧 Azure Web App 생성

### 1. Azure Portal에서 Web App 생성

1. **Azure Portal** (https://portal.azure.com) 접속
2. **리소스 만들기** → **웹앱** 선택
3. 다음 설정으로 생성:
   ```
   리소스 그룹: finance-ai-rg (신규 생성)
   이름: finance-ai-analyzer-[고유번호]
   런타임 스택: Python 3.11
   운영 체제: Linux
   지역: Korea Central
   앱 서비스 플랜: 기본 (B1) 이상
   ```

### 2. 배포 설정

#### Option A: GitHub Actions 자동 배포 (권장)

1. **배포 센터** → **GitHub** 선택
2. 저장소 연결: `https://github.com/Yeounil/Microsoft_AI_Foundary`
3. 브랜치: `main`
4. **저장**하면 자동으로 GitHub Actions 워크플로우 생성

#### Option B: 로컬 Git 배포

```bash
# Azure CLI로 배포 사용자 설정
az webapp deployment user set --user-name <username> --password <password>

# 원격 저장소 추가 및 배포
git remote add azure https://<username>@<app-name>.scm.azurewebsites.net/<app-name>.git
git push azure main
```

## ⚙️ 환경 변수 설정

### Azure Portal에서 설정
1. **구성** → **애플리케이션 설정** 이동
2. 다음 환경 변수 추가:

```bash
# 필수 환경 변수
OPENAI_API_KEY=sk-your-openai-api-key-here
SECRET_KEY=your-super-secret-key-for-production
ENVIRONMENT=production

# 선택사항
NEWS_API_KEY=your-news-api-key-here
DATABASE_URL=sqlite:///./finance_ai.db

# Azure 특정 설정
SCM_DO_BUILD_DURING_DEPLOYMENT=true
ENABLE_ORYX_BUILD=true
POST_BUILD_SCRIPT_PATH=startup.sh
```

### 시작 명령 설정
- **구성** → **일반 설정** → **시작 명령**:
```bash
bash startup.sh
```

## 🌐 정적 파일 서빙 (프론트엔드)

### React 앱 빌드 및 배포

```bash
# 로컬에서 프론트엔드 빌드
cd frontend
npm install
npm run build

# 빌드된 파일을 백엔드의 static 폴더로 복사
cp -r build/* ../backend/static/
```

### FastAPI에서 정적 파일 서빙 설정

`backend/app/main.py`에 추가:
```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

# React Router를 위한 catch-all 라우트
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    return FileResponse('static/index.html')
```

## 🔍 배포 확인

### 1. 애플리케이션 URL 접속
- `https://<app-name>.azurewebsites.net`

### 2. API 엔드포인트 테스트
- API 문서: `https://<app-name>.azurewebsites.net/docs`
- 상태 확인: `https://<app-name>.azurewebsites.net/api/v1/health`

### 3. 로그 확인
- **모니터링** → **로그 스트림**에서 실시간 로그 확인

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 앱이 시작되지 않음
- **로그 스트림**에서 오류 메시지 확인
- 환경 변수가 올바르게 설정되었는지 확인
- requirements.txt의 모든 패키지가 설치되었는지 확인

#### 2. 데이터베이스 연결 오류
```bash
# Azure Database for PostgreSQL 사용 권장
DATABASE_URL=postgresql://user:password@server.postgres.database.azure.com:5432/finance_ai_db
```

#### 3. API 키 관련 오류
- Azure Key Vault 사용 권장:
```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://<vault-name>.vault.azure.net/", credential=credential)
openai_key = client.get_secret("openai-api-key").value
```

## 📊 성능 최적화

### 1. 앱 서비스 플랜 업그레이드
- Basic (B1): 개발/테스트용
- Standard (S1): 운영용 권장
- Premium (P1V2): 고성능 필요시

### 2. Azure CDN 설정
- 정적 파일 캐싱 및 전세계 배포

### 3. Application Insights 모니터링
- 성능 메트릭 및 오류 추적

## 🔒 보안 설정

### 1. HTTPS 강제
- **TLS/SSL 설정** → **HTTPS만** 활성화

### 2. 사용자 지정 도메인
- **사용자 지정 도메인** → 도메인 추가

### 3. 인증 및 권한 부여
- **인증/권한 부여** → App Service 인증 활성화

## 💰 비용 관리

### 예상 월 비용 (한국 중부 기준)
- **Basic B1**: ~$13/월
- **Standard S1**: ~$56/월
- **Premium P1V2**: ~$146/월

### 비용 절약 팁
- **자동 크기 조정** 설정으로 사용량에 따라 인스턴스 수 조정
- **개발/테스트 환경**은 별도 리소스 그룹으로 관리
- 사용하지 않을 때는 **앱 중지**

## 🚀 배포 명령어 요약

```bash
# 1. 프론트엔드 빌드
cd frontend && npm run build

# 2. 정적 파일 복사
cp -r frontend/build/* backend/static/

# 3. Git 커밋 및 푸시
git add .
git commit -m "feat: Azure Web App deployment ready"
git push origin main

# 4. Azure 배포 (GitHub Actions 자동 실행)
# 또는 직접 배포
git push azure main
```

## 📞 지원

문제가 발생하면:
1. **Azure Portal** → **지원 + 문제 해결**
2. **Microsoft Learn** Azure 문서 참조
3. **Stack Overflow** #azure-web-app-service 태그

---

🎉 **배포 성공하세요!**