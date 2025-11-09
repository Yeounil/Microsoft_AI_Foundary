# 📚 Vector DB 임베딩 가이드

DB의 주식 데이터(stock_indicators, stock_price_history)를 Pinecone Vector DB에 임베딩하여 RAG(Retrieval Augmented Generation) 검색 기능을 지원합니다.

---

## 📋 개요

### 데이터 흐름
```
┌─────────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL (stock_indicators, stock_price_history)    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼ 자연어 변환 (TextificationService)
                      │
                      ▼ 임베딩 생성 (OpenAI GPT-5)
                      │
                      ▼ 벡터 저장
└─────────────────────────────────────────────────────────────────┐
│  Pinecone Vector DB (financial-embeddings 인덱스)             │
│  - stock_indicators 벡터                                        │
│  - stock_price_history 청크 벡터                               │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼ 유사도 검색 (RAG)
                      │
                      ▼ GPT-5 답변 생성
                      │
                      ▼ 사용자 응답
```

---

## 🔧 기술 스택

| 컴포넌트 | 설명 |
|---------|------|
| **TextificationService** | 수치 데이터를 자연어로 변환 |
| **OpenAIService (GPT-5)** | 자연어 텍스트를 벡터(1536차원)로 변환 |
| **FinancialEmbeddingService** | 임베딩 조율 및 메타데이터 관리 |
| **PineconeService** | Vector DB 저장/검색 |
| **NewsScheduler** | 정기적인 자동 임베딩 스케줄링 |

---

## 📊 임베딩 데이터 구조

### stock_indicators 임베딩
**1개 벡터 = 1개 종목의 최신 지표**

```
벡터 ID: {symbol}_{data_type}_{timestamp}_{chunk_idx}
메타데이터:
  - symbol: 종목 코드
  - company_name: 회사명
  - sector: 섹터
  - industry: 산업
  - current_price: 현재가
  - pe_ratio: P/E 비율
  - roe: 자기자본이익률
  - market_cap: 시가총액
  - 기타 재무 지표...
```

### stock_price_history 임베딩
**N개 벡터 = 청킹된 주가 이력 (기본 30일 단위)**

```
벡터 ID: {symbol}_price_{end_date}_{chunk_idx}
메타데이터:
  - symbol: 종목 코드
  - start_date: 시작일
  - end_date: 종료일
  - chunk_size: 청크 내 레코드 수
  - text_preview: 처음 200자
```

---

## 🚀 사용 방법

### 1️⃣ 자동 임베딩 (권장)

서버 시작 시 자동 스케줄링:

```
2:00 AM → FMP API로 지표 수집
3:00 AM → FMP API로 가격 이력 수집
4:00 AM → stock_indicators 임베딩
5:00 AM → stock_price_history 임베딩
```

**확인:**
```bash
# 서버 로그에서 확인
[CONFIG] - Daily stock indicators embedding at 4 AM
[CONFIG] - Daily price history embedding at 5 AM
```

---

### 2️⃣ REST API (수동 임베딩)

#### A. 모든 지표 임베딩
```bash
curl -X POST "http://localhost:8000/api/v2/embeddings/stocks/embed-all-indicators"
```

**응답 예:**
```json
{
  "status": "success",
  "total_symbols": 100,
  "successful": 100,
  "failed": 0,
  "details": [...]
}
```

#### B. 모든 가격 이력 임베딩
```bash
curl -X POST "http://localhost:8000/api/v2/embeddings/stocks/embed-all-prices?chunk_size=30"
```

**응답 예:**
```json
{
  "type": "price_history",
  "total": 100,
  "successful": 100,
  "failed": 0,
  "total_chunks": 1250,
  "details": [...]
}
```

#### C. 특정 종목 임베딩
```bash
# 지표만
curl -X POST "http://localhost:8000/api/v2/embeddings/stock/AAPL/embed"

# 종합 (지표 + 가격 + 뉴스)
curl -X POST "http://localhost:8000/api/v2/embeddings/stock/AAPL/embed-comprehensive?include_news=true"

# 가격 이력만
curl -X POST "http://localhost:8000/api/v2/embeddings/stock/AAPL/embed-price-history?chunk_size=30"
```

#### D. 인덱스 통계
```bash
curl -X GET "http://localhost:8000/api/v2/embeddings/embeddings/index/stats"
```

**응답 예:**
```json
{
  "status": "success",
  "index_name": "financial-embeddings",
  "total_vectors": 5250,
  "dimension": 1536,
  "timestamp": "2024-11-09T10:30:00.000000"
}
```

---

### 3️⃣ CLI 스크립트 (대량 임베딩)

#### 모든 종목 임베딩
```bash
# 지표 + 가격 이력 모두
python scripts/embed_stock_data.py --all

# 지표만
python scripts/embed_stock_data.py --all --indicators-only

# 가격 이력만 (청크 크기 20일)
python scripts/embed_stock_data.py --all --prices-only --chunk-size 20
```

#### 특정 종목만 임베딩
```bash
python scripts/embed_stock_data.py --symbols AAPL GOOGL MSFT

python scripts/embed_stock_data.py --symbols AAPL --indicators-only

python scripts/embed_stock_data.py --symbols AAPL --prices-only --chunk-size 15
```

#### 출력 예:
```
======================================================================
🚀 주식 데이터 임베딩 시작
======================================================================
임베딩할 종목: AAPL, GOOGL, MSFT

======================================================================
📊 주식 지표 임베딩 시작 (3개 종목)
======================================================================

[1/3] AAPL 지표 임베딩 중...
[OK] AAPL 지표 임베딩 완료

[2/3] GOOGL 지표 임베딩 중...
[OK] GOOGL 지표 임베딩 완료

[3/3] MSFT 지표 임베딩 중...
[OK] MSFT 지표 임베딩 완료

======================================================================
지표 임베딩 완료: 3/3 성공
======================================================================

======================================================================
📈 가격 이력 임베딩 시작 (3개 종목, 청크 크기: 30일)
======================================================================

[1/3] AAPL 가격 이력 임베딩 중...
[OK] AAPL 가격 이력 임베딩 완료 (17개 청크)

[2/3] GOOGL 가격 이력 임베딩 중...
[OK] GOOGL 가격 이력 임베딩 완료 (17개 청크)

[3/3] MSFT 가격 이력 임베딩 중...
[OK] MSFT 가격 이력 임베딩 완료 (16개 청크)

======================================================================
📋 처리 요약
======================================================================
총 처리: 6개
성공: 6개
실패: 0개
성공률: 100.0%
======================================================================

✅ 임베딩 작업 완료!
```

---

## 📈 성능 특성

| 항목 | 성능 |
|------|------|
| **지표 임베딩 (100개)** | ~5분 |
| **가격 임베딩 (100개 × 30일 청크)** | ~10분 |
| **총 생성 벡터** | ~1,250개 (100 지표 + 1,150 가격 청크) |
| **벡터 차원** | 1536 (OpenAI text-embedding-3-large) |
| **메타데이터 저장** | JSON 형식 |
| **병렬 처리** | 최대 5개 종목 동시 임베딩 |

---

## 🔍 임베딩 프로세스 상세

### 1. 데이터 조회
```python
# stock_indicators 조회
SELECT * FROM stock_indicators WHERE symbol = 'AAPL'

# stock_price_history 조회 (최근 1년, 30일 청크)
SELECT * FROM stock_price_history
WHERE symbol = 'AAPL'
ORDER BY date DESC
LIMIT 365
```

### 2. 자연어 변환
**지표 예:**
```
"As of November 09, 2024, Apple (AAPL) operates in the Information
Technology sector (Consumer Electronics industry). The stock is
currently trading at $238.50, representing a +2.45% change from
the previous close of $232.85. The company has a market
capitalization of $2.4 trillion..."
```

**가격 이력 예:**
```
"Price history for AAPL from 2024-10-10 to 2024-11-09 (30 days):
The stock moved from $228.50 to $238.50, a +4.37% change.
During this period, the price ranged from a low of $225.30 to
a high of $240.10, with an average price of $233.20.
Average daily trading volume was 51,234,567 shares..."
```

### 3. 임베딩 생성
```python
embedding = await openai_service.generate_embedding(text)
# 결과: 1536차원 벡터
```

### 4. Pinecone 저장
```python
pinecone_service.upsert_stock_embedding(
    vector_id="aapl_stock_indicators_2024-11-09_0",
    embedding=[0.123, -0.456, ...],  # 1536개 숫자
    metadata={
        "symbol": "AAPL",
        "company_name": "Apple Inc.",
        "sector": "Information Technology",
        "pe_ratio": 28.5,
        ...
    }
)
```

---

## 🧠 RAG 검색 예제

### 1. 사용자 쿼리
```
"AI 기업과 유사한 회사를 찾아줘"
```

### 2. 프로세스
```
1. 사용자 쿼리 임베딩화
   → "AI 기업과 유사한 회사를 찾아줘" → [벡터]

2. Pinecone에서 유사 검색
   → 코사인 유사도 상위 5개 종목 추출

3. 검색 결과 (예)
   - NVIDIA (score: 0.95)
   - Microsoft (score: 0.92)
   - Alphabet (score: 0.91)
   - Meta (score: 0.89)
   - Tesla (score: 0.87)

4. 메타데이터로 풍부하게
   → 각 종목의 상세 정보 추가

5. GPT-5 답변 생성
   → "NVIDIA, Microsoft 등 AI 기업들을 추천합니다..."
```

### REST API 예제
```bash
curl -X POST "http://localhost:8000/api/v2/rag/search-similar-stocks" \
  -H "Content-Type: application/json" \
  -d '{"query": "AI 기업", "top_k": 5}'
```

---

## 🐛 트러블슈팅

### 문제 1: "Pinecone index not available"
**원인:** Pinecone API 키 미설정
**해결:**
```bash
# .env에 추가
PINECONE_API_KEY=your_api_key_here

# 또는 확인
echo $PINECONE_API_KEY
```

### 문제 2: "No stock indicators found in database"
**원인:** DB에 stock_indicators 데이터 없음
**해결:**
```bash
# 먼저 주식 데이터 수집
python scripts/collect_stock_data.py --all

# 또는 API로
curl -X POST "http://localhost:8000/api/stock-data/collect/full"
```

### 문제 3: "Failed to generate embedding"
**원인:** OpenAI API 키 문제 또는 네트워크 오류
**해결:**
```bash
# OpenAI 키 확인
echo $OPENAI_API_KEY

# 또는 직접 테스트
curl -X GET "http://localhost:8000/api/v2/news/test-ai"
```

### 문제 4: "Batch size exceeds limit"
**원인:** 한번에 너무 많은 종목 임베딩
**해결:**
```bash
# 최대 50개씩 분할
python scripts/embed_stock_data.py --symbols AAPL GOOGL ... (최대 50개)
```

---

## 📚 파일 구조

```
E:\Microsoft_AI_Foundary\backend\
│
├── app/
│   ├── services/
│   │   ├── financial_embedding_service.py    (임베딩 조율)
│   │   ├── pinecone_service.py               (Vector DB)
│   │   ├── textification_service.py          (자연어 변환)
│   │   ├── openai_service.py                 (GPT-5)
│   │   ├── news_scheduler.py                 (스케줄링) ✅ 수정됨
│   │   └── rag_service.py                    (RAG 검색)
│   │
│   ├── api/
│   │   ├── embeddings.py                     (API 엔드포인트) ✅ 수정됨
│   │   └── rag.py                            (RAG API)
│   │
│   └── db/
│       └── supabase_client.py                (DB 연결)
│
├── scripts/
│   └── embed_stock_data.py                   (CLI 스크립트) ✅ 신규
│
└── EMBEDDING_GUIDE.md                        (이 파일)
```

---

## ✅ 체크리스트

임베딩 설정 확인:

- [ ] `.env`에 `PINECONE_API_KEY` 설정
- [ ] `.env`에 `OPENAI_API_KEY` 설정 (GPT-5)
- [ ] Supabase 연결 확인
- [ ] `stock_indicators` 테이블에 데이터 존재
- [ ] `stock_price_history` 테이블에 데이터 존재
- [ ] Pinecone 인덱스 생성 (`python setup_pinecone_index.py`)
- [ ] 임베딩 시작 (`python scripts/embed_stock_data.py --all`)

---

## 🎯 다음 단계

1. **임베딩 검증**
   ```bash
   curl -X GET "http://localhost:8000/api/v2/embeddings/embeddings/index/stats"
   ```

2. **RAG 검색 테스트**
   ```bash
   curl -X POST "http://localhost:8000/api/v2/rag/search-similar-stocks" \
     -H "Content-Type: application/json" \
     -d '{"query": "AI 기업", "top_k": 5}'
   ```

3. **임베딩 업데이트 자동화**
   - 매일 4~5시에 자동 실행 (스케줄러)
   - 또는 수동으로 필요시 실행

---

## 📞 지원

**문제 발생 시:**
1. 로그 확인: `app/logs/embedding.log`
2. 데이터베이스 확인: Supabase 콘솔
3. Vector DB 상태: Pinecone 콘솔

---

**생성일:** 2024-11-09
**버전:** 1.0.0
**상태:** Production Ready ✅
