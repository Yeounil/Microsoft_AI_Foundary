# 🚀 AI 금융 분석 프로그램

Microsoft Azure AI Foundary와 OpenAI를 활용한 AI 기반 금융 분석 웹 애플리케이션입니다.

## ✨ 주요 기능

### 📈 1. 주식 차트 시각화
- **국내/해외 주식** 데이터 실시간 조회
- **다양한 기간**: 1일, 5일, 1개월, 3개월, 6개월, 1년, 2년, 5년
- **차트 타입**: 선형차트, 바차트 지원
- **반응형 디자인**: 모바일/데스크톱 최적화

### 🤖 2. AI 투자 분석
- **OpenAI GPT-4** 기반 전문적인 주식 분석
- **분석 항목**: 기술적 분석, 펀더멘털 분석, 시장 동향
- **투자 의견**: 목표가 제시 및 리스크 분석
- **실시간 생성**: 최신 주식 데이터 기반 분석

### 📰 3. 뉴스 분석 및 요약
- **금융 뉴스** 자동 수집
- **AI 요약**: 핵심 내용 요약 및 시장 영향 분석
- **주식별 뉴스**: 선택한 종목 관련 뉴스 필터링
- **다국어 지원**: 한국어/영어 뉴스

### 🔐 4. 사용자 인증
- **보안 회원가입/로그인** (SHA-256 해싱)
- **JWT 토큰** 기반 인증
- **개인화 서비스** 지원

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **백엔드** | Python, FastAPI, SQLAlchemy, OpenAI API |
| **프론트엔드** | React, TypeScript, Material-UI, Recharts |
| **데이터** | yfinance (Yahoo Finance), News API |
| **데이터베이스** | SQLite (개발용) |
| **배포** | Uvicorn, Node.js |

## 🚀 빠른 시작

### 📋 필수 요구사항
- Python 3.8+
- Node.js 18+
- OpenAI API 키

### ⚡ 1분 실행 가이드

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd finance-ai-analyzer
```

2. **백엔드 설정 & 실행**
```bash
cd backend
pip install fastapi uvicorn python-dotenv sqlalchemy openai yfinance
python run.py
```

3. **프론트엔드 설정 & 실행** (새 터미널)
```bash
cd frontend
npm install
npm start
```

4. **접속**
- 🌐 **웹 앱**: http://localhost:3000
- 📚 **API 문서**: http://localhost:8000/docs

## 📝 상세 설치 가이드

### 🔧 백엔드 설정

1. **디렉토리 이동 및 패키지 설치**
```bash
cd backend
pip install -r requirements.txt
```

2. **환경 변수 설정** (`.env` 파일 생성)
```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=your_openai_api_key_here

# JWT 시크릿 키
SECRET_KEY=your_super_secret_key_change_this_in_production

# 뉴스 API 키 (선택사항)
NEWS_API_KEY=your_news_api_key_here
```

3. **서버 실행**
```bash
python run.py
# 또는
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### ⚛️ 프론트엔드 설정

1. **디렉토리 이동 및 패키지 설치**
```bash
cd frontend
npm install
```

2. **환경 변수 설정** (`.env` 파일 생성)
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

3. **개발 서버 실행**
```bash
npm start
```

## 📖 사용 방법

### 1️⃣ 주식 검색 및 차트 보기
1. 웹 브라우저에서 `http://localhost:3000` 접속
2. 상단에서 **시장 선택** (🇺🇸 미국 / 🇰🇷 한국)
3. **주식 검색** (예: Apple, AAPL, 삼성전자, 005930)
4. **차트 탭**에서 기간 및 차트 타입 선택

### 2️⃣ AI 분석 받기
1. 주식 선택 후 **'AI 분석'** 탭 클릭
2. **'AI 분석 시작'** 버튼 클릭
3. 📊 **OpenAI 생성 분석 리포트** 확인

### 3️⃣ 뉴스 확인 및 요약
1. **'뉴스'** 탭에서 최신 금융 뉴스 확인
2. **'AI 요약'** 버튼으로 뉴스 한줄 요약
3. 주식 선택시 해당 종목 관련 뉴스 자동 표시

## 🔑 API 키 발급 방법

### OpenAI API 키 (필수)
1. [OpenAI 플랫폼](https://platform.openai.com/) 방문
2. 계정 생성 후 **API Keys** 메뉴
3. **Create new secret key** 클릭
4. `.env` 파일에 `OPENAI_API_KEY=sk-...` 추가

### News API 키 (선택사항)
1. [NewsAPI.org](https://newsapi.org/) 방문
2. **Get API Key** 클릭하여 무료 계정 생성
3. `.env` 파일에 `NEWS_API_KEY=...` 추가

## 📁 프로젝트 구조

```
finance-ai-analyzer/
├── 🔙 backend/                 # Python FastAPI 백엔드
│   ├── app/
│   │   ├── api/                # API 엔드포인트
│   │   │   ├── auth.py         # 사용자 인증
│   │   │   ├── stocks.py       # 주식 데이터
│   │   │   ├── news.py         # 뉴스 데이터
│   │   │   └── analysis.py     # AI 분석
│   │   ├── core/               # 코어 설정
│   │   ├── models/             # 데이터 모델
│   │   └── services/           # 비즈니스 로직
│   ├── requirements.txt        # Python 의존성
│   └── run.py                  # 서버 실행 스크립트
├── 🎨 frontend/                # React 프론트엔드
│   ├── src/
│   │   ├── components/         # React 컴포넌트
│   │   │   ├── StockChart.tsx  # 주식 차트
│   │   │   ├── StockSearch.tsx # 주식 검색
│   │   │   ├── StockAnalysis.tsx # AI 분석
│   │   │   └── NewsSection.tsx # 뉴스 섹션
│   │   ├── services/           # API 호출 로직
│   │   └── types/              # TypeScript 타입
│   └── package.json
└── 📖 README.md               # 이 문서
```

## 🌐 주요 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| 🎯 **메인 앱** | http://localhost:3000 | React 웹 애플리케이션 |
| 📚 **API 문서** | http://localhost:8000/docs | Swagger UI 문서 |
| 🔍 **API 테스트** | http://localhost:8000/redoc | ReDoc 문서 |
| 📊 **주식 API** | http://localhost:8000/api/v1/stocks/AAPL | Apple 주식 데이터 예시 |

## 🛠️ 개발자 명령어

### 🔍 디버깅
```bash
# 백엔드 로그 확인
cd backend && python run.py

# 프론트엔드 개발 모드
cd frontend && npm start

# API 테스트
curl http://localhost:8000/api/v1/stocks/AAPL
```

### 🧹 코드 정리
```bash
# Python 코드 포맷팅
cd backend && black . && isort .

# React 빌드
cd frontend && npm run build
```

## 📊 지원하는 주식

### 🇺🇸 미국 주식 (예시)
- **Apple (AAPL)**, Google (GOOGL), Microsoft (MSFT)
- **Tesla (TSLA)**, Amazon (AMZN), NVIDIA (NVDA)

### 🇰🇷 한국 주식 (예시)
- **삼성전자 (005930.KS)**, SK하이닉스 (000660.KS)
- **NAVER (035420.KS)**, 카카오 (035720.KS)

## ⚠️ 주의사항

### 🔒 보안
- `.env` 파일은 **절대 GitHub에 업로드하지 마세요**
- API 키는 **안전하게 보관**하세요

### 💡 투자 면책사항
- 본 프로그램의 AI 분석은 **참고용**입니다
- **실제 투자 결정**에 대한 책임을 지지 않습니다
- 투자는 **신중히** 결정하시기 바랍니다

### 📈 데이터 특성
- **yfinance**: 15-20분 지연된 데이터 (무료)
- **실시간 데이터** 필요시 유료 API 사용 권장

## 🤝 기여하기

1. Fork 프로젝트
2. 기능 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이선스

MIT License

---

## 🚀 지금 바로 시작하세요!

```bash
# 1. 백엔드 실행
cd backend && python run.py

# 2. 프론트엔드 실행 (새 터미널)
cd frontend && npm start

# 3. 웹 브라우저에서 접속
open http://localhost:3000
```

**🎉 Happy Coding!**