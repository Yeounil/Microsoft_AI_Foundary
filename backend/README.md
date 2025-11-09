# AI 주식 분석 플랫폼 - 완성 문서

## 📋 프로젝트 개요

AI 기반 금융 데이터 수집 및 분석 시스템입니다. FMP API로부터 100개 주식의 데이터를 수집하고, Vector DB(Pinecone)에 임베딩하여 RAG(Retrieval Augmented Generation) 기반 검색을 제공합니다.

---

## 🎯 핵심 기능

### 1. 데이터 수집 (FMP API)
- **Stock Indicators**: 회사 정보, 재무 지표, 기술 지표
- **Price History**: 5년 일별 가격 데이터 (OHLCV)
- **자동 스케줄**: 매일 새벽 2시, 3시 자동 수집

### 2. Vector DB 임베딩 (Pinecone)
- **1,302개 벡터** 저장됨
- **93개 Stock Indicators** (회사별 정보)
- **1,209개 Price Chunks** (30일 단위로 분할)
- **차원**: 1,536 (OpenAI text-embedding-ada-002)

### 3. RAG 기반 검색
- 유사 종목 검색
- 자연어 쿼리로 주식 정보 조회
- GPT-5 기반 지능형 분석

### 4. 뉴스 분석 및 추천
- 자동 뉴스 수집 및 분류
- 관련성 분석
- 개인화된 추천

---

## 📁 프로젝트 구조

```
E:\Microsoft_AI_Foundary\backend\
├── app/
│   ├── api/
│   │   ├── embeddings.py         # Vector DB 임베딩 API
│   │   ├── news.py               # 뉴스 API
│   │   ├── rag.py                # RAG 검색 API
│   │   └── stock_data.py         # 주식 데이터 API
│   ├── services/
│   │   ├── fmp_stock_data_service.py      # FMP API 통합
│   │   ├── textification_service.py       # 수치→자연어 변환
│   │   ├── financial_embedding_service.py # 임베딩 서비스
│   │   ├── rag_service.py                 # RAG 검색
│   │   ├── pinecone_service.py            # Pinecone 관리
│   │   ├── openai_service.py              # OpenAI API
│   │   ├── news_service.py                # 뉴스 분석
│   │   ├── news_scheduler.py              # 자동 스케줄
│   │   └── ai_news_recommendation_service.py
│   ├── db/
│   │   └── supabase_client.py    # Supabase 연결
│   └── main.py                   # FastAPI 앱
├── scripts/
│   ├── embed_stock_data.py       # 임베딩 실행 스크립트
│   ├── refresh_stock_indicators.py # 지표 새로고침 스크립트
│   └── collect_stock_data.py     # 데이터 수집 스크립트
├── supabase_schema.sql           # DB 스키마
└── README.md                     # 이 문서
```

---

## 🚀 사용 방법

### 1. 데이터 수집 (수동 실행)

```bash
# 주식 지표 새로고침
python scripts/refresh_stock_indicators.py

# 주식 데이터 수집
python scripts/collect_stock_data.py --indicators      # 지표만
python scripts/collect_stock_data.py --prices         # 가격 이력만
python scripts/collect_stock_data.py --full           # 전체

# 특정 종목만 강제 수집
python scripts/collect_stock_data.py --symbols AAPL MSFT GOOGL --force
```

### 2. 임베딩 (수동 실행)

```bash
# 지표만 임베딩
python scripts/embed_stock_data.py --all --indicators-only

# 가격 이력만 임베딩
python scripts/embed_stock_data.py --all --prices-only --chunk-size 30

# 전체 임베딩
python scripts/embed_stock_data.py --all

# 특정 종목만
python scripts/embed_stock_data.py --symbols AAPL MSFT GOOGL
```

### 3. API 호출

**데이터 수집 API**:
```bash
# 지표 수집
curl -X POST http://localhost:8000/api/stock-data/collect/indicators

# 가격 수집
curl -X POST http://localhost:8000/api/stock-data/collect/prices

# 전체 수집
curl -X POST http://localhost:8000/api/stock-data/collect/full
```

**데이터 조회 API**:
```bash
# 모든 지표
curl http://localhost:8000/api/stock-data/indicators

# 특정 종목
curl http://localhost:8000/api/stock-data/indicators/AAPL

# 가격 이력
curl http://localhost:8000/api/stock-data/prices/AAPL

# 통계
curl http://localhost:8000/api/stock-data/stats
```

**RAG 검색**:
```bash
curl -X POST http://localhost:8000/api/rag/search-similar-stocks \
  -H "Content-Type: application/json" \
  -d '{"query": "AI companies", "top_k": 5}'

curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Apple과 유사한 회사는?"}'
```

**임베딩 상태**:
```bash
curl http://localhost:8000/api/v2/embeddings/embeddings/index/stats
```

---

## 🗄️ 데이터베이스 스키마

### stock_indicators (주식 지표)
```sql
- symbol: TEXT (PK)
- company_name: TEXT
- current_price: FLOAT
- market_cap: BIGINT
- sector: TEXT
- industry: TEXT
- fifty_two_week_high/low: FLOAT
- profit_margin: FLOAT
- current_ratio: FLOAT
- quick_ratio: FLOAT
- last_updated: TIMESTAMP
```

### stock_price_history (가격 이력)
```sql
- id: UUID (PK)
- symbol: TEXT (FK)
- date: DATE
- open, high, low, close: FLOAT
- volume: BIGINT
- created_at: TIMESTAMP
```

### stock_data_sync_history (동기화 이력)
```sql
- id: UUID (PK)
- symbol: TEXT
- data_type: TEXT (indicators/prices)
- status: TEXT (success/failed)
- records_count: INT
- sync_date: TIMESTAMP
```

---

## 📊 데이터 통계

| 항목 | 수치 |
|------|------|
| 총 주식 종목 | 93개 |
| Stock Indicators | 93개 |
| Price History 청크 | 1,209개 |
| Vector DB 벡터 | 1,302개 |
| Vector 차원 | 1,536 |
| 데이터 완성도 | 100% |
| 임베딩 성공률 | 100% |

---

## 🔧 주요 기술 스택

| 영역 | 기술 |
|------|------|
| **데이터 소스** | FMP API, Supabase |
| **임베딩** | OpenAI text-embedding-ada-002 |
| **Vector DB** | Pinecone |
| **LLM** | GPT-5 (Claude) |
| **백엔드** | FastAPI, Python |
| **스케줄링** | APScheduler |
| **비동기 처리** | asyncio |

---

## 🔄 자동 실행 스케줄

백엔드가 시작되면 다음 일정이 자동으로 등록됩니다:

| 시간 | 작업 | 빈도 |
|------|------|------|
| 새벽 2시 | 주식 지표 수집 | 매일 |
| 새벽 3시 | 가격 이력 수집 | 매일 |
| 매 6시간 | 뉴스 수집 | 정기적 |

---

## ⚙️ 환경 변수

다음 환경 변수를 설정해야 합니다:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=financial-embeddings
PINECONE_ENVIRONMENT=your_environment

# FMP API
FMP_API_KEY=your_fmp_key

# News API
NEWS_API_KEY=your_news_api_key
```

---

## 🐛 문제 해결

### Vector DB 재구성
```bash
# 모든 벡터 삭제하고 새로 임베딩
python -c "
from app.services.pinecone_service import PineconeService
pinecone = PineconeService()
# 벡터 삭제 후 embed_stock_data.py 실행
"
```

### 데이터 재수집
```bash
# stock_indicators 초기화 후 새로 수집
python scripts/refresh_stock_indicators.py
```

### 로그 확인
```bash
# 백엔드 로그
tail -f backend.log

# 스케줄러 로그는 콘솔에 출력됨
```

---

## 📝 변경 이력

### 최근 업데이트 (2025-11-10)

**데이터 정제:**
- stock_indicators 테이블에서 8개 열 삭제
  - pe_ratio, eps, dividend_yield
  - rsi, roe, roa, debt_to_equity, debt_ratio
- FMP API 데이터 수집 개선 (4개 엔드포인트 활용)
- 데이터 완성도: 100%로 개선

**코드 최적화:**
- 모든 서비스에서 삭제된 열 참조 제거
- NULL 값 안전성 처리 강화
- 테스트 파일 정리

**Vector DB:**
- 기존 1,530개 벡터 모두 삭제
- 93개 Stock Indicators + 1,209개 Price History 재임베딩
- 최종: 1,302개 벡터 저장

---

## 📞 지원

문제 발생 시:
1. 로그 확인
2. 환경 변수 재확인
3. API 키 유효성 확인
4. 네트워크 연결 확인

---

**상태**: ✅ Production Ready
**마지막 업데이트**: 2025-11-10
**버전**: 1.0.0
