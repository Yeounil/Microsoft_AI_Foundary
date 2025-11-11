# Backend API Guide

## 기술 스택
- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (Access Token + Refresh Token)
- **AI/ML**: OpenAI GPT-5
- **Real-time**: Native WebSocket (not Socket.IO)
- **Stock Data**: FMP (Financial Modeling Prep) API
- **Scheduler**: Background news collector

## API 버전
- **v1**: 레거시 API (호환성 유지)
- **v2**: 메인 API (Supabase 통합)

## API Base URL
```
http://localhost:8000
```

## 인증 (Authentication)

### 회원가입
```
POST /api/v2/auth/register
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

### 로그인
```
POST /api/v2/auth/login
{
  "username": "string", // or email
  "password": "string"
}
Response:
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

### 토큰 갱신
```
POST /api/v2/auth/refresh
{
  "refresh_token": "string"
}
```

### 사용자 정보
```
GET /api/v2/auth/me
Headers: Authorization: Bearer {access_token}
```

### 로그아웃
```
POST /api/v2/auth/logout
{
  "refresh_token": "string"
}
```

### 관심사 관리
```
GET /api/v2/auth/interests
POST /api/v2/auth/interests
DELETE /api/v2/auth/interests/{interest_id}
```

## 주식 데이터 (Stock)

### 주식 검색
```
GET /api/v1/stocks/search?q={query}
```

### 주식 데이터 조회
```
GET /api/v1/stocks/{symbol}
Query params:
- period: 1d, 5d, 1mo, 3mo, 6mo, 1y
- interval: 1d, 5d, 1wk, 1mo
- save_to_db: boolean (default: true)
```

### 차트 데이터
```
GET /api/v1/stocks/{symbol}/chart
Query params:
- period: 1d, 5d, 1mo, 3mo, 6mo, 1y
- interval: 1d, 5d, 1wk, 1mo
```

### 주식 지표
```
GET /api/v1/stocks/{symbol}/indicators
```

## 뉴스 (News)

### 최신 뉴스 (인증 불필요)
```
GET /api/v2/news/latest?limit=10
```

### 종목별 뉴스 (인증 불필요)
```
GET /api/v2/news/stock/{symbol}/public?limit=10
```

### 금융 뉴스 (인증 필요)
```
GET /api/v2/news/financial
Query params:
- query: string (default: "finance")
- limit: number
- lang: "en" | "kr"
Headers: Authorization: Bearer {access_token}
```

### AI 기반 종목 뉴스 추천
```
GET /api/v2/news/stock/{symbol}
Query params:
- limit: number
- ai_mode: boolean (default: true)
Headers: Authorization: Bearer {access_token}
```

### 뉴스 요약
```
POST /api/v2/news/summarize
Query params:
- query: string
- limit: number
- lang: "en" | "kr"
Headers: Authorization: Bearer {access_token}
```

### 개별 기사 요약
```
POST /api/v2/news/summarize-article
Body: {
  "title": "string",
  "content": "string",
  "url": "string"
}
Headers: Authorization: Bearer {access_token}
```

### 종목 뉴스 요약
```
POST /api/v2/news/stock/{symbol}/summarize
Query params:
- limit: number
Headers: Authorization: Bearer {access_token}
```

### 뉴스 조회 이력
```
GET /api/v2/news/history?limit=20
Headers: Authorization: Bearer {access_token}
```

## 분석 (Analysis)

### 종목 분석
```
POST /api/v2/analysis/stock
Body: {
  "symbol": "string",
  "period": "1mo" | "3mo" | "6mo" | "1y"
}
Headers: Authorization: Bearer {access_token}
```

### 포트폴리오 분석
```
POST /api/v2/analysis/portfolio
Body: {
  "stocks": ["AAPL", "MSFT", "GOOGL"],
  "weights": [0.4, 0.3, 0.3]
}
Headers: Authorization: Bearer {access_token}
```

### 분석 이력
```
GET /api/v2/analysis/history?limit=10
Headers: Authorization: Bearer {access_token}
```

## AI 추천 (Recommendations)

### 개인화 추천
```
GET /api/v2/recommendations/personalized?limit=10
Headers: Authorization: Bearer {access_token}
```

### 종목별 추천
```
GET /api/v2/recommendations/stock/{symbol}?limit=5
Headers: Authorization: Bearer {access_token}
```

### 유사 뉴스 추천
```
POST /api/v2/recommendations/similar
Body: {
  "article_url": "string",
  "limit": 5
}
Headers: Authorization: Bearer {access_token}
```

## 실시간 데이터 (WebSocket)

### WebSocket 연결
```
ws://localhost:8000/api/v2/realtime/ws/prices
```

### 메시지 형식

**구독**:
```json
{
  "action": "subscribe",
  "symbols": ["AAPL", "MSFT", "TSLA"]
}
```

**구독 해제**:
```json
{
  "action": "unsubscribe",
  "symbols": ["AAPL"]
}
```

**서버 응답**:
```json
{
  "type": "price_update",
  "symbol": "AAPL",
  "timestamp": 1234567890,
  "last_price": 150.25,
  "last_size": 1000,
  "ask_price": 150.30,
  "ask_size": 500,
  "bid_price": 150.20,
  "bid_size": 500
}
```

### REST API (실시간 데이터)

**구독 상태 확인**:
```
GET /api/v2/realtime/status
```

**캐시된 가격 조회**:
```
GET /api/v2/realtime/cache/{symbol}
GET /api/v2/realtime/cache?limit=50
```

## 임베딩 & RAG

### 문서 임베딩
```
POST /api/v2/embeddings/embed
Body: {
  "content": "string",
  "metadata": {}
}
Headers: Authorization: Bearer {access_token}
```

### RAG 질의
```
POST /api/v2/rag/query
Body: {
  "question": "string",
  "context_type": "news" | "financial" | "general",
  "limit": 5
}
Headers: Authorization: Bearer {access_token}
```

## 뉴스 AI 점수

### 뉴스 영향도 평가
```
POST /api/v2/news-ai-score/evaluate
Body: {
  "title": "string",
  "content": "string",
  "symbol": "string"
}
Headers: Authorization: Bearer {access_token}
```

### 배치 평가
```
POST /api/v2/news-ai-score/batch-evaluate
Body: {
  "articles": [
    {
      "title": "string",
      "content": "string",
      "symbol": "string"
    }
  ]
}
Headers: Authorization: Bearer {access_token}
```

## 헬스 체크

### 기본 헬스 체크
```
GET /health
```

### 상세 헬스 체크
```
GET /health/detailed
```

### 서비스별 상태
```
GET /health/services
```

## 에러 응답 형식
```json
{
  "detail": "Error message"
}
```

## HTTP 상태 코드
- 200: 성공
- 201: 생성 성공
- 400: 잘못된 요청
- 401: 인증 필요/실패
- 403: 권한 없음
- 404: 리소스를 찾을 수 없음
- 409: 충돌 (예: 당일 재호출)
- 422: 처리할 수 없는 엔티티
- 500: 서버 에러
- 503: 서비스 이용 불가

## 주요 특징

### 1. JWT 인증
- Access Token: 30분 유효
- Refresh Token: 7일 유효
- Bearer 토큰 방식

### 2. 실시간 데이터
- Native WebSocket 사용 (Socket.IO 아님)
- FMP WebSocket API 연동
- 실시간 주가 스트리밍

### 3. AI 기능
- OpenAI GPT-5 뉴스 요약
- AI 기반 뉴스 추천
- 뉴스 영향도 평가
- RAG (Retrieval Augmented Generation)

### 4. 데이터베이스
- Supabase (PostgreSQL)
- RLS (Row Level Security) 적용
- 사용자별 데이터 격리

### 5. API 제한
- FMP API: 하루 250 호출 제한 (Free tier)
- 당일 재호출 방지 (409 Conflict)
- 자동 캐싱 메커니즘

## 프론트엔드 개발 시 주의사항

1. **WebSocket**: Socket.IO가 아닌 native WebSocket API 사용
2. **인증**: 모든 인증 필요 엔드포인트에 Bearer 토큰 헤더 포함
3. **토큰 갱신**: Access Token 만료 전 Refresh Token으로 갱신
4. **에러 처리**: 409 에러는 당일 재호출 제한
5. **CORS**: 개발 시 localhost:3000 허용됨
6. **날짜/시간**: UTC 기준, 프론트엔드에서 로컬 시간으로 변환
7. **심볼**: 대문자로 정규화 (예: AAPL, MSFT)
8. **한국 주식**: FMP API 미지원, 미국 주식만 가능

## 환경변수 (참고)
```
SUPABASE_URL=https://nrsftmbbcktetgbhtydb.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
FMP_API_KEY=...
```