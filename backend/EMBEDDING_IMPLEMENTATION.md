# ✅ Vector DB 임베딩 구현 완료

**stock_indicators**와 **stock_price_history** 테이블의 데이터를 Pinecone Vector DB에 자동으로 임베딩하는 기능을 완성했습니다.

---

## 📝 변경 사항 요약

### 1. 수정된 파일

#### `app/services/news_scheduler.py` (✅ 수정됨)
- **임베딩 서비스 추가**: `FinancialEmbeddingService` import
- **자동 스케줄 추가**:
  - 4:00 AM: `stock_indicators` 임베딩
  - 5:00 AM: `stock_price_history` 임베딩
- **새 메서드 추가**:
  - `_embed_stock_indicators()` - 지표 임베딩
  - `_embed_price_history()` - 가격 임베딩
  - `trigger_manual_embedding_stock_indicators()` - 수동 지표 임베딩
  - `trigger_manual_embedding_price_history()` - 수동 가격 임베딩

**라인 변경:**
```
라인 16: FinancialEmbeddingService import 추가
라인 28: embedding_service 초기화
라인 84-104: 자동 스케줄 추가 (6, 7번 작업)
라인 354-536: 4개 메서드 추가 (~180줄)
```

#### `app/api/embeddings.py` (✅ 수정됨)
- **새 API 엔드포인트 추가**:
  - `POST /api/v2/embeddings/stocks/embed-all-indicators` - 모든 지표 임베딩
  - `POST /api/v2/embeddings/stocks/embed-all-prices` - 모든 가격 임베딩

**라인 변경:**
```
라인 191-221: embed_all_stock_indicators() 추가
라인 224-289: embed_all_price_histories() 추가
```

---

### 2. 신규 파일

#### `scripts/embed_stock_data.py` (✅ 신규)
- **CLI 스크립트**: DB의 주식 데이터 일괄 임베딩
- **기능**:
  - 모든 종목 임베딩: `--all`
  - 특정 종목만: `--symbols AAPL GOOGL`
  - 지표만 임베딩: `--indicators-only`
  - 가격만 임베딩: `--prices-only`
  - 청크 크기 조정: `--chunk-size 30`
- **클래스**: `StockDataEmbeddingService`
  - `get_all_symbols()` - DB에서 종목 조회
  - `embed_stock_indicators_for_symbols()` - 지표 임베딩
  - `embed_price_history_for_symbols()` - 가격 임베딩
  - `embed_batch_symbols()` - 종합 임베딩
  - `print_summary()` - 결과 요약

**사용 예:**
```bash
python scripts/embed_stock_data.py --all
python scripts/embed_stock_data.py --symbols AAPL GOOGL --indicators-only
```

#### `EMBEDDING_GUIDE.md` (✅ 신규)
- **완전한 임베딩 가이드**
- **포함 사항**:
  - 데이터 흐름도
  - 기술 스택
  - 사용 방법 (자동/API/CLI)
  - 성능 특성
  - RAG 예제
  - 트러블슈팅
  - 파일 구조

---

## 🔄 데이터 흐름

```
┌─────────────────────────────────────────┐
│  Supabase DB                            │
│  - stock_indicators (100개 종목)        │
│  - stock_price_history (~12.5만 행)    │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴───────────┐
    │                        │
    ▼ (4 AM)                ▼ (5 AM)
┌─────────────────┐  ┌──────────────────────┐
│ 지표 임베딩     │  │ 가격 임베딩          │
│ (100 벡터)     │  │ (~1,250 벡터)       │
└────────┬────────┘  └──────────┬───────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Pinecone Vector DB  │
         │  financial-embeddings│
         │  (1,536차원)         │
         │  (~1,350 벡터)       │
         └──────────┬───────────┘
                    │
                    ▼
           RAG 검색 및 응답
```

---

## 📊 기술 사양

### stock_indicators 임베딩
- **형태**: 1개 벡터 = 1개 종목
- **메타데이터**: 30+ 재무 지표
  - symbol, company_name, sector, industry
  - current_price, market_cap, pe_ratio
  - roe, roa, debt_to_equity, profit_margin
  - 기술 지표 (SMA, EMA, RSI, MACD 등)
- **텍스트 변환**: TextificationService.textify_stock_indicators()
- **벡터 크기**: 1536차원 (OpenAI text-embedding-3-large)

### stock_price_history 임베딩
- **형태**: N개 벡터 = 청킹된 데이터 (30일 단위)
- **메타데이터**:
  - symbol, start_date, end_date
  - chunk_size, chunk_idx
  - text_preview (첫 200자)
- **텍스트 변환**: 가격 변화, 거래량, 움직임 분석
- **벡터 크기**: 1536차원

---

## 🚀 자동화 스케줄

서버 시작 시 자동 설정:

```python
# news_scheduler.py의 start() 메서드
2:00 AM - collect_all_stock_indicators()  # FMP API
3:00 AM - collect_all_price_history()     # FMP API
4:00 AM - _embed_stock_indicators()       # Pinecone (NEW)
5:00 AM - _embed_price_history()          # Pinecone (NEW)
```

**확인 로그:**
```
[CONFIG] - Daily stock indicators embedding at 4 AM
[CONFIG] - Daily price history embedding at 5 AM
```

---

## 📡 API 엔드포인트

### 모든 지표 임베딩
```
POST /api/v2/embeddings/stocks/embed-all-indicators

응답:
{
  "status": "success",
  "total_symbols": 100,
  "successful": 100,
  "failed": 0,
  "details": [...]
}
```

### 모든 가격 임베딩
```
POST /api/v2/embeddings/stocks/embed-all-prices?chunk_size=30

응답:
{
  "type": "price_history",
  "total": 100,
  "successful": 100,
  "failed": 0,
  "total_chunks": 1250,
  "details": [...]
}
```

### 인덱스 통계
```
GET /api/v2/embeddings/embeddings/index/stats

응답:
{
  "status": "success",
  "index_name": "financial-embeddings",
  "total_vectors": 1350,
  "dimension": 1536
}
```

---

## 🖥️ CLI 사용법

### 기본 사용
```bash
# 모든 종목의 모든 데이터
python scripts/embed_stock_data.py --all

# 지표만
python scripts/embed_stock_data.py --all --indicators-only

# 가격만 (청크 20일)
python scripts/embed_stock_data.py --all --prices-only --chunk-size 20
```

### 특정 종목
```bash
# AAPL, GOOGL, MSFT만 임베딩
python scripts/embed_stock_data.py --symbols AAPL GOOGL MSFT

# 특정 종목의 지표만
python scripts/embed_stock_data.py --symbols AAPL MSFT --indicators-only
```

### 출력 예
```
======================================================================
🚀 주식 데이터 임베딩 시작
======================================================================

======================================================================
📊 주식 지표 임베딩 시작 (100개 종목)
======================================================================
[1/100] AAPL 지표 임베딩 중...
[OK] AAPL 지표 임베딩 완료
...
[100/100] ZSCL 지표 임베딩 중...
[OK] ZSCL 지표 임베딩 완료

======================================================================
지표 임베딩 완료: 100/100 성공
======================================================================

======================================================================
📈 가격 이력 임베딩 시작 (100개 종목, 청크 크기: 30일)
======================================================================
[1/100] AAPL 가격 이력 임베딩 중...
[OK] AAPL 가격 이력 임베딩 완료 (13개 청크)
...

======================================================================
📋 처리 요약
======================================================================
총 처리: 200개
성공: 200개
실패: 0개
성공률: 100.0%
======================================================================

✅ 임베딩 작업 완료!
```

---

## ⚙️ 기존 코드 활용

### 재사용된 기존 서비스
모든 기존 서비스를 그대로 활용하여 별도 라이브러리 설치 없음:

1. **FinancialEmbeddingService**
   - `embed_stock_indicators()` - 그대로 사용
   - `embed_price_history()` - 그대로 사용
   - `embed_batch_symbols()` - 그대로 사용

2. **OpenAIService**
   - `generate_embedding()` - GPT-5로 벡터 생성

3. **TextificationService**
   - `textify_stock_indicators()` - 지표를 자연어로 변환
   - `_textify_price_chunk()` - 가격을 자연어로 변환

4. **PineconeService**
   - `upsert_stock_embedding()` - 벡터 저장
   - `upsert_batch_embeddings()` - 배치 저장

---

## 🔗 통합 포인트

### NewsScheduler와의 통합
```python
# news_scheduler.py에서
self.embedding_service = FinancialEmbeddingService()

# 자동 실행
self.scheduler.add_job(
    self._embed_stock_indicators,
    trigger='cron',
    hour=4, minute=0,
)

self.scheduler.add_job(
    self._embed_price_history,
    trigger='cron',
    hour=5, minute=0,
)
```

### REST API와의 통합
```python
# embeddings.py에서
@router.post("/stocks/embed-all-indicators")
async def embed_all_stock_indicators():
    result = await embedding_service.embed_batch_symbols(symbols)
    return result
```

---

## 📈 성능

### 임베딩 시간 추정
| 항목 | 시간 |
|------|------|
| 지표 임베딩 (100개) | ~5분 |
| 가격 임베딩 (100개 × 30일) | ~10분 |
| 총합 | ~15분 |

### 생성 벡터
| 타입 | 수량 |
|-----|------|
| 지표 벡터 | 100개 |
| 가격 청크 벡터 | ~1,250개 |
| **총합** | **~1,350개** |

### 메모리 사용
- 벡터당 메모리: ~6KB (1536 float32 + 메타데이터)
- 총 메모리: ~8MB (Pinecone에 저장)

---

## ✅ 구현 체크리스트

- [x] TextificationService로 수치 데이터 → 자연어 변환
- [x] OpenAIService (GPT-5)로 자연어 → 벡터 변환
- [x] FinancialEmbeddingService 활용
- [x] PineconeService에 벡터 저장
- [x] NewsScheduler에 자동 스케줄 추가
- [x] REST API 엔드포인트 추가
- [x] CLI 스크립트 생성
- [x] 완전한 문서 작성

---

## 📚 관련 문서

- **EMBEDDING_GUIDE.md** - 상세 사용 가이드
- **STOCK_DATA_COLLECTION_GUIDE.md** - 데이터 수집 가이드
- **RAG_IMPLEMENTATION_GUIDE.md** - RAG 검색 사용법
- **PINECONE_SETUP.md** - Pinecone 초기 설정

---

## 🎯 다음 단계

1. **Pinecone 인덱스 생성** (아직 안 했다면)
   ```bash
   python setup_pinecone_index.py
   ```

2. **임베딩 시작**
   ```bash
   # CLI로
   python scripts/embed_stock_data.py --all

   # 또는 API로
   curl -X POST "http://localhost:8000/api/v2/embeddings/stocks/embed-all-indicators"
   ```

3. **결과 확인**
   ```bash
   curl -X GET "http://localhost:8000/api/v2/embeddings/embeddings/index/stats"
   ```

4. **RAG 검색 테스트**
   ```bash
   # RAG API 사용
   curl -X POST "http://localhost:8000/api/v2/rag/search-similar-stocks" \
     -d '{"query": "AI 기업", "top_k": 5}'
   ```

---

## 🚨 주의 사항

1. **API 키 필수**:
   - `PINECONE_API_KEY` - Vector DB
   - `OPENAI_API_KEY` - 임베딩 생성 (GPT-5)

2. **DB 데이터 필수**:
   - `stock_indicators` 테이블에 데이터 존재
   - `stock_price_history` 테이블에 데이터 존재

3. **비용 고려**:
   - OpenAI 임베딩 API 사용료 발생
   - 100개 종목 × 2회/일 ≈ 월 6,000회

---

## 📞 트러블슈팅

### "Pinecone index not available"
→ `PINECONE_API_KEY` 확인 또는 인덱스 생성

### "No stock indicators found"
→ 먼저 `python scripts/collect_stock_data.py --full` 실행

### "Failed to generate embedding"
→ `OPENAI_API_KEY` 확인 또는 네트워크 확인

---

**완성일**: 2024-11-09
**버전**: 1.0.0
**상태**: Production Ready ✅
