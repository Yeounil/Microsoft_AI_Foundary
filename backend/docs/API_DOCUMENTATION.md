# AI Finance News Recommendation System - API Documentation

**Version:** 2.0.0
**Base URL:** `http://localhost:8000`
**Last Updated:** 2025-11-13 (Legacy Code Cleanup)

---

## 📋 변경 이력 (Changelog)

### 2025-11-13 - 레거시 코드 정리
**삭제된 API 및 서비스:**
- ❌ **RAG APIs** (`/api/v2/rag/*`) - GPT-5 사용 최소화 정책에 따라 완전히 제거
  - `/api/v2/rag/search/similar-stocks`
  - `/api/v2/rag/context/generate`
  - `/api/v2/rag/query`
  - `/api/v2/rag/compare/{symbol_1}/vs/{symbol_2}`
  - `/api/v2/rag/health`
- ❌ **yfinance 기반 뉴스 수집** - Yahoo Finance 뉴스 스크래핑 제거
- ❌ **Naver API 뉴스 수집** - 한국 뉴스 API 제거
- ❌ **Background News Collector** - 멀티스레드 뉴스 수집기 제거
- ❌ **AI News Recommendation Service** - 레거시 추천 시스템 제거
- ❌ **Fast Recommendation Service** - 중복 추천 서비스 제거

**변경된 서비스:**
- ✏️ **OpenAI Service** - 2개 핵심 함수만 유지:
  - `evaluate_news_stock_impact()` - 뉴스 AI Score 평가 (GPT-5)
  - `generate_embedding()` - 1536차원 임베딩 생성
  - 삭제된 함수: `analyze_news_relevance()`, `analyze_market_sentiment()`, `async_chat_completion()`
- ✏️ **News Scheduler** - `trigger_manual_crawl()` 단순화 (asyncio 기반 순차 처리)

**뉴스 수집 소스:**
- ✅ **Event Registry (newsapi.ai)** - 유일한 뉴스 소스
  - Reuters, Bloomberg, Wall Street Journal, CNBC, MarketWatch, Benzinga
  - 지원 종목: AAPL, GOOGL, GOOG, MSFT, TSLA, NVDA, AMZN, META, NFLX, JPM, JNJ, WMT, XOM, VZ, PFE, 005930.KS, 000660.KS, 035420.KS, 035720.KS

**GPT-5 사용 정책:**
- GPT-5는 **오직 뉴스 AI Score 평가**에만 사용 (`ai_score`, `positive_score`)
- RAG, 감정 분석, 관련성 분석 등 기타 GPT-5 기능 모두 제거

---

## 📑 Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [Stock Data APIs](#2-stock-data-apis)
3. [Analysis APIs](#3-analysis-apis)
4. [News APIs](#4-news-apis)
5. [Recommendations APIs](#5-recommendations-apis)
6. [Embeddings APIs](#6-embeddings-apis)
7. ~~[RAG APIs](#7-rag-apis)~~ ❌ **제거됨 (2025-11-13)**
8. [News AI Score APIs](#8-news-ai-score-apis)
9. [News Translation APIs](#9-news-translation-apis)
10. [Stock Data Collection APIs](#10-stock-data-collection-apis)
11. [System APIs](#11-system-apis)

---

## 1. Authentication APIs

**Base Path:** `/api/v2/auth`

### User Registration & Login

#### `POST /register`
새 사용자 등록
- **Request Body:**
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response:** 사용자 생성 결과

#### `POST /login`
사용자 로그인
- **Request Body:**
  ```json
  {
    "username": "string",  // or email
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "bearer"
  }
  ```

#### `POST /refresh`
액세스 토큰 갱신
- **Request Body:**
  ```json
  {
    "refresh_token": "string"
  }
  ```
- **Response:** 새로운 토큰

#### `POST /logout`
로그아웃 (단일 기기)
- **Request Body:** `{ "refresh_token": "string" }`

#### `POST /logout-all`
모든 기기에서 로그아웃
- **Auth Required:** Yes

### User Profile

#### `GET /me`
현재 사용자 정보 조회
- **Auth Required:** Yes

#### `GET /verify`
토큰 유효성 검증
- **Auth Required:** Yes

#### `GET /profile`
사용자 프로필 조회
- **Auth Required:** Yes

#### `PUT /profile`
사용자 프로필 업데이트
- **Auth Required:** Yes
- **Request Body:** 프로필 데이터 (email 등)

### User Interests

#### `GET /interests`
사용자 관심사 목록 조회
- **Auth Required:** Yes

#### `POST /interests`
관심사 추가
- **Auth Required:** Yes
- **Request Body:** `{ "interest": "string" }`

#### `DELETE /interests/{interest_id}`
관심사 삭제 (ID로)
- **Auth Required:** Yes

### Sessions

#### `GET /sessions`
활성 세션 목록 조회
- **Auth Required:** Yes

---

## 2. Stock Data APIs

**Base Path:** `/api/v1/stocks`

### Stock Information

#### `GET /supported`
지원하는 100개 종목 심볼 리스트
- **Response:**
  ```json
  {
    "total_count": 100,
    "categories": {
      "tech": ["AAPL", "MSFT", ...],
      "finance": ["JPM", "BAC", ...],
      ...
    },
    "all_symbols": ["AAPL", "MSFT", ...]
  }
  ```

#### `GET /list`
모든 거래 가능한 미국 주식 종목 리스트
- **Query Params:**
  - `market_cap_more_than`: 최소 시가총액 (기본: 1B)
  - `limit`: 최대 종목 수 (기본: 500)

#### `POST /quotes`
여러 종목의 현재 가격 배치 조회
- **Request Body:** `["AAPL", "MSFT", "GOOGL"]`
- **Response:**
  ```json
  {
    "count": 3,
    "quotes": [
      {
        "symbol": "AAPL",
        "price": 175.50,
        "change": 2.50,
        "changePercent": 1.44
      }
    ]
  }
  ```

#### `GET /search`
주식 검색
- **Query Params:** `q` (검색어)

#### `GET /{symbol}`
주식 데이터 조회 및 DB 저장
- **Query Params:**
  - `period`: 조회 기간 (1d, 5d, 1mo, 1y 등)
  - `market`: 시장 구분 (us)
  - `interval`: 데이터 간격 (1d, 1wk, 1mo)
  - `save_to_db`: DB 저장 여부 (기본: true)

#### `GET /{symbol}/indicators`
주식 지표 조회 (DB 우선)
- **Query Params:**
  - `force_api`: API 강제 호출 여부 (기본: false)
- **Response:** 주식 지표 (현재가, 52주 고/저가, 재무 비율 등)

#### `GET /{symbol}/chart`
차트용 주식 데이터 조회 (DB 우선, 5년치 데이터)
- **Query Params:**
  - `period`: 조회 기간 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y)
  - `market`: 시장 구분
  - `force_api`: API 강제 호출 (기본: false)

#### `GET /{symbol}/intraday`
분단위 Intraday 차트 데이터
- **Query Params:**
  - `interval`: 1min, 5min, 15min, 30min, 1hour
  - `from_date`: 시작 날짜
  - `to_date`: 종료 날짜

#### `POST /{symbol}/save-to-db`
주식 데이터를 DB에 수동 저장
- **Query Params:** `save_price_history` (기본: true)

---

## 3. Analysis APIs

### Analysis (Supabase) - `/api/v2/analysis`

#### `POST /stock/{symbol}`
주식 AI 분석 (DB 저장)
- **Auth Required:** Yes
- **Query Params:**
  - `market`: us 또는 kr
  - `period`: 분석 기간 (기본: 1y)
- **Response:** AI 분석 결과

#### `GET /stock/{symbol}/history`
특정 종목의 분석 기록 조회
- **Auth Required:** Yes
- **Query Params:** `limit` (기본: 5)

#### `GET /history`
사용자의 모든 분석 기록
- **Auth Required:** Yes
- **Query Params:** `limit` (기본: 10)

#### `GET /market-summary`
전체 시장 요약 분석
- **Auth Required:** Yes

#### `POST /favorites/{symbol}`
관심 종목 추가
- **Auth Required:** Yes
- **Query Params:** `company_name` (선택)

#### `GET /favorites`
관심 종목 조회
- **Auth Required:** Yes

#### `DELETE /favorites/{symbol}`
관심 종목 제거
- **Auth Required:** Yes

#### `GET /search-history`
사용자 검색 기록 조회
- **Auth Required:** Yes
- **Query Params:** `limit` (기본: 20)

### Analysis (v1) - `/api/v1/analysis`

#### `POST /stock/{symbol}`
주식 기술적 분석 (v1 호환성)
- **Query Params:**
  - `market`: us 또는 kr
  - `period`: 분석 기간

#### `GET /market-summary`
시장 요약 정보 (v1 호환성)

---

## 4. News APIs

### News (Supabase) - `/api/v2/news`

#### `GET /test`
테스트용 뉴스 엔드포인트

#### `GET /test-ai`
테스트용 AI 분석 엔드포인트

#### `GET /test-supabase`
Supabase 연결 테스트

#### `GET /latest`
최신 뉴스 조회 (DB 직접 조회, 페이지네이션 지원)
- **Query Params:**
  - `limit`: 가져올 뉴스 개수 (기본: 20)
  - `offset`: 건너뛸 뉴스 개수 (기본: 0)
  - `start_date`: 시작 날짜 (YYYY-MM-DD)
  - `end_date`: 종료 날짜 (YYYY-MM-DD)
  - `sort_by`: published_date 또는 ai_score
  - `order`: asc 또는 desc

#### `GET /stock/{symbol}/public`
특정 종목 뉴스 조회 (DB 직접 조회, 페이지네이션)
- **Query Params:** `/latest`와 동일

#### `GET /financial`
금융 뉴스 가져오기
- **Auth Required:** Yes
- **Query Params:**
  - `query`: 검색 키워드
  - `limit`: 뉴스 개수
  - `lang`: en 또는 kr

#### `GET /stock/{symbol}`
특정 주식 관련 뉴스 (AI 추천 시스템)
- **Auth Required:** Yes
- **Query Params:**
  - `limit`: 뉴스 개수
  - `ai_mode`: AI 추천 모드 (기본: true)

#### `POST /summarize`
뉴스 AI 요약 (DB 저장)
- **Auth Required:** Yes

#### `POST /summarize-article`
개별 뉴스 기사 AI 요약
- **Auth Required:** Yes

#### `POST /stock/{symbol}/summarize`
특정 주식 뉴스 AI 요약
- **Auth Required:** Yes

#### `GET /summaries/history`
뉴스 요약 기록 조회
- **Auth Required:** Yes

#### `GET /history`
사용자 뉴스 조회 기록
- **Auth Required:** Yes

### News (v1) - `/api/v1/news`

#### `GET /financial`
금융 뉴스 가져오기 (v1) - 페이지네이션 지원
- **Query Params:**
  - `symbol`: 특정 종목 심볼 (옵셔널)
  - `limit`: 가져올 뉴스 개수 (기본: 5)
  - `page`: 페이지 번호, 1부터 시작 (기본: 1)
  - `lang`: 언어 (en 또는 kr, 기본: en)
- **필터링 조건:**
  - `kr_translate`가 NULL이 아닌 기사만
  - `ai_score`가 0.5 이상인 기사만
  - `published_at` 내림차순 정렬 (최신 기사부터)
  - `symbol`이 제공되면 해당 종목 기사만
- **Response:**
  ```json
  {
    "symbol": "AAPL",
    "language": "en",
    "page": 1,
    "limit": 10,
    "total_count": 10,
    "articles": [...]
  }
  ```
- **사용 예시:**
  ```bash
  # 1페이지, 5개 기사
  GET /api/v1/news/financial?limit=5&page=1

  # 2페이지, 5개 기사 (1페이지 다음 기사)
  GET /api/v1/news/financial?limit=5&page=2

  # 특정 종목(AAPL)의 1페이지
  GET /api/v1/news/financial?symbol=AAPL&limit=5&page=1
  ```

#### `GET /{news_id}`
뉴스 ID로 특정 뉴스 상세 정보 조회
- **Path Params:**
  - `news_id`: 뉴스 ID (정수)
- **Response:**
  ```json
  {
    "id": 2151,
    "symbol": "NVDA",
    "title": "...",
    "description": "...",
    "content": "...",
    "body": "...",
    "url": "...",
    "source": "CNBC",
    "published_at": "2025-11-12T14:16:41+00:00",
    "kr_translate": "...",
    "ai_score": 0.7,
    "positive_score": 0.65
  }
  ```
- **Error Response:**
  - `404`: 뉴스를 찾을 수 없습니다
- **사용 예시:**
  ```bash
  GET /api/v1/news/2151
  ```

#### `GET /stock/{symbol}`
특정 주식 뉴스 (DB 기반)
- **Query Params:**
  - `limit`: 뉴스 개수
  - `force_crawl`: 강제 크롤링

#### `POST /stock/{symbol}/crawl`
특정 주식 뉴스 크롤링
- **뉴스 소스:** Event Registry (newsapi.ai)
  - Reuters, Bloomberg, WSJ, CNBC, MarketWatch, Benzinga
- **지원 종목:** AAPL, GOOGL, GOOG, MSFT, TSLA, NVDA, AMZN, META, NFLX, JPM, JNJ, WMT, XOM, VZ, PFE, 005930.KS, 000660.KS, 035420.KS, 035720.KS

#### `POST /stock/{symbol}/analyze`
뉴스 기반 주식 분석
- **Query Params:**
  - `analysis_days`: 분석 기간
  - `news_limit`: 분석할 뉴스 개수

#### `POST /summarize`
뉴스 AI 요약 (v1)

#### `POST /stock/{symbol}/summarize`
특정 주식 뉴스 요약 (v1)

---

## 5. Recommendations APIs

**Base Path:** `/api/v2/recommendations`

### User Interests

#### `GET /interests`
사용자 관심사 목록
- **Auth Required:** Yes

#### `POST /interests`
관심사 추가
- **Auth Required:** Yes

#### `DELETE /interests/{interest_id}`
관심사 삭제 (ID)
- **Auth Required:** Yes

#### `DELETE /interests/symbol/{interest}`
관심사 삭제 (심볼)
- **Auth Required:** Yes

#### `PUT /interests/{interest_id}`
관심사 업데이트
- **Auth Required:** Yes

#### `GET /interests/for-recommendations`
추천용 관심사 목록
- **Auth Required:** Yes

#### `GET /interests/statistics`
관심사 통계
- **Auth Required:** Yes

### AI Recommendations

#### `GET /news/recommended`
AI 기반 관심사 추천 뉴스 (빠른 모드)
- **Auth Required:** Yes
- **Query Params:**
  - `limit`: 추천 뉴스 개수 (기본: 10)
  - `fast_mode`: 빠른 모드 (기본: true)

#### `GET /news/ai-sentiment`
AI 기반 시장 감정 분석
- **Auth Required:** Yes
- **Query Params:**
  - `symbols`: 분석할 종목 심볼들
  - `days_back`: 분석 기간 (일)

#### `GET /news/ai-insights/{symbol}`
특정 종목 AI 인사이트
- **Auth Required:** Yes

#### `POST /news/auto-collect`
관심사 기반 자동 뉴스 수집
- **Auth Required:** Yes

#### `POST /news/background-collect`
백그라운드 뉴스 수집
- **Auth Required:** Yes

#### `GET /news/trending`
트렌딩 뉴스 조회
- **Auth Required:** Yes
- **Query Params:** `limit` (기본: 10)

#### `POST /news/cleanup`
오래된 뉴스 정리
- **Auth Required:** Yes
- **Query Params:** `days_old` (기본: 7)

---

## 6. Embeddings APIs

**Base Path:** `/api/v2/embeddings`

### Stock Embeddings

#### `POST /stock/{symbol}/embed`
단일 종목 지표 임베딩
- **Response:** Pinecone 저장 결과

#### `POST /stock/{symbol}/embed-comprehensive`
종목 종합 임베딩 (지표 + 주가 + 뉴스)
- **Query Params:** `include_news` (기본: true)

#### `POST /stocks/embed-batch`
여러 종목 배치 임베딩
- **Query Params:** `symbols` (리스트)

#### `POST /stock/{symbol}/embed-price-history`
주가 히스토리 임베딩
- **Query Params:** `chunk_size` (기본: 30일)

#### `POST /stock/{symbol}/embed-news`
최근 뉴스 임베딩
- **Query Params:** `limit` (기본: 5)

### Batch Operations

#### `POST /stocks/embed-all-indicators`
DB의 모든 stock_indicators 임베딩

#### `POST /stocks/embed-all-prices`
DB의 모든 stock_price_history 임베딩
- **Query Params:** `chunk_size` (기본: 30)

### Management

#### `DELETE /embeddings/{symbol}`
특정 종목의 모든 임베딩 삭제

#### `GET /embeddings/index/stats`
Pinecone 인덱스 통계

#### `POST /embeddings/search/similar-stocks`
유사 종목 검색 (향후 구현)

---

## ~~7. RAG APIs~~ ❌ **완전 제거됨 (2025-11-13)**

**Base Path:** ~~`/api/v2/rag`~~ ❌ **삭제됨**

**제거 사유:** GPT-5 사용 최소화 정책에 따라 RAG 기능 전체 제거

### ~~Vector Search~~ ❌ 제거됨

- ~~`POST /search/similar-stocks`~~ - 유사한 주식 검색 (Pinecone)
- ~~`POST /context/generate`~~ - RAG용 컨텍스트 생성
- ~~`POST /query`~~ - RAG를 활용한 GPT-5 쿼리

### ~~Stock Comparison~~ ❌ 제거됨

- ~~`GET /compare/{symbol_1}/vs/{symbol_2}`~~ - 두 종목 비교 분석

### ~~Health~~ ❌ 제거됨

- ~~`GET /health`~~ - RAG 서비스 상태 확인

**대체 방안:**
- 유사 종목 검색은 Embeddings API (`/api/v2/embeddings/search/similar-stocks`)를 통해 향후 구현 예정
- 주식 비교는 프론트엔드에서 두 종목의 지표를 개별 조회 후 클라이언트 측에서 비교

---

## 8. News AI Score APIs

**Base Path:** `/api/v2/news-ai-score`

**✅ GPT-5 사용:** 이 API만이 GPT-5를 사용합니다 (뉴스 영향도 평가)

### Score Evaluation

#### `POST /news/{news_id}/evaluate-score`
특정 뉴스의 AI Score 평가 (0.0~1.0)
- **GPT-5 사용:** ✅ Yes (유일한 GPT-5 사용처)
- **Response:**
  ```json
  {
    "status": "success",
    "news_id": 123,
    "ai_score": 0.65,
    "positive_score": 0.75,
    "impact_direction": "positive",
    "confidence": "high",
    "reasoning": "...",
    "updated": true
  }
  ```
- **평가 항목:**
  - `ai_score`: 뉴스의 영향 크기 (0.0 = 영향 없음, 1.0 = 매우 큰 영향)
  - `positive_score`: 뉴스의 방향성 (0.0 = 매우 부정적, 0.5 = 중립, 1.0 = 매우 긍정적)
  - `impact_direction`: positive, negative, neutral
  - `confidence`: high, medium, low
  - `reasoning`: AI의 평가 근거 설명

#### `POST /news/batch-evaluate`
여러 뉴스 배치 평가
- **Request Body:**
  ```json
  {
    "news_ids": [101, 102, 103],
    "batch_size": 5,
    "delay": 1.0
  }
  ```

#### `POST /news/evaluate-unevaluated`
미평가 뉴스 자동 평가
- **Query Params:**
  - `limit`: 최대 처리 개수 (1~200)
  - `symbol`: 특정 종목만 (선택)

### Statistics

#### `GET /statistics`
뉴스 AI Score 통계
- **Query Params:** `symbol` (선택)

#### `GET /health`
AI Score 서비스 상태 확인

---

## 9. News Translation APIs

**Base Path:** `/api/v2/news-translation`

**Translation Engine:** Claude Sonnet API (Anthropic)

### Translation

#### `POST /news/{news_id}/translate`
단일 뉴스 번역 (Claude Sonnet)

#### `POST /batch-translate`
배치 뉴스 번역
- **Query Params:**
  - `news_ids`: 번역할 뉴스 ID 목록
  - `limit`: 최대 처리 개수
  - `untranslated_only`: 미번역만 처리
  - `batch_size`: 동시 처리 개수 (기본: 3)
  - `delay`: 배치 간 딜레이 (기본: 2.0초)

#### `POST /translate-untranslated`
미번역 뉴스 자동 번역
- **Query Params:**
  - `limit`: 최대 처리 개수 (기본: 50)
  - `batch_size`: 동시 처리 개수 (기본: 3)
  - `delay`: 배치 간 딜레이 (기본: 2.0초)

### Statistics

#### `GET /statistics`
번역 통계 조회

#### `GET /health`
번역 서비스 상태 확인

---

## 10. Stock Data Collection APIs

**Base Path:** `/api/stock-data`

### Manual Collection

#### `POST /collect/indicators`
주식 지표 수집 트리거
- **Query Params:**
  - `symbols`: 종목 리스트 (없으면 전체 100개)
  - `force_refresh`: 재수집 여부

#### `POST /collect/prices`
주식 가격 이력 수집 (5년)
- **Query Params:**
  - `symbols`: 종목 리스트
  - `force_refresh`: 재수집 여부

#### `POST /collect/full`
전체 주식 데이터 수집 (지표 + 가격)
- **Query Params:**
  - `symbols`: 종목 리스트
  - `force_refresh`: 재수집 여부

### Data Retrieval

#### `GET /indicators/{symbol}`
특정 종목의 주식 지표 조회

#### `GET /indicators`
모든 주식 지표 조회
- **Query Params:**
  - `limit`: 조회 개수 (1~100)
  - `sector`: 섹터 필터

#### `GET /prices/{symbol}`
특정 종목의 가격 이력 조회
- **Query Params:**
  - `limit`: 최신 레코드 개수 (1~500)
  - `start_date`: 시작 날짜 (YYYY-MM-DD)

#### `GET /sync-history`
주식 데이터 동기화 이력
- **Query Params:**
  - `limit`: 조회 개수
  - `status_filter`: completed, failed, in_progress

#### `GET /stats`
주식 데이터 통계 조회

---

## 11. System APIs

### Health Checks

#### `GET /`
루트 엔드포인트
- **Response:** 시스템 정보

#### `GET /health`
기본 헬스 체크
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-11-13T...",
    "version": "2.0.0"
  }
  ```

#### `GET /health/detailed`
상세 헬스 체크 (모든 의존성 확인)
- **Response:** API 서버, Supabase, 스케줄러, 설정 상태

#### `GET /health/services`
각 서비스별 상태 체크
- **Response:**
  ```json
  {
    "services": {
      "supabase": "✅ Connected",
      "scheduler": {
        "status": "✅ Running",
        "is_running": true
      }
    },
    "api_keys": {
      "openai": "✅ Configured",
      "fmp": "✅ Configured",
      "anthropic": "⚠️ Missing",
      ...
    }
  }
  ```

---

## 🔐 Authentication

대부분의 API는 JWT 토큰 인증이 필요합니다.

### Headers
```
Authorization: Bearer <access_token>
```

### Token Refresh
액세스 토큰 만료 시 `/api/v2/auth/refresh` 엔드포인트로 갱신하세요.

---

## 📊 Response Format

### Success Response
```json
{
  "status": "success",
  "data": { ... },
  "message": "..."
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

---

## 🚀 API 사용 예시

### 1. 사용자 로그인 및 종목 조회
```bash
# 로그인
curl -X POST http://localhost:8000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}'

# 토큰 받기 -> access_token 사용

# 종목 지표 조회 (DB 우선)
curl http://localhost:8000/api/v1/stocks/AAPL/indicators
```

### 2. 차트 데이터 조회 (DB에서 빠르게)
```bash
curl http://localhost:8000/api/v1/stocks/AAPL/chart?period=1y
```

### 3. 뉴스 조회 (페이지네이션)
```bash
curl "http://localhost:8000/api/v2/news/latest?limit=20&offset=0&sort_by=ai_score&order=desc"
```

### 4. AI 추천 뉴스 받기
```bash
curl -X GET http://localhost:8000/api/v2/recommendations/news/recommended?limit=10 \
  -H "Authorization: Bearer <token>"
```

### 5. 뉴스 AI Score 평가 (GPT-5 사용)
```bash
curl -X POST http://localhost:8000/api/v2/news-ai-score/news/2151/evaluate-score
```

---

## 🏗️ 시스템 아키텍처

### 데이터 소스
- **News:** Event Registry (newsapi.ai)
  - Reuters, Bloomberg, WSJ, CNBC, MarketWatch, Benzinga
- **Stock Data:** Financial Modeling Prep (FMP)
- **AI Evaluation:** GPT-5 (OpenAI) - 뉴스 영향도 평가만
- **Translation:** Claude Sonnet (Anthropic)
- **Vector DB:** Pinecone (1536차원 임베딩)
- **Database:** Supabase Cloud (PostgreSQL)

### 자동화 스케줄러
- **2시간마다:** 인기 종목 뉴스 자동 크롤링
- **매일 자정:** 1년 이상 된 뉴스 자동 삭제
- **매일 새벽 2시:** 주식 지표 수집 (100개 종목)
- **매일 새벽 3시:** 주가 이력 수집 (5년치)
- **매일 새벽 4시:** 주식 지표 임베딩 (Pinecone)
- **매일 새벽 5시:** 주가 이력 임베딩 (Pinecone)

### 지원 종목 (19개)
**미국 주식 (15개):**
- Tech: AAPL, GOOGL, GOOG, MSFT, NVDA, TSLA, AMZN, META, NFLX
- Finance: JPM
- Healthcare: JNJ, PFE
- Retail: WMT
- Energy: XOM
- Telecom: VZ

**한국 주식 (4개):**
- 005930.KS (삼성전자)
- 000660.KS (SK하이닉스)
- 035420.KS (네이버)
- 035720.KS (카카오)

---

## 📝 Notes

- **DB 우선 조회**: 차트 및 지표 API는 DB에서 먼저 조회하여 속도를 최적화했습니다
- **페이지네이션**: 뉴스 API는 `limit`, `offset` 파라미터로 페이지네이션을 지원합니다
- **AI 기능**:
  - GPT-5: 뉴스 AI Score 평가만 사용 (`ai_score`, `positive_score`)
  - Claude Sonnet: 뉴스 번역
  - ❌ RAG, 감정 분석, 관련성 분석 등 기타 GPT-5 기능 제거됨
- **Vector DB**: Pinecone을 통한 임베딩 저장 (RAG 기능은 제거)
- **뉴스 소스**: Event Registry (newsapi.ai) 단일 소스 사용
  - ❌ yfinance, Yahoo Finance, Naver API 제거됨

---

## 🔧 기술 스택

- **Backend:** FastAPI (Python 3.13.4)
- **Frontend:** Next.js 16.0.1 (React 19)
- **Database:** Supabase Cloud (PostgreSQL)
- **Vector DB:** Pinecone (financial-embedding index, 1536 dimensions)
- **AI Services:**
  - OpenAI GPT-5 (뉴스 영향도 평가)
  - OpenAI text-embedding-3-small (1536차원 임베딩)
  - Anthropic Claude Sonnet (번역)
- **Data APIs:**
  - Event Registry (newsapi.ai) - 뉴스
  - Financial Modeling Prep (FMP) - 주식 데이터
- **Scheduler:** APScheduler (AsyncIO)
- **Authentication:** JWT (Supabase Auth)

---

**마지막 업데이트:** 2025-11-13 (Legacy Code Cleanup - RAG 제거, GPT-5 사용 최소화)
