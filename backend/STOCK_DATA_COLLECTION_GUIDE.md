# FMP 주식 데이터 수집 시스템 가이드

## 개요

FMP (Financial Modeling Prep) API를 이용하여 100개 주식의 **주식 지표(Stock Indicators)** 와 **가격 이력(Price History)** 을 수집하는 자동화된 시스템입니다.

### 수집 데이터

#### 1. Stock Indicators (주식 지표)
- **기술 지표**: SMA(20/50/200), EMA(12/26), RSI(14), MACD
- **재무 지표**: ROE, ROA, 유동비율, 빠른비율, 부채비율, 순이익률
- **스코어**: Altman Z-Score, Piotroski F-Score
- **기본 정보**: 회사명, 현재가, 이전 종가, 시장가치, P/E 비율, EPS 등

#### 2. Price History (가격 이력)
- **기간**: 5년
- **데이터**: OHLCV (시가, 고가, 저가, 종가, 거래량)
- **단위**: 일별 (End-of-Day)
- **변화값**: 가격 변화, 변화율

### 추적 종목 (100개)
- **기술**: 20개 (AAPL, MSFT, GOOGL, AMZN, NVDA 등)
- **금융**: 15개 (JPM, BAC, WFC 등)
- **헬스케어**: 15개 (JNJ, UNH, PFE 등)
- **소비재**: 15개 (WMT, TGT, HD 등)
- **산업**: 10개 (CAT, BA, MMM 등)
- **에너지**: 10개 (XOM, CVX, COP 등)
- **통신/부동산/유틸리티**: 15개

---

## 설정 및 준비

### 1. 환경 변수 설정

`.env` 파일에 FMP API 키를 설정합니다:

```bash
FMP_API_KEY=your_fmp_api_key_here
```

FMP API 키는 https://site.financialmodelingprep.com/developer/docs 에서 발급받을 수 있습니다.

### 2. 데이터베이스 준비

Supabase에서 다음 테이블이 생성되어 있어야 합니다:

```sql
-- 1. stock_indicators (주식 지표)
-- 2. stock_price_history (가격 이력)
-- 3. stock_data_sync_history (동기화 이력)
```

스키마는 `supabase_schema.sql`에 포함되어 있습니다.

---

## 사용 방법

### 1. 자동 수집 (스케줄러)

서버 시작 시 자동으로 설정된 일정에 따라 수집됩니다:

| 일정 | 작업 | 시간 |
|------|------|------|
| 매일 새벽 2시 | 주식 지표 수집 | 2:00 AM |
| 매일 새벽 3시 | 가격 이력 수집 | 3:00 AM |

**특징**:
- 이미 수집된 데이터는 건너뜁니다 (중복 방지)
- 실패한 항목은 로그에 기록됩니다
- 동기화 이력이 DB에 저장됩니다

### 2. REST API로 수동 수집

#### 2.1 주식 지표 수집

```bash
# 전체 100개 종목 지표 수집
curl -X POST "http://localhost:8000/api/stock-data/collect/indicators"

# 특정 종목 지표 수집
curl -X POST "http://localhost:8000/api/stock-data/collect/indicators?symbols=AAPL&symbols=GOOGL"

# 강제 재수집 (이미 있는 데이터도 다시)
curl -X POST "http://localhost:8000/api/stock-data/collect/indicators?force_refresh=true"
```

#### 2.2 가격 이력 수집

```bash
# 전체 100개 종목 가격 이력 수집
curl -X POST "http://localhost:8000/api/stock-data/collect/prices"

# 특정 종목 가격 이력 수집
curl -X POST "http://localhost:8000/api/stock-data/collect/prices?symbols=TSLA&symbols=MSFT"

# 강제 재수집
curl -X POST "http://localhost:8000/api/stock-data/collect/prices?force_refresh=true"
```

#### 2.3 전체 데이터 수집

```bash
# 지표 + 가격 이력 모두 수집
curl -X POST "http://localhost:8000/api/stock-data/collect/full"

# 강제 재수집
curl -X POST "http://localhost:8000/api/stock-data/collect/full?force_refresh=true"
```

### 3. 수동 CLI 스크립트

프로젝트 루트 디렉토리에서 실행합니다:

#### 3.1 주식 지표 수집

```bash
# 전체 100개 종목
python scripts/collect_stock_data.py --indicators

# 특정 종목
python scripts/collect_stock_data.py --indicators --symbols AAPL GOOGL MSFT

# 강제 재수집
python scripts/collect_stock_data.py --indicators --force
```

#### 3.2 가격 이력 수집

```bash
# 전체 100개 종목 (5년)
python scripts/collect_stock_data.py --prices

# 특정 종목
python scripts/collect_stock_data.py --prices --symbols TSLA NVDA

# 강제 재수집
python scripts/collect_stock_data.py --prices --force
```

#### 3.3 전체 데이터 수집

```bash
# 지표 + 가격 이력 모두
python scripts/collect_stock_data.py --full

# 강제 재수집
python scripts/collect_stock_data.py --full --force
```

#### 3.4 도움말

```bash
python scripts/collect_stock_data.py --help
```

---

## 데이터 조회 API

### 1. 특정 종목 지표 조회

```bash
curl "http://localhost:8000/api/stock-data/indicators/AAPL"

# 응답 예시
{
  "status": "success",
  "data": {
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "current_price": 150.25,
    "pe_ratio": 28.5,
    "roe": 0.95,
    "roa": 0.22,
    "rsi_14": 65.2,
    "sma_20": 149.50,
    "sma_50": 148.75,
    "last_updated": "2024-01-15T10:30:00Z"
  }
}
```

### 2. 모든 지표 조회

```bash
# 최신 10개 지표
curl "http://localhost:8000/api/stock-data/indicators?limit=10"

# 특정 섹터 필터
curl "http://localhost:8000/api/stock-data/indicators?sector=Technology&limit=10"
```

### 3. 가격 이력 조회

```bash
# 특정 종목의 최신 30개 일별 가격
curl "http://localhost:8000/api/stock-data/prices/AAPL?limit=30"

# 특정 날짜 이후 가격
curl "http://localhost:8000/api/stock-data/prices/AAPL?start_date=2023-01-01&limit=60"

# 응답 예시
{
  "status": "success",
  "symbol": "AAPL",
  "total": 30,
  "data": [
    {
      "date": "2024-01-15",
      "open": 149.50,
      "high": 151.00,
      "low": 149.25,
      "close": 150.75,
      "volume": 42500000,
      "change": 1.25,
      "change_percent": 0.84
    },
    ...
  ]
}
```

### 4. 동기화 이력 조회

```bash
# 최근 20개 동기화 이력
curl "http://localhost:8000/api/stock-data/sync-history"

# 완료된 동기화만 조회
curl "http://localhost:8000/api/stock-data/sync-history?status_filter=completed"

# 실패한 동기화 조회
curl "http://localhost:8000/api/stock-data/sync-history?status_filter=failed"
```

### 5. 통계 조회

```bash
curl "http://localhost:8000/api/stock-data/stats"

# 응답 예시
{
  "status": "success",
  "stock_indicators_count": 98,
  "price_history_count": 123450,
  "last_sync": {
    "symbol": "ALL",
    "sync_type": "full",
    "status": "completed",
    "records_processed": 5000,
    "sync_completed_at": "2024-01-15T03:45:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 데이터베이스 스키마

### stock_indicators 테이블

```sql
CREATE TABLE stock_indicators (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR UNIQUE NOT NULL,           -- 종목 심볼 (AAPL, GOOGL 등)
  company_name VARCHAR,                      -- 회사명
  current_price FLOAT,                       -- 현재가
  previous_close FLOAT,                      -- 이전 종가
  market_cap BIGINT,                         -- 시장가치
  pe_ratio FLOAT,                            -- P/E 비율
  eps FLOAT,                                 -- 주당 순이익
  dividend_yield FLOAT,                      -- 배당 수익률
  fifty_two_week_high FLOAT,                 -- 52주 최고가
  fifty_two_week_low FLOAT,                  -- 52주 최저가
  currency VARCHAR,                          -- 통화
  exchange VARCHAR,                          -- 거래소
  industry VARCHAR,                          -- 산업
  sector VARCHAR,                            -- 섹터
  -- 기술 지표
  sma_20 FLOAT,                              -- 20일 이동평균
  sma_50 FLOAT,                              -- 50일 이동평균
  sma_200 FLOAT,                             -- 200일 이동평균
  ema_12 FLOAT,                              -- 12일 지수이동평균
  ema_26 FLOAT,                              -- 26일 지수이동평균
  rsi_14 FLOAT,                              -- 14일 RSI
  macd FLOAT,                                -- MACD
  macd_signal FLOAT,                         -- MACD 신호선
  macd_histogram FLOAT,                      -- MACD 히스토그램
  -- 재무 지표
  roe FLOAT,                                 -- 자기자본수익률
  roa FLOAT,                                 -- 자산수익률
  current_ratio FLOAT,                       -- 유동비율
  quick_ratio FLOAT,                         -- 빠른비율
  debt_to_equity FLOAT,                      -- 부채비율
  debt_ratio FLOAT,                          -- 부채율
  profit_margin FLOAT,                       -- 순이익률
  -- 스코어
  altman_score FLOAT,                        -- Altman Z-Score
  piotroski_score FLOAT,                     -- Piotroski F-Score
  last_updated TIMESTAMP,                    -- 마지막 업데이트
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### stock_price_history 테이블

```sql
CREATE TABLE stock_price_history (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR NOT NULL,                   -- 종목 심볼
  date DATE NOT NULL,                        -- 거래 날짜
  open FLOAT NOT NULL,                       -- 시가
  high FLOAT NOT NULL,                       -- 고가
  low FLOAT NOT NULL,                        -- 저가
  close FLOAT NOT NULL,                      -- 종가
  volume BIGINT,                             -- 거래량
  change FLOAT,                              -- 가격 변화
  change_percent FLOAT,                      -- 변화율 (%)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(symbol, date)                       -- 종목과 날짜 조합 유니크
);
```

### stock_data_sync_history 테이블

```sql
CREATE TABLE stock_data_sync_history (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR NOT NULL,                   -- 종목 (NULL = 전체)
  sync_type VARCHAR NOT NULL,                -- 'indicators', 'price_history', 'full'
  sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_completed_at TIMESTAMP,               -- 완료 시간
  status VARCHAR DEFAULT 'in_progress',      -- 'in_progress', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,       -- 처리된 레코드 수
  error_message TEXT,                        -- 오류 메시지
  data_period VARCHAR,                       -- 데이터 기간 (e.g., '5y')
  last_sync_date DATE                        -- 마지막 동기화 날짜
);
```

---

## 로그 및 모니터링

### 로그 위치

- **실시간 로그**: 서버 콘솔 출력
- **파일 로그**: `stock_data_collection.log` (CLI 실행 시)

### 로그 레벨

- **INFO**: 일반적인 작업 진행 상황
- **WARNING**: 부분적인 실패 (예: 특정 종목 수집 실패)
- **ERROR**: 심각한 오류

### 예시 로그

```
2024-01-15 02:00:00 - [SCHEDULED] Stock indicators collection started
2024-01-15 02:05:30 - [STOCK_DATA] Indicators collected: 98/100
2024-01-15 02:05:30 - [STOCK_DATA] Failed: 2
2024-01-15 02:05:30 - [STOCK_DATA] Elapsed time: 330.45s
2024-01-15 02:05:30 - [STOCK_DATA] Errors: ['INVALID_TICKER: Not found', ...]
```

---

## 성능 및 최적화

### 수집 성능

- **API 호출 한계**: FMP 무료 계획 250 calls/day
- **병렬 처리**: asyncio를 통한 동시 수집
- **중복 제거**: symbol, date 기준 자동 UPSERT

### 데이터베이스 최적화

```sql
-- 주요 인덱스
CREATE INDEX idx_stock_indicators_symbol ON stock_indicators (symbol);
CREATE INDEX idx_stock_indicators_updated_at ON stock_indicators (updated_at DESC);
CREATE INDEX idx_stock_price_history_symbol_date ON stock_price_history (symbol, date DESC);
```

### 메모리 사용

- **배치 크기**: 100개 레코드씩 처리
- **타임아웃**: 각 API 호출 10-15초

---

## 트러블슈팅

### 문제 1: "FMP_API_KEY가 설정되지 않았습니다"

**해결책**:
- `.env` 파일에 `FMP_API_KEY` 설정 확인
- 환경 변수 로드 확인: `echo $FMP_API_KEY`

### 문제 2: "API 호출 한계 초과"

**해결책**:
- FMP 무료 계획은 하루 250 calls 제한
- 유료 계획으로 업그레이드
- 수집 일정 조정

### 문제 3: "특정 종목 수집 실패"

**확인 사항**:
- 해당 종목이 유효한지 확인
- 종목 심볼 대소문자 확인 (대문자 권장)
- API 응답 로그 확인

### 문제 4: 데이터베이스 연결 실패

**해결책**:
- Supabase 연결 확인
- `SUPABASE_URL`, `SUPABASE_KEY` 설정 확인
- DB 테이블 생성 확인: `supabase_schema.sql` 실행

---

## API 요청 예시 (Python)

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/stock-data"

# 1. 주식 지표 수집
def collect_indicators(symbols=None, force_refresh=False):
    params = {
        'force_refresh': force_refresh
    }
    if symbols:
        params['symbols'] = symbols

    response = requests.post(f"{BASE_URL}/collect/indicators", params=params)
    return response.json()

# 2. 가격 이력 수집
def collect_prices(symbols=None, force_refresh=False):
    params = {
        'force_refresh': force_refresh
    }
    if symbols:
        params['symbols'] = symbols

    response = requests.post(f"{BASE_URL}/collect/prices", params=params)
    return response.json()

# 3. 지표 조회
def get_indicators(symbol):
    response = requests.get(f"{BASE_URL}/indicators/{symbol}")
    return response.json()

# 4. 가격 이력 조회
def get_prices(symbol, limit=30):
    response = requests.get(f"{BASE_URL}/prices/{symbol}", params={'limit': limit})
    return response.json()

# 5. 통계 조회
def get_stats():
    response = requests.get(f"{BASE_URL}/stats")
    return response.json()

# 사용 예시
if __name__ == "__main__":
    # 전체 100개 종목 지표 수집
    result = collect_indicators()
    print(json.dumps(result, indent=2))

    # 특정 종목 지표 수집
    result = collect_indicators(symbols=['AAPL', 'GOOGL'])
    print(json.dumps(result, indent=2))

    # AAPL 지표 조회
    result = get_indicators('AAPL')
    print(json.dumps(result, indent=2))

    # AAPL 가격 이력 조회
    result = get_prices('AAPL', limit=60)
    print(json.dumps(result, indent=2))
```

---

## 주요 기능

| 기능 | 설명 | 자동화 | 수동 |
|------|------|--------|------|
| 주식 지표 수집 | 기술/재무 지표 | 매일 2AM | CLI, API |
| 가격 이력 수집 | 5년 OHLCV | 매일 3AM | CLI, API |
| 중복 제거 | symbol, date 기준 UPSERT | ✓ | ✓ |
| 오류 로깅 | 실패 항목 기록 | ✓ | ✓ |
| 동기화 이력 | DB에 기록 | ✓ | ✓ |
| 강제 재수집 | 기존 데이터 무시 | - | ✓ |

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│           FMP Stock Data Collection System           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │      Automatic Scheduler (APScheduler)       │  │
│  ├──────────────────────────────────────────────┤  │
│  │ 2 AM: Collect Stock Indicators               │  │
│  │ 3 AM: Collect Price History (5 years)        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │        Manual Collection Methods             │  │
│  ├──────────────────────────────────────────────┤  │
│  │ • REST API (/api/stock-data/collect/...)     │  │
│  │ • CLI Script (scripts/collect_stock_data.py) │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │    FMP Stock Data Service                    │  │
│  ├──────────────────────────────────────────────┤  │
│  │ • Async API calls to FMP                     │  │
│  │ • Data filtering & processing                │  │
│  │ • Error handling & retry logic               │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │    Database (Supabase)                       │  │
│  ├──────────────────────────────────────────────┤  │
│  │ • stock_indicators                           │  │
│  │ • stock_price_history                        │  │
│  │ • stock_data_sync_history                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 라이선스

이 시스템은 프로젝트의 일부입니다. MIT 라이선스를 따릅니다.

## 지원

문제가 발생하면 다음을 확인하세요:
1. FMP API 키 설정
2. 서버 로그 확인
3. 데이터베이스 테이블 생성 확인
4. 인터넷 연결 상태
