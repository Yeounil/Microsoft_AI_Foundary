# AI Finance News Recommendation System

AI 기반 개인화 금융 뉴스 추천 및 분석 시스템

## 📋 프로젝트 개요

**AI Finance News Recommendation System**은 사용자 관심사를 기반으로 Azure OpenAI와 Supabase Cloud를 활용하여 개인화된 금융 뉴스를 추천하고 AI 분석 요약을 제공하는 시스템입니다.

### 🎯 핵심 기능
- **개인화 뉴스 추천**: 사용자 관심 종목 기반 AI 추천
- **종목별 뉴스 분석**: 특정 종목에 대한 전문적인 AI 분석
- **다양성 알고리즘**: 소스/시간대/카테고리 균형잡힌 뉴스 제공  
- **실시간 감정분석**: Azure OpenAI 기반 시장 감정 분석
- **백그라운드 수집**: 인기 종목 뉴스 자동 수집 및 사전 분석

## 🏗️ 시스템 구조

```
MS_AI_FOUNDRY/
├── backend/                     # Python FastAPI 백엔드
│   ├── .env                     # 환경 설정
│   ├── requirements.txt         # Python 의존성
│   ├── supabase_schema.sql     # 데이터베이스 스키마
│   └── app/
│       ├── main.py             # FastAPI 애플리케이션 진입점
│       ├── api/                # REST API 엔드포인트
│       │   ├── auth_supabase.py       # 인증 API (v2)
│       │   ├── news_supabase.py       # 뉴스 API (v2)
│       │   ├── recommendations_supabase.py  # AI 추천 API (v2)
│       │   ├── analysis_supabase.py   # 분석 API (v2)
│       │   └── stocks.py              # 주식 데이터 API (v1)
│       ├── services/           # 비즈니스 로직
│       │   ├── fast_recommendation_service.py     # 🔥 메인 AI 추천 엔진
│       │   ├── azure_openai_service.py            # 🤖 Azure OpenAI 통합
│       │   ├── background_news_collector.py       # 📰 백그라운드 뉴스 수집
│       │   ├── news_service.py                    # 뉴스 크롤링
│       │   └── supabase_*_service.py              # Supabase 연동 서비스들
│       ├── core/               # 핵심 모듈
│       ├── db/                 # 데이터베이스 연결
│       └── models/             # 데이터 모델
└── frontend/                   # React 프론트엔드
    ├── src/
    │   ├── components/         # React 컴포넌트
    │   ├── services/          # API 서비스
    │   └── types/             # TypeScript 타입
    └── package.json
```

## 🚀 설치 및 실행

### 📋 요구사항

**Backend:**
- Python 3.9+
- FastAPI
- Supabase Cloud Account
- Azure OpenAI Account
- News API Key

**Frontend:**
- Node.js 16+
- React 18+
- TypeScript

### 🔧 Backend 설정

1. **환경 설정**
```bash
cd backend
cp .env.example .env
```

2. **필수 환경변수 설정** (`.env` 파일)
```env
# Supabase Cloud 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Azure OpenAI 설정
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# 뉴스 API 설정
NEWS_API_KEY=your_news_api_key

# JWT 토큰 설정
SECRET_KEY=your_super_secret_key_change_this_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

3. **의존성 설치 및 실행**
```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 🌐 Frontend 설정

```bash
cd frontend
npm install
npm start
```

### 🗄️ 데이터베이스 설정

Supabase 대시보드에서 `supabase_schema.sql` 파일의 SQL을 실행하여 필요한 테이블들을 생성합니다:

- `users` - 사용자 정보
- `user_interests` - 사용자 관심 종목
- `news_articles` - 뉴스 기사 (AI 분석 점수 포함)

## 🔗 API 엔드포인트

### 🔐 인증 (v2)
```
POST /api/v2/auth/register      # 회원가입
POST /api/v2/auth/login         # 로그인
GET  /api/v2/auth/me            # 사용자 정보 조회
GET  /api/v2/auth/verify        # 토큰 검증
```

### 🤖 AI 뉴스 추천 (v2)
```
GET  /api/v2/recommendations/interests                      # 관심사 관리
GET  /api/v2/recommendations/news/recommended?limit=10      # 🔥 AI 개인화 추천
GET  /api/v2/news/stock/{symbol}?ai_mode=true              # 🔥 종목별 AI 뉴스
GET  /api/v2/recommendations/news/trending                  # 트렌딩 뉴스
```

### 📈 주식 데이터 (v1)
```
GET  /api/v1/stocks/search?q={query}           # 종목 검색
GET  /api/v1/stocks/{symbol}                   # 종목 차트 데이터
```

## 💡 사용법

### 1. 사용자 등록 및 로그인
```javascript
// 회원가입
const response = await fetch('/api/v2/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user',
    email: 'user@example.com',
    password: 'password123'
  })
});

// 로그인
const loginResponse = await fetch('/api/v2/auth/login', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user',
    password: 'password123'
  })
});
const { access_token } = await loginResponse.json();
```

### 2. AI 뉴스 추천 받기
```javascript
// 개인화 뉴스 추천
const recommendations = await fetch('/api/v2/recommendations/news/recommended?limit=10', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 종목별 AI 뉴스 (AAPL 예시)
const stockNews = await fetch('/api/v2/news/stock/AAPL?ai_mode=true&limit=5', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

### 3. 관심사 관리
```javascript
// 관심사 추가
await fetch('/api/v2/recommendations/interests', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ interest: 'NVDA' })
});
```

## ⚙️ 시스템 특징

### 🎯 AI 추천 엔진
- **개인화 점수**: 기본 적합성(40%) + 종목 특화(30%) + 사용자 관심도(20%) + 신선도(10%)
- **다양성 알고리즘**: 소스/시간대/카테고리/언어 다양성 보장
- **실시간 분석**: Azure OpenAI 기반 뉴스 감정분석 및 요약

### 🚀 성능 최적화
- **백그라운드 처리**: 뉴스 수집과 AI 분석을 미리 완료
- **빠른 응답**: 사전 분석된 데이터로 4-5초 응답
- **확장성**: Supabase Cloud 기반 무제한 확장

### 🔒 보안
- **JWT 인증**: 안전한 토큰 기반 인증
- **HTTPS**: 프로덕션 환경 SSL 적용
- **API Rate Limiting**: 남용 방지

## 🛠️ 개발 환경

**개발 서버 실행:**
```bash
# Backend
cd backend && python -m uvicorn app.main:app --reload

# Frontend  
cd frontend && npm start
```

**프로덕션 배포:**
- Backend: Docker + Gunicorn 권장
- Frontend: Vercel, Netlify 등
- Database: Supabase Cloud (관리형)

## 📚 추가 문서

- [뉴스 추천 알고리즘 상세 설명](./NEWS_RECOMMENDATION_ALGORITHM.md)

## 📞 지원

문제가 있거나 기능 요청이 있으시면 이슈를 등록해 주세요.

---

🤖 **AI-Powered Finance News Recommendation System** v2.0.0