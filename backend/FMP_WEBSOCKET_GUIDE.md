# FMP WebSocket 실시간 주가 데이터 통합 가이드

## 📋 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [설치 및 설정](#설치-및-설정)
4. [API 문서](#api-문서)
5. [사용 예제](#사용-예제)
6. [테스트 방법](#테스트-방법)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

이 모듈은 **FMP(Financial Modeling Prep) WebSocket API**를 사용하여 실시간 주가 데이터를 수신하는 기능을 제공합니다.

### 주요 기능

- ✅ **실시간 주가 데이터**: 거래, 호가 정보를 실시간으로 수신
- ✅ **양방향 통신**: WebSocket을 통한 클라이언트-서버 양방향 통신
- ✅ **자동 재연결**: 연결 끊김 시 자동 재연결 (지수 백오프)
- ✅ **콜백 기반 처리**: 데이터 수신 시 등록된 콜백 함수 실행
- ✅ **데이터 캐싱**: 가장 최신의 실시간 데이터 캐싱
- ✅ **심볼 구독 관리**: 동적 심볼 추가/제거
- ✅ **다중 클라이언트 지원**: 여러 클라이언트 동시 연결

### 지원 데이터 타입

| 데이터 타입 | 필드 | 설명 |
|-----------|------|------|
| **거래 (Trade)** | `lp`, `ls` | Last Price, Last Size |
| **호가 (Quote)** | `ap`, `as`, `bp`, `bs` | Ask Price/Size, Bid Price/Size |
| **거래 취소 (Cancel)** | `lp`, `ls` | 취소된 거래 정보 |

---

## 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Browser)                      │
│                  WebSocket Client (JavaScript)               │
└────────────────────┬────────────────────────────────────────┘
                     │ WebSocket: ws://localhost:8000/api/v2/realtime/ws/prices
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocket Endpoint (/api/v2/realtime/ws/prices)    │  │
│  │  - 클라이언트 연결 관리                               │  │
│  │  - 메시지 라우팅                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints                                   │  │
│  │  - /health              (서비스 상태)                │  │
│  │  - /status              (연결 상태)                  │  │
│  │  - /subscribe           (심볼 구독)                  │  │
│  │  - /unsubscribe         (구독 해제)                  │  │
│  │  - /cache               (캐시 조회)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FMP WebSocket Service (fmp_websocket_service.py)    │  │
│  │  - 연결 관리                                          │  │
│  │  - 구독 관리                                          │  │
│  │  - 데이터 수신 및 처리                                │  │
│  │  - 캐싱                                               │  │
│  │  - 재연결 로직                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ WebSocket
                     │
         ┌───────────▼───────────┐
         │  FMP WebSocket Server │
         │  wss://websockets     │
         │  .financialmodelingprep
         │  .com                 │
         └───────────────────────┘
```

### 패키지 구조

```
app/
├── api/
│   └── websocket_realtime.py          # WebSocket 라우터 및 엔드포인트
├── services/
│   └── fmp_websocket_service.py       # FMP WebSocket 클라이언트 서비스
└── main.py                            # FastAPI 애플리케이션 (라우터 등록)

test_fmp_websocket.py                  # 통합 테스트
test_fmp_websocket_client.py           # 클라이언트 예제 및 테스트

FMP_WEBSOCKET_GUIDE.md                 # 이 문서
```

---

## 설치 및 설정

### 1. 의존성 설치

WebSocket 라이브러리 추가:

```bash
pip install websockets>=12.0
```

또는 requirements.txt에서 설치:

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일에 FMP API 키 추가:

```env
FMP_API_KEY=your_fmp_api_key_here
```

### 3. 백엔드 서버 시작

```bash
uvicorn app.main:app --reload
```

또는:

```bash
python -m uvicorn app.main:app --reload
```

서버가 성공적으로 시작되면 다음과 같은 로그를 볼 수 있습니다:

```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

---

## API 문서

### WebSocket 엔드포인트

#### `ws://localhost:8000/api/v2/realtime/ws/prices`

실시간 주가 데이터를 수신하는 WebSocket 엔드포인트입니다.

##### 클라이언트 메시지 포맷

**심볼 구독:**
```json
{
  "action": "subscribe",
  "symbols": ["AAPL", "MSFT", "TSLA"]
}
```

**심볼 구독 해제:**
```json
{
  "action": "unsubscribe",
  "symbols": ["AAPL"]
}
```

**구독 정보 조회:**
```json
{
  "action": "get_subscriptions"
}
```

**연결 유지 (Ping):**
```json
{
  "action": "ping"
}
```

##### 서버 응답 포맷

**연결 성공:**
```json
{
  "type": "connected",
  "message": "Connected to real-time price stream"
}
```

**구독 확인:**
```json
{
  "type": "subscription",
  "action": "subscribed",
  "symbols": ["AAPL", "MSFT", "TSLA"],
  "subscribed_total": 3
}
```

**가격 업데이트:**
```json
{
  "type": "price_update",
  "symbol": "AAPL",
  "timestamp": 1699564800000,
  "data_type": "T",
  "last_price": 189.45,
  "last_size": 1000,
  "ask_price": 189.46,
  "ask_size": 5000,
  "bid_price": 189.44,
  "bid_size": 3000,
  "cached_at": "2024-11-10T12:00:00"
}
```

**오류 응답:**
```json
{
  "type": "error",
  "message": "Error message here"
}
```

---

### REST API 엔드포인트

#### 1. 헬스 체크

```http
GET /api/v2/realtime/health
```

**응답:**
```json
{
  "status": "connected",
  "is_running": true,
  "api_configured": true,
  "subscribed_symbols": ["AAPL", "MSFT"],
  "cached_symbols": ["AAPL", "MSFT", "TSLA"],
  "callbacks_registered": 1,
  "reconnect_attempts": 0
}
```

#### 2. 상태 조회

```http
GET /api/v2/realtime/status
```

**응답:**
```json
{
  "timestamp": "2024-11-10T12:00:00",
  "connection_status": {
    "is_connected": true,
    "is_running": true,
    "subscribed_symbols": ["AAPL", "MSFT"],
    "total_clients": 5
  },
  "cached_data": {
    "count": 15,
    "symbols": ["AAPL", "MSFT", "TSLA", ...]
  }
}
```

#### 3. 심볼 구독 (REST)

```http
POST /api/v2/realtime/subscribe
Content-Type: application/json

["AAPL", "MSFT", "GOOGL"]
```

**응답:**
```json
{
  "status": "success",
  "message": "Subscribed to 3 symbols",
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "subscribed_total": 10
}
```

#### 4. 구독 해제 (REST)

```http
POST /api/v2/realtime/unsubscribe
Content-Type: application/json

["AAPL", "MSFT"]
```

**응답:**
```json
{
  "status": "success",
  "message": "Unsubscribed from 2 symbols",
  "symbols": ["AAPL", "MSFT"],
  "subscribed_total": 8
}
```

#### 5. 캐시된 데이터 조회

```http
GET /api/v2/realtime/cache?limit=50
```

**응답:**
```json
{
  "total": 15,
  "returned": 15,
  "limit": 50,
  "data": {
    "AAPL": {
      "symbol": "AAPL",
      "timestamp": 1699564800000,
      "type": "T",
      "last_price": 189.45,
      "last_size": 1000,
      ...
    },
    ...
  }
}
```

#### 6. 특정 심볼 캐시 조회

```http
GET /api/v2/realtime/cache/AAPL
```

**응답:**
```json
{
  "symbol": "AAPL",
  "data": {
    "symbol": "AAPL",
    "timestamp": 1699564800000,
    "type": "T",
    "last_price": 189.45,
    "last_size": 1000,
    ...
  }
}
```

---

## 사용 예제

### 예제 1: JavaScript/TypeScript (Frontend)

```javascript
// WebSocket 클라이언트 초기화
const ws = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');

// 연결 성공
ws.onopen = () => {
  console.log('Connected to real-time price stream');

  // 심볼 구독
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['AAPL', 'MSFT', 'TSLA']
  }));
};

// 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'price_update') {
    // 차트 업데이트
    console.log(`${data.symbol}: ${data.last_price}`);
    updateChart(data.symbol, data.last_price);
  } else if (data.type === 'subscription') {
    console.log(`Subscribed to: ${data.symbols.join(', ')}`);
  }
};

// 에러 처리
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 연결 해제
ws.onclose = () => {
  console.log('Disconnected from real-time stream');
};

// 구독 해제
function unsubscribe(symbols) {
  ws.send(JSON.stringify({
    action: 'unsubscribe',
    symbols: symbols
  }));
}

// 핑 전송 (연결 유지)
setInterval(() => {
  ws.send(JSON.stringify({ action: 'ping' }));
}, 30000);
```

### 예제 2: React 컴포넌트

```typescript
import React, { useEffect, useRef, useState } from 'react';

interface PriceData {
  symbol: string;
  last_price: number;
  ask_price?: number;
  bid_price?: number;
  timestamp: number;
}

const RealTimePriceChart: React.FC = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [subscribed, setSubscribed] = useState<string[]>([]);

  useEffect(() => {
    // WebSocket 연결
    wsRef.current = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      // 초기 심볼 구독
      wsRef.current?.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['AAPL', 'MSFT', 'GOOGL']
      }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'price_update') {
        setPrices((prev) => ({
          ...prev,
          [data.symbol]: data
        }));
      } else if (data.type === 'subscription') {
        setSubscribed(data.symbols);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleAddSymbol = (symbol: string) => {
    wsRef.current?.send(JSON.stringify({
      action: 'subscribe',
      symbols: [symbol]
    }));
  };

  const handleRemoveSymbol = (symbol: string) => {
    wsRef.current?.send(JSON.stringify({
      action: 'unsubscribe',
      symbols: [symbol]
    }));
  };

  return (
    <div>
      <h2>Real-time Stock Prices</h2>
      <p>Subscribed: {subscribed.join(', ')}</p>

      <div>
        {Object.entries(prices).map(([symbol, data]) => (
          <div key={symbol}>
            <h3>{symbol}</h3>
            <p>Price: ${data.last_price}</p>
            <p>Ask: ${data.ask_price}</p>
            <p>Bid: ${data.bid_price}</p>
            <button onClick={() => handleRemoveSymbol(symbol)}>Remove</button>
          </div>
        ))}
      </div>

      <div>
        <input
          type="text"
          placeholder="Enter symbol"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddSymbol((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

export default RealTimePriceChart;
```

### 예제 3: Python 클라이언트

```python
import asyncio
import json
import websockets

async def main():
    uri = "ws://localhost:8000/api/v2/realtime/ws/prices"

    async with websockets.connect(uri) as websocket:
        # 심볼 구독
        await websocket.send(json.dumps({
            "action": "subscribe",
            "symbols": ["AAPL", "MSFT", "TSLA"]
        }))

        # 메시지 수신
        async for message in websocket:
            data = json.loads(message)

            if data.get("type") == "price_update":
                symbol = data.get("symbol")
                price = data.get("last_price")
                print(f"{symbol}: ${price}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 테스트 방법

### 1. 자동 테스트

```bash
# 종합 테스트
python test_fmp_websocket.py

# 클라이언트 테스트 (서버가 실행 중이어야 함)
python test_fmp_websocket_client.py
```

### 2. 수동 테스트 (cURL)

```bash
# 헬스 체크
curl http://localhost:8000/api/v2/realtime/health

# 상태 조회
curl http://localhost:8000/api/v2/realtime/status

# 심볼 구독
curl -X POST http://localhost:8000/api/v2/realtime/subscribe \
  -H "Content-Type: application/json" \
  -d '["AAPL", "MSFT"]'

# 캐시 조회
curl http://localhost:8000/api/v2/realtime/cache
```

### 3. WebSocket 클라이언트 테스트

**wscat 사용:**

```bash
# wscat 설치
npm install -g wscat

# WebSocket 연결
wscat -c ws://localhost:8000/api/v2/realtime/ws/prices

# 심볼 구독 (터미널에서)
{"action": "subscribe", "symbols": ["AAPL", "MSFT"]}

# 구독 정보 조회
{"action": "get_subscriptions"}

# 구독 해제
{"action": "unsubscribe", "symbols": ["AAPL"]}
```

---

## 트러블슈팅

### 문제: "FMP API Key not configured"

**해결:**
1. `.env` 파일에 `FMP_API_KEY` 확인
2. 환경 변수 설정 확인
3. 서버 재시작

```bash
# .env 파일 확인
cat .env | grep FMP_API_KEY

# 환경 변수 설정
export FMP_API_KEY=your_key_here
```

### 문제: WebSocket 연결 실패

**해결:**
1. 백엔드 서버가 실행 중인지 확인
2. 방화벽 설정 확인
3. 포트 번호 확인 (기본값: 8000)

```bash
# 서버 상태 확인
curl http://localhost:8000/health

# 포트 변경하여 실행
uvicorn app.main:app --port 8001
```

### 문제: "Max reconnection attempts reached"

**해결:**
1. FMP API 상태 확인
2. 네트워크 연결 확인
3. API 키 유효성 확인

```bash
# FMP 서버 상태 확인
curl https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=your_key
```

### 문제: 데이터를 받지 못함

**해결:**
1. 심볼이 올바른지 확인
2. 구독 상태 확인
3. 시장 거래 시간 확인

```bash
# 캐시에 데이터가 있는지 확인
curl http://localhost:8000/api/v2/realtime/cache

# 특정 심볼 확인
curl http://localhost:8000/api/v2/realtime/cache/AAPL
```

### 문제: "WebSocket connection closed"

**해결:**
1. 네트워크 안정성 확인
2. 타임아웃 설정 확인
3. 재연결 로직 확인

```python
# 클라이언트에서 핑 전송 (연결 유지)
async def keep_alive(websocket):
    while True:
        await asyncio.sleep(30)
        await websocket.send(json.dumps({"action": "ping"}))
```

---

## 성능 최적화

### 1. 구독 심볼 제한

한 번에 너무 많은 심볼을 구독하지 마세요:

```python
# ❌ 나쁜 예
symbols = [f"STOCK{i}" for i in range(1000)]
await client.subscribe(symbols)

# ✅ 좋은 예
symbols = ["AAPL", "MSFT", "GOOGL", "AMZN"]  # 최대 50개
await client.subscribe(symbols)
```

### 2. 데이터 필터링

서버에서 필터링하는 것이 더 효율적입니다:

```javascript
// ✅ 좋은 예: 서버에서 필터링
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'price_update' && data.last_price > 100) {
    updateChart(data);
  }
};
```

### 3. 배치 업데이트

개별 업데이트보다 배치 업데이트가 효율적:

```javascript
// ✅ 좋은 예: 배치 업데이트
let updateBuffer = [];
let updateTimeout;

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateBuffer.push(data);

  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateCharts(updateBuffer);
    updateBuffer = [];
  }, 100);  // 100ms 배치
};
```

---

## 라이선스

이 모듈은 FMP API를 사용합니다. FMP의 [라이선스 약관](https://site.financialmodelingprep.com/legal)을 참조하세요.

---

## 지원

문제가 발생하면:

1. 로그 파일 확인
2. 이 문서의 트러블슈팅 섹션 참조
3. GitHub Issues에 보고

---

**마지막 업데이트:** 2024년 11월 10일
**버전:** 1.0.0
