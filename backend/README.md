# AI Finance News Recommendation System - Backend

**Version:** 2.0.0
**Last Updated:** 2025-11-25
**Status:** ✅ Production Ready

## 📋 목차

- [개요](#-개요)
- [시스템 아키텍처](#-시스템-아키텍처)
- [핵심 기능](#-핵심-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [API 문서](#-api-문서)
- [주요 서비스 상세](#-주요-서비스-상세)
- [데이터베이스 스키마](#-데이터베이스-스키마)
- [스크립트 가이드](#-스크립트-가이드)
- [환경 변수 설정](#-환경-변수-설정)
- [모니터링 및 로깅](#-모니터링-및-로깅)
- [문제 해결](#-문제-해결)

---

## 🎯 개요

AI 기반 금융 뉴스 분석 및 추천 시스템의 백엔드 서버입니다. Claude Sonnet 4.5와 GPT-5를 활용하여 실시간 뉴스를 수집, 분석, 번역하고 사용자에게 개인화된 투자 인사이트를 제공합니다.

### 주요 특징

- 🤖 **AI 기반 뉴스 분석**: GPT-5를 활용한 뉴스 주가 영향도 자동 평가
- 📰 **실시간 뉴스 수집**: Event Registry (newsapi.ai)를 통한 글로벌 금융 뉴스 수집
- 🌐 **전문 번역**: Claude Sonnet 4.5를 활용한 고품질 한글 번역
- 📊 **심층 리포트**: Claude 기반 뉴스 종합 분석 리포트 생성
- 🔍 **벡터 검색**: Pinecone을 활용한 주식 유사도 검색 및 임베딩
- 📈 **실시간 시세**: FMP API를 통한 100개 주요 종목 데이터 수집
- 🔐 **소셜 로그인**: Google, Kakao OAuth 인증 지원
- 📧 **이메일 구독**: 사용자 맞춤형 뉴스 이메일 발송

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend Server                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  뉴스 수집    │  │  AI 분석     │  │  번역 서비스  │      │
│  │ (Event Reg.) │  │ (GPT-5/     │  │  (Claude)    │      │
│  │              │  │  Claude)     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                 ↓                  ↓               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Supabase (PostgreSQL)                     │   │
│  │  - 뉴스 기사 (news_articles)                         │   │
│  │  - 사용자 (auth_users)                               │   │
│  │  - AI 분석 이력 (ai_analysis_history)                │   │
│  │  - 주식 데이터 (stock_indicators, price_history)     │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Pinecone (Vector DB)                      │   │
│  │  - 1,302개 벡터 (1,536차원)                          │   │
│  │  - 주식 지표 임베딩                                   │   │
│  │  - 가격 이력 임베딩                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ↑                                          ↓
    Frontend                                  External APIs
  (React/Next.js)                     (FMP, OpenAI, Anthropic)
```

---

## 🚀 핵심 기능

### 1. 뉴스 수집 및 관리

#### Event Registry 기반 뉴스 크롤링
- **지원 소스**: Reuters, Bloomberg, Wall Street Journal, CNBC, MarketWatch, Benzinga
- **지원 종목**: 100개 주요 미국 주식 (Tech, Finance, Healthcare 등)
- **자동 스케줄링**: 매 6시간마다 자동 수집
- **수동 수집**: API 엔드포인트 및 스크립트 지원

```bash
# 최근 7일 뉴스 수집
python scripts/crawl_news.py --days 7

# 특정 종목만 수집
python scripts/crawl_news.py --symbols AAPL MSFT GOOGL --days 30
```

### 2. AI 기반 뉴스 분석

#### GPT-5 주가 영향도 평가
- **AI Score**: 주가에 미치는 영향의 크기 (0.0 ~ 1.0)
  - 0.8~1.0: 매우 큰 영향 (CEO 교체, 대형 스캔들)
  - 0.6~0.8: 큰 영향 (M&A, 규제 변화)
  - 0.4~0.6: 중간 영향 (분기 실적, 제품 출시)
  - 0.2~0.4: 약간의 영향 (작은 계약)
  - 0.0~0.2: 영향 거의 없음

- **Positive Score**: 주가에 미치는 영향의 방향 (0.0 ~ 1.0)
  - 0.8~1.0: 매우 긍정적 📈
  - 0.6~0.8: 긍정적 📈
  - 0.4~0.6: 중립 ➡️
  - 0.2~0.4: 부정적 📉
  - 0.0~0.2: 매우 부정적 📉

```bash
# 미평가 뉴스 자동 평가 (50개)
curl -X POST "http://localhost:8000/api/v2/news-ai-score/news/evaluate-unevaluated?limit=50"

# 스크립트로 배치 평가
python scripts/re_evaluate_all_news.py --unevaluated --limit 100
```

### 3. 전문 번역 서비스

#### Claude Sonnet 4.5 기반 금융 뉴스 번역
- **고품질 번역**: 금융 전문 용어 정확한 한글화
- **구조 보존**: 제목, 소제목, 본문 형식 유지
- **배치 처리**: 대량 뉴스 자동 번역 지원
- **프롬프트 최적화**: `app/services/news_translation_prompt.txt`

```bash
# 미번역 뉴스 50개 자동 번역
curl -X POST "http://localhost:8000/api/v2/news-translation/translate-untranslated?limit=50"

# 스크립트로 번역
python scripts/translate_all_news.py --untranslated --limit 100
```

### 4. 뉴스 리포트 생성

#### Claude Sonnet 4 기반 심층 분석 리포트
AI가 뉴스를 종합 분석하여 투자 인사이트를 제공합니다.

**리포트 구성**:
- **Executive Summary**: 핵심 요약 및 주요 발견사항
- **Market Reaction**: 시장 반응 및 투자 심리 분석
- **Price Impact**: 주가 영향 예측 (단기/중기/장기)
- **Competitor Analysis**: 경쟁사 분석 및 업계 전망
- **Risk Factors**: 리스크 요인 및 대응 전략
- **Investment Recommendation**: 투자 추천 (BUY/HOLD/SELL)
- **Conclusion**: 최종 의견 및 모니터링 포인트

**특징**:
- 노이즈 필터링: 반복/광고성 기사 자동 제거
- 낚시성 판별: 제목-본문 괴리 분석
- 심리 분석: 경영진 발언 어조 분석
- 역발상 관점: 과열/과매도 구간 경고

```bash
POST /api/v1/news-report
{
  "symbol": "AAPL",
  "limit": 20
}
```

자세한 내용: [docs/NEWS_REPORT_ANALYSIS_STRATEGY.md](docs/NEWS_REPORT_ANALYSIS_STRATEGY.md)

### 5. 주식 데이터 수집

#### FMP API 기반 실시간 데이터
- **Stock Indicators**: 회사 정보, 재무 지표, 기술 지표
- **Price History**: 5년 일별 가격 데이터 (OHLCV)
- **Real-time WebSocket**: 실시간 시세 스트리밍
- **자동 스케줄**: 매일 새벽 2시(지표), 3시(가격) 자동 수집

```bash
# 주식 지표 수집
curl -X POST http://localhost:8000/api/stock-data/collect/indicators

# 가격 이력 수집
curl -X POST http://localhost:8000/api/stock-data/collect/prices

# 스크립트로 수집
python scripts/collect_stock_data.py --full
```

### 6. 벡터 검색 (Pinecone)

#### 주식 유사도 검색 및 임베딩
- **1,302개 벡터**: 93개 Stock Indicators + 1,209개 Price Chunks
- **1,536차원**: OpenAI text-embedding-ada-002
- **유사 종목 검색**: 자연어 쿼리로 유사 주식 찾기

```bash
# 벡터 임베딩 생성
python scripts/embed_stock_data.py --all

# 유사 종목 검색 API
curl http://localhost:8000/api/v2/embeddings/embeddings/index/stats
```

### 7. 사용자 인증 및 관리

#### JWT + Supabase 인증
- **일반 로그인**: username/email + password
- **소셜 로그인**: Google OAuth, Kakao OAuth
- **토큰 관리**: Access Token (30분) + Refresh Token (7일)
- **세션 관리**: 다중 기기 세션 지원

```bash
# 회원가입
POST /api/v2/auth/register
{
  "username": "user123",
  "email": "user@example.com",
  "password": "secure_password"
}

# 로그인
POST /api/v2/auth/login
{
  "username": "user123",
  "password": "secure_password"
}
```

자세한 내용: [docs/SOCIAL_LOGIN_SETUP.md](docs/SOCIAL_LOGIN_SETUP.md)

### 8. 이메일 구독 서비스

#### 사용자 맞춤형 뉴스 이메일
- **구독 관리**: 종목별 뉴스 구독 설정
- **자동 발송**: 예약된 시간에 이메일 발송
- **맞춤형 콘텐츠**: 사용자 관심사 기반 큐레이션

```bash
# 이메일 구독 신청
POST /api/v2/subscriptions/subscribe
{
  "email": "user@example.com",
  "symbols": ["AAPL", "MSFT"]
}
```

---

## 🔧 기술 스택

### Backend Framework
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **Python 3.9+**: 최신 Python 기능 활용
- **Uvicorn**: ASGI 서버

### AI & ML
- **Claude Sonnet 4.5**: 뉴스 번역 및 리포트 생성
- **GPT-5**: 뉴스 주가 영향도 평가
- **OpenAI Embeddings**: text-embedding-ada-002 (1,536차원)

### Database & Storage
- **Supabase (PostgreSQL)**: 메인 데이터베이스
- **Pinecone**: 벡터 데이터베이스

### External APIs
- **Event Registry (newsapi.ai)**: 뉴스 수집
- **FMP (Financial Modeling Prep)**: 주식 데이터
- **Google OAuth**: 소셜 로그인
- **Kakao OAuth**: 소셜 로그인

### Task Scheduling
- **APScheduler**: 자동 뉴스 수집 및 데이터 동기화

### Others
- **JWT**: 사용자 인증
- **CORS**: 프론트엔드 연동
- **Logging**: 구조화된 로깅

---

## 📁 프로젝트 구조

```
backend/
├── app/
│   ├── api/                          # API 엔드포인트
│   │   ├── auth_supabase.py         # 인증 API
│   │   ├── social_auth.py           # 소셜 로그인 API
│   │   ├── news_v1.py               # 뉴스 API (v1)
│   │   ├── news_supabase.py         # 뉴스 API (v2)
│   │   ├── news_report_v1.py        # 뉴스 리포트 API
│   │   ├── news_ai_score.py         # 뉴스 AI 점수 API
│   │   ├── news_translation.py      # 뉴스 번역 API
│   │   ├── analysis_v1.py           # 분석 API (v1)
│   │   ├── analysis_supabase.py     # 분석 API (v2)
│   │   ├── recommendations_supabase.py # 추천 API
│   │   ├── stocks.py                # 주식 API
│   │   ├── stock_data.py            # 주식 데이터 수집 API
│   │   ├── embeddings.py            # 임베딩 API
│   │   ├── websocket_realtime.py    # 실시간 시세 WebSocket
│   │   ├── pdf.py                   # PDF 생성 API
│   │   └── subscriptions.py         # 이메일 구독 API
│   │
│   ├── core/                         # 핵심 모듈
│   │   ├── config.py                # 설정 관리
│   │   ├── security.py              # 보안 (JWT, 비밀번호)
│   │   ├── auth_supabase.py         # 인증 로직
│   │   ├── social_auth_base.py      # 소셜 로그인 베이스
│   │   ├── google_auth.py           # Google OAuth
│   │   └── kakao_auth.py            # Kakao OAuth
│   │
│   ├── services/                     # 비즈니스 로직
│   │   ├── news_service.py          # 뉴스 수집
│   │   ├── news_db_service.py       # 뉴스 DB 관리
│   │   ├── news_scheduler.py        # 뉴스 스케줄러
│   │   ├── news_ai_score_service.py # AI 점수 평가
│   │   ├── news_translation_service.py # 뉴스 번역
│   │   ├── news_translation_prompt.txt # 번역 프롬프트
│   │   ├── claude_service.py        # Claude API
│   │   ├── openai_service.py        # OpenAI API (GPT-5, 임베딩)
│   │   ├── fmp_stock_data_service.py # FMP 주식 데이터
│   │   ├── fmp_websocket_service.py # FMP 실시간 시세
│   │   ├── financial_embedding_service.py # 임베딩 생성
│   │   ├── pinecone_service.py      # Pinecone 관리
│   │   ├── textification_service.py # 수치→텍스트 변환
│   │   ├── stock_service.py         # 주식 서비스
│   │   ├── pdf_service.py           # PDF 생성
│   │   ├── email_service.py         # 이메일 발송
│   │   ├── subscription_service.py  # 구독 관리
│   │   ├── supabase_user_service.py # 사용자 관리
│   │   ├── supabase_ai_analysis_history_service.py # AI 분석 이력
│   │   ├── supabase_user_interest_service.py # 사용자 관심사
│   │   ├── supabase_data_service.py # Supabase 데이터 관리
│   │   ├── direct_db_service.py     # Direct DB 액세스
│   │   ├── refresh_token_service.py # 토큰 갱신
│   │   └── playwright_worker.py     # 웹 크롤링
│   │
│   ├── models/                       # 데이터 모델
│   │   ├── user.py                  # 사용자 모델
│   │   ├── news_article.py          # 뉴스 모델
│   │   ├── user_interest.py         # 관심사 모델
│   │   └── ai_analysis_history.py   # AI 분석 이력 모델
│   │
│   ├── db/
│   │   └── supabase_client.py       # Supabase 클라이언트
│   │
│   └── main.py                       # FastAPI 앱 진입점
│
├── scripts/                          # 유틸리티 스크립트
│   ├── crawl_news.py                # 뉴스 수집
│   ├── crawl_massive_news.py        # Massive API 뉴스 수집
│   ├── translate_all_news.py        # 뉴스 번역
│   ├── translate_titles.py          # 제목 번역
│   ├── re_evaluate_all_news.py      # AI 점수 재평가
│   ├── collect_stock_data.py        # 주식 데이터 수집
│   ├── refresh_stock_indicators.py  # 주식 지표 갱신
│   ├── embed_stock_data.py          # 벡터 임베딩
│   ├── setup_pinecone_index.py      # Pinecone 인덱스 설정
│   ├── export_db_schema.py          # DB 스키마 내보내기
│   └── check_constraints.py         # DB 제약조건 확인
│
├── docs/                             # 문서
│   ├── API_DOCUMENTATION.md         # API 전체 문서
│   ├── NEWS_REPORT_ANALYSIS_STRATEGY.md # 리포트 전략
│   ├── NEWS_TRANSLATION_GUIDE.md    # 번역 가이드
│   ├── NEWS_AI_SCORE_GUIDE.md       # AI 점수 가이드
│   ├── NEWS_CRAWLING_GUIDE.md       # 크롤링 가이드
│   ├── NEWS_TITLE_TRANSLATION_GUIDE.md # 제목 번역
│   ├── MY_REPORTS_API_GUIDE.md      # 리포트 API
│   ├── NEWS_REPORT_USER_ASSOCIATION_GUIDE.md # 리포트 연동
│   ├── SOCIAL_LOGIN_SETUP.md        # 소셜 로그인 설정
│   └── Massive_api.md               # Massive API
│
├── migrations/                       # DB 마이그레이션 (git 제외)
├── .env                              # 환경 변수 (git 제외)
├── .gitignore                        # Git 제외 파일
├── requirements.txt                  # Python 패키지
├── Dockerfile                        # Docker 설정
├── cloudbuild.yaml                   # GCP Cloud Build
├── start.sh                          # 서버 시작 스크립트
└── README.md                         # 본 문서
```

---

## ⚙️ 설치 및 실행

### 1. 사전 요구사항

- **Python 3.9+**
- **PostgreSQL** (Supabase 사용)
- **Pinecone 계정**
- **API 키**:
  - Supabase
  - OpenAI (GPT-5, Embeddings)
  - Anthropic (Claude Sonnet 4.5)
  - Event Registry (newsapi.ai)
  - FMP (Financial Modeling Prep)
  - Google OAuth (선택)
  - Kakao OAuth (선택)

### 2. 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd backend

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (아래 "환경 변수 설정" 참조)
```

### 3. 데이터베이스 설정

```bash
# Supabase 스키마 적용 (migrations 폴더 참조)
# Supabase 대시보드에서 SQL 실행
```

### 4. 서버 실행

```bash
# 개발 모드
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 프로덕션 모드
./start.sh
```

서버가 실행되면 다음 URL에서 확인할 수 있습니다:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📚 API 문서

### API 버전

- **v1**: 레거시 호환성 유지 (일부 기능)
- **v2**: 메인 API (Supabase 기반)

### 주요 엔드포인트

| 카테고리 | Base Path | 설명 |
|---------|-----------|------|
| **인증** | `/api/v2/auth` | 회원가입, 로그인, 토큰 관리 |
| **소셜 로그인** | `/api/v2/social-auth` | Google, Kakao OAuth |
| **뉴스** | `/api/v2/news` | 뉴스 조회, 필터링 |
| **뉴스 (v1)** | `/api/v1/news` | 뉴스 조회, 크롤링 |
| **뉴스 리포트** | `/api/v1/news-report` | AI 분석 리포트 생성 |
| **뉴스 AI 점수** | `/api/v2/news-ai-score` | 주가 영향도 평가 |
| **뉴스 번역** | `/api/v2/news-translation` | 뉴스 번역 |
| **분석** | `/api/v2/analysis` | AI 분석 이력 |
| **추천** | `/api/v2/recommendations` | 개인화 추천 |
| **주식** | `/api/v1/stocks` | 주식 정보 조회 |
| **주식 데이터** | `/api/stock-data` | 데이터 수집 |
| **임베딩** | `/api/v2/embeddings` | 벡터 검색 |
| **실시간 시세** | `/api/v2/realtime` | WebSocket 스트리밍 |
| **PDF** | `/api/v2/pdf` | PDF 생성 |
| **이메일 구독** | `/api/v2/subscriptions` | 구독 관리 |

자세한 API 명세: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

### Swagger UI

API를 직접 테스트할 수 있습니다:
```
http://localhost:8000/docs
```

---

## 🔍 주요 서비스 상세

### 1. 뉴스 수집 서비스 (`news_service.py`)

**기능**:
- Event Registry API를 통한 뉴스 수집
- 중복 제거 및 검증
- Supabase 저장

**사용 예시**:
```python
from app.services.news_service import NewsService

# 특정 종목 뉴스 수집
news = await NewsService.crawl_and_save_stock_news("AAPL", limit=20)
```

### 2. AI 점수 평가 서비스 (`news_ai_score_service.py`)

**기능**:
- GPT-5 기반 뉴스 영향도 평가
- AI Score 및 Positive Score 계산
- 배치 처리 지원

**사용 예시**:
```python
from app.services.news_ai_score_service import NewsAIScoreService

service = NewsAIScoreService()
result = await service.evaluate_single_news(news_id=123)
```

자세한 내용: [docs/NEWS_AI_SCORE_GUIDE.md](docs/NEWS_AI_SCORE_GUIDE.md)

### 3. 번역 서비스 (`news_translation_service.py`)

**기능**:
- Claude Sonnet 4.5 기반 번역
- 금융 전문 용어 최적화
- 구조화된 프롬프트 사용

**사용 예시**:
```python
from app.services.news_translation_service import NewsTranslationService

service = NewsTranslationService()
result = await service.translate_and_save_news(news_id=123)
```

자세한 내용: [docs/NEWS_TRANSLATION_GUIDE.md](docs/NEWS_TRANSLATION_GUIDE.md)

### 4. 리포트 생성 서비스 (`claude_service.py`)

**기능**:
- Claude Sonnet 4 기반 심층 분석
- 구조화된 JSON 리포트 출력
- 노이즈 필터링 및 역발상 분석

**사용 예시**:
```python
from app.services.claude_service import ClaudeService

service = ClaudeService()
report = await service.generate_news_report(
    symbol="AAPL",
    news_articles=news_list
)
```

자세한 내용: [docs/NEWS_REPORT_ANALYSIS_STRATEGY.md](docs/NEWS_REPORT_ANALYSIS_STRATEGY.md)

### 5. 주식 데이터 서비스 (`fmp_stock_data_service.py`)

**기능**:
- FMP API 통합
- 주식 지표 및 가격 이력 수집
- 자동 스케줄링

**사용 예시**:
```python
from app.services.fmp_stock_data_service import FMPStockDataService

service = FMPStockDataService()
data = await service.fetch_stock_indicators(["AAPL", "MSFT"])
```

### 6. 임베딩 서비스 (`financial_embedding_service.py`)

**기능**:
- OpenAI text-embedding-ada-002 사용
- 수치 데이터 텍스트화
- Pinecone 저장

**사용 예시**:
```python
from app.services.financial_embedding_service import FinancialEmbeddingService

service = FinancialEmbeddingService()
await service.embed_stock_indicators(symbol="AAPL")
```

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블

#### `news_articles` - 뉴스 기사
```sql
CREATE TABLE news_articles (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10),
    title TEXT NOT NULL,
    kr_title TEXT,                    -- 번역된 제목
    description TEXT,
    body TEXT,
    kr_translate TEXT,                -- 번역된 본문
    url TEXT UNIQUE,
    source VARCHAR(100),
    published_at TIMESTAMP,
    ai_score DOUBLE PRECISION,        -- 주가 영향도 (0.0~1.0)
    positive_score DOUBLE PRECISION,  -- 영향 방향 (0.0~1.0)
    ai_analyzed_text TEXT,            -- AI 분석 텍스트
    analyzed_at TIMESTAMP,            -- 분석 시간
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `auth_users` - 사용자
```sql
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    social_provider VARCHAR(20),      -- 'google', 'kakao', null
    social_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `stock_indicators` - 주식 지표
```sql
CREATE TABLE stock_indicators (
    symbol VARCHAR(10) PRIMARY KEY,
    company_name VARCHAR(255),
    current_price DOUBLE PRECISION,
    market_cap BIGINT,
    sector VARCHAR(100),
    industry VARCHAR(100),
    fifty_two_week_high DOUBLE PRECISION,
    fifty_two_week_low DOUBLE PRECISION,
    profit_margin DOUBLE PRECISION,
    current_ratio DOUBLE PRECISION,
    quick_ratio DOUBLE PRECISION,
    last_updated TIMESTAMP
);
```

#### `stock_price_history` - 가격 이력
```sql
CREATE TABLE stock_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) REFERENCES stock_indicators(symbol),
    date DATE NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, date)
);
```

#### `ai_analysis_history` - AI 분석 이력
```sql
CREATE TABLE ai_analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_users(id),
    symbol VARCHAR(10),
    analysis_type VARCHAR(50),        -- 'news_report', 'sentiment', etc.
    analysis_data JSONB,              -- 분석 결과 (JSON)
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_interests` - 사용자 관심사
```sql
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_users(id),
    interest VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, interest)
);
```

#### `email_subscriptions` - 이메일 구독
```sql
CREATE TABLE email_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_users(id),
    email VARCHAR(100) NOT NULL,
    symbols TEXT[],                   -- 구독 종목 배열
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

전체 스키마: [migrations/supabase_schema.sql](migrations/supabase_schema.sql)

---

## 📜 스크립트 가이드

### 뉴스 관련

#### 뉴스 수집
```bash
# 최근 7일 뉴스 수집
python scripts/crawl_news.py --days 7

# 특정 기간 수집
python scripts/crawl_news.py --start 2025-01-01 --end 2025-01-31

# 특정 종목만 수집
python scripts/crawl_news.py --symbols AAPL MSFT GOOGL --days 30
```

자세한 내용: [docs/NEWS_CRAWLING_GUIDE.md](docs/NEWS_CRAWLING_GUIDE.md)

#### 뉴스 번역
```bash
# 미번역 뉴스 50개 번역
python scripts/translate_all_news.py --untranslated --limit 50

# 특정 종목만 번역
python scripts/translate_all_news.py --symbol AAPL --untranslated

# 테스트 (DRY RUN)
python scripts/translate_all_news.py --limit 5 --dry-run
```

#### AI 점수 재평가
```bash
# 미평가 뉴스만 평가
python scripts/re_evaluate_all_news.py --unevaluated --limit 100

# 특정 종목 재평가
python scripts/re_evaluate_all_news.py --symbol AAPL --limit 50

# 테스트 (DRY RUN)
python scripts/re_evaluate_all_news.py --limit 10 --dry-run
```

### 주식 데이터 관련

#### 데이터 수집
```bash
# 전체 수집
python scripts/collect_stock_data.py --full

# 지표만 수집
python scripts/collect_stock_data.py --indicators

# 가격만 수집
python scripts/collect_stock_data.py --prices

# 특정 종목만 강제 수집
python scripts/collect_stock_data.py --symbols AAPL MSFT --force
```

#### 지표 갱신
```bash
python scripts/refresh_stock_indicators.py
```

#### 벡터 임베딩
```bash
# 전체 임베딩
python scripts/embed_stock_data.py --all

# 지표만 임베딩
python scripts/embed_stock_data.py --all --indicators-only

# 가격만 임베딩 (30일 청크)
python scripts/embed_stock_data.py --all --prices-only --chunk-size 30

# 특정 종목만
python scripts/embed_stock_data.py --symbols AAPL MSFT GOOGL
```

---

## 🔐 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```bash
# === JWT 보안 ===
SECRET_KEY=your_super_secret_key_here_minimum_32_characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# === Supabase ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# === OpenAI (GPT-5, Embeddings) ===
OPENAI_API_KEY=sk-your_openai_api_key

# === Anthropic (Claude Sonnet 4.5) ===
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key

# === Event Registry (뉴스 수집) ===
NEWS_API_KEY=your_newsapi_key

# === FMP (주식 데이터) ===
FMP_API_KEY=your_fmp_api_key

# === Pinecone (벡터 DB) ===
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=financial-embeddings
PINECONE_ENVIRONMENT=us-west1-gcp

# === Google OAuth (선택) ===
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v2/social-auth/google/callback

# === Kakao OAuth (선택) ===
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:8000/api/v2/social-auth/kakao/callback

# === Apify (웹 크롤링, 선택) ===
APIFY_API_TOKEN=your_apify_token

# === 기타 ===
ENVIRONMENT=development  # development, production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### API 키 발급 링크

- **Supabase**: https://supabase.com/
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Event Registry**: https://newsapi.ai/
- **FMP**: https://site.financialmodelingprep.com/developer/docs
- **Pinecone**: https://www.pinecone.io/
- **Google OAuth**: https://console.cloud.google.com/
- **Kakao OAuth**: https://developers.kakao.com/

---

## 📊 모니터링 및 로깅

### 헬스 체크

```bash
# 기본 헬스 체크
curl http://localhost:8000/health

# 상세 헬스 체크 (모든 의존성)
curl http://localhost:8000/health/detailed

# 서비스별 상태
curl http://localhost:8000/health/services
```

### 로그 확인

```bash
# FastAPI 서버 로그
tail -f backend.log

# 뉴스 크롤링 로그
tail -f news_crawling.log

# 주식 데이터 수집 로그
tail -f stock_data_collection.log
```

### 자동 스케줄 모니터링

뉴스 스케줄러는 다음 작업을 자동 수행합니다:

| 시간 | 작업 | 빈도 |
|------|------|------|
| 매 6시간 | 뉴스 수집 | 정기적 |
| 새벽 2시 | 주식 지표 수집 | 매일 |
| 새벽 3시 | 가격 이력 수집 | 매일 |

---

## 🛠️ 문제 해결

### 1. "ANTHROPIC_API_KEY가 설정되지 않음"

```bash
# .env 파일 확인
cat .env | grep ANTHROPIC_API_KEY

# 환경 변수 설정
export ANTHROPIC_API_KEY=your_key_here
```

### 2. Supabase 연결 오류

```bash
# 환경 변수 확인
echo $SUPABASE_URL
echo $SUPABASE_KEY

# 연결 테스트
curl http://localhost:8000/health/detailed
```

### 3. "처리할 뉴스가 없습니다"

```bash
# 뉴스 통계 확인
curl http://localhost:8000/api/v2/news-translation/statistics

# 미번역 뉴스 확인
python scripts/translate_all_news.py --untranslated
```

### 4. Pinecone 임베딩 실패

```bash
# Pinecone 상태 확인
curl http://localhost:8000/api/v2/embeddings/embeddings/index/stats

# 인덱스 재생성
python scripts/setup_pinecone_index.py
```

### 5. API 타임아웃

```bash
# 배치 크기 줄이기
python scripts/translate_all_news.py --batch-size 1 --delay 5.0

# 타임아웃 설정 확인 (코드 내)
```

### 6. JWT 토큰 오류

```bash
# SECRET_KEY 길이 확인 (최소 32자)
# .env 파일에서 SECRET_KEY 재생성

# 토큰 재발급
POST /api/v2/auth/login
```

---

## 📈 데이터 통계

| 항목 | 수치 |
|------|------|
| **지원 주식 종목** | 100개 |
| **Stock Indicators** | 93개 |
| **Price History 청크** | 1,209개 |
| **Vector DB 벡터** | 1,302개 |
| **Vector 차원** | 1,536 |
| **뉴스 소스** | 6개 (Reuters, Bloomberg 등) |

---

## 🚢 배포

### Docker

```bash
# 이미지 빌드
docker build -t ai-finance-backend .

# 컨테이너 실행
docker run -p 8000:8000 --env-file .env ai-finance-backend
```

### Google Cloud Run

```bash
# Cloud Build 실행
gcloud builds submit --config cloudbuild.yaml

# 배포
gcloud run deploy ai-finance-backend \
  --image gcr.io/your-project/ai-finance-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📝 변경 이력

### 2025-11-25
- ✅ `.gitignore` 추가 (scripts, migrations 제외)
- ✅ `prompt.txt` → `app/services/news_translation_prompt.txt` 이동
- ✅ 사용하지 않는 파일 정리
- ✅ README 대폭 개선

### 2025-11-13
- ❌ RAG API 제거 (GPT-5 사용 최소화)
- ❌ 레거시 뉴스 수집 제거 (yfinance, Naver)
- ✅ Event Registry 유일 뉴스 소스

### 2025-11-11
- ✅ Claude Sonnet 4.5 번역 시스템 추가
- ✅ GPT-5 AI Score 평가 시스템 추가
- ✅ 뉴스 리포트 생성 기능 추가

### 2025-11-10
- ✅ FMP API 데이터 수집 개선
- ✅ Pinecone 벡터 DB 재구성
- ✅ 데이터 완성도 100% 달성

---

## 📞 지원

문제 발생 시:
1. **로그 확인**: 터미널 출력 및 로그 파일
2. **환경 변수 확인**: `.env` 파일 설정
3. **API 키 유효성 확인**: 각 서비스 콘솔
4. **헬스 체크 실행**: `/health/detailed` 엔드포인트
5. **문서 참조**: `docs/` 폴더의 상세 가이드

---

## 📄 라이선스

본 프로젝트는 교육 및 연구 목적으로 제공됩니다.

**면책조항**: 본 AI 분석 리포트는 투자 참고 자료일 뿐 투자 권유가 아닙니다. 모든 투자 결정은 본인의 책임 하에 이루어져야 합니다.

---

**프로젝트 버전**: 2.0.0
**마지막 업데이트**: 2025-11-25
**작성자**: AI Finance Team
