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

### 예제 1: JavaScript/TypeScript (Vanilla)

#### 기본 연결 및 데이터 수신

```javascript
// 1. WebSocket 클라이언트 초기화
const ws = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');

// 2. 연결 성공
ws.onopen = () => {
  console.log('✅ Connected to real-time price stream');

  // 심볼 구독 요청
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN']
  }));
};

// 3. 메시지 수신 및 처리
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  console.log('📊 Received:', data.type);

  switch(data.type) {
    case 'connected':
      // 서버 연결 성공 메시지
      console.log('📡', data.message);
      break;

    case 'subscription':
      // 심볼 구독/구독 해제 확인
      console.log(`✅ ${data.action}:`, data.symbols);
      console.log(`📈 Total subscribed:`, data.subscribed_total);
      break;

    case 'price_update':
      // 🔥 실시간 가격 데이터
      const priceData = {
        symbol: data.symbol,
        price: data.last_price,
        askPrice: data.ask_price,
        bidPrice: data.bid_price,
        askSize: data.ask_size,
        bidSize: data.bid_size,
        timestamp: new Date(data.timestamp)
      };

      console.log(
        `${priceData.symbol}: $${priceData.price} ` +
        `(Ask: $${priceData.askPrice}, Bid: $${priceData.bidPrice})`
      );

      // UI 업데이트 (차트, 가격 표시 등)
      updateUI(priceData);
      break;

    case 'subscriptions':
      // 현재 구독 목록 조회
      console.log('📋 Current subscriptions:', data.symbols);
      break;

    case 'pong':
      // Ping 응답
      console.log('💓 Connection alive');
      break;

    case 'error':
      console.error('❌ Error:', data.message);
      break;
  }
};

// 4. 에러 처리
ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

// 5. 연결 해제 처리
ws.onclose = () => {
  console.log('❌ Disconnected from real-time stream');
  // 필요시 재연결 로직 추가
};

// ==================== 유틸리티 함수 ====================

// 심볼 추가 구독
function subscribe(symbols) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'subscribe',
      symbols: Array.isArray(symbols) ? symbols : [symbols]
    }));
  } else {
    console.error('WebSocket not connected');
  }
}

// 심볼 구독 해제
function unsubscribe(symbols) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'unsubscribe',
      symbols: Array.isArray(symbols) ? symbols : [symbols]
    }));
  } else {
    console.error('WebSocket not connected');
  }
}

// 현재 구독 목록 조회
function getSubscriptions() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'get_subscriptions'
    }));
  }
}

// 연결 유지 (30초마다 ping 전송)
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'ping' }));
  }
}, 30000);

// 연결 종료
function closeConnection() {
  ws.close();
}

// ==================== UI 업데이트 ====================

function updateUI(priceData) {
  // 예제: DOM 업데이트
  const element = document.getElementById(`price-${priceData.symbol}`);
  if (element) {
    element.textContent = `${priceData.symbol}: $${priceData.price.toFixed(2)}`;

    // 색상 변경 (상승/하락)
    // 실제로는 이전 가격과 비교하여 색상 결정
  }
}
```

#### HTML에서 사용 예제

```html
<!DOCTYPE html>
<html>
<head>
  <title>Real-time Stock Prices</title>
  <style>
    .price-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      padding: 20px;
    }

    .price-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .symbol {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
    }

    .price {
      font-size: 24px;
      color: #000;
      margin-bottom: 5px;
    }

    .price.up { color: green; }
    .price.down { color: red; }

    .details {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
    }

    .status {
      padding: 10px;
      margin-bottom: 20px;
      background: #f0f0f0;
      border-radius: 4px;
    }

    .status.connected { background: #d4edda; color: green; }
    .status.disconnected { background: #f8d7da; color: red; }
  </style>
</head>
<body>
  <h1>📈 Real-time Stock Prices</h1>

  <div id="status" class="status disconnected">
    ❌ Disconnected
  </div>

  <div>
    <input
      type="text"
      id="symbolInput"
      placeholder="Enter symbol (e.g., NVDA)"
    />
    <button onclick="addSymbol()">Add Symbol</button>
  </div>

  <div id="prices" class="price-container"></div>

  <script src="websocket-client.js"></script>
  <script>
    // 페이지 로드 시 초기 심볼 로드
    document.addEventListener('DOMContentLoaded', () => {
      subscribe(['AAPL', 'MSFT', 'GOOGL']);
    });

    // 새로운 심볼 추가
    function addSymbol() {
      const input = document.getElementById('symbolInput');
      if (input.value.trim()) {
        subscribe(input.value.toUpperCase());
        input.value = '';
      }
    }

    // Enter 키 처리
    document.getElementById('symbolInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addSymbol();
      }
    });

    // 상태 표시 업데이트
    const updateConnectionStatus = (connected) => {
      const status = document.getElementById('status');
      if (connected) {
        status.textContent = '✅ Connected';
        status.className = 'status connected';
      } else {
        status.textContent = '❌ Disconnected';
        status.className = 'status disconnected';
      }
    };

    // 초기 상태 업데이트
    ws.addEventListener('open', () => updateConnectionStatus(true));
    ws.addEventListener('close', () => updateConnectionStatus(false));

    // 가격 데이터 UI 업데이트 (기존 함수 개선)
    const priceHistory = {};

    function updateUI(priceData) {
      const container = document.getElementById('prices');
      let card = document.getElementById(`card-${priceData.symbol}`);

      // 이전 가격 저장 (색상 표시용)
      const prevPrice = priceHistory[priceData.symbol];
      priceHistory[priceData.symbol] = priceData.price;

      if (!card) {
        // 새로운 카드 생성
        card = document.createElement('div');
        card.id = `card-${priceData.symbol}`;
        card.className = 'price-card';
        container.appendChild(card);
      }

      // 가격 변화 방향 결정
      let priceClass = '';
      if (prevPrice) {
        priceClass = priceData.price > prevPrice ? 'up' : 'down';
      }

      // 카드 업데이트
      card.innerHTML = `
        <div class="symbol">${priceData.symbol}</div>
        <div class="price ${priceClass}">$${priceData.price.toFixed(2)}</div>
        <div class="details">
          <div>Ask: $${priceData.askPrice?.toFixed(2) || 'N/A'}</div>
          <div>Bid: $${priceData.bidPrice?.toFixed(2) || 'N/A'}</div>
          <div style="margin-top: 10px; font-size: 10px; color: #999;">
            ${priceData.timestamp.toLocaleTimeString()}
          </div>
        </div>
      `;
    }
  </script>
</body>
</html>
```

### 예제 2: React 컴포넌트 (완전한 구현)

#### 2.1 기본 컴포넌트

```typescript
import React, { useEffect, useRef, useState } from 'react';
import './RealTimeChart.css';

// TypeScript 타입 정의
interface PriceData {
  symbol: string;
  last_price: number;
  ask_price?: number;
  bid_price?: number;
  ask_size?: number;
  bid_size?: number;
  timestamp: number;
  data_type?: string;
}

interface ChartState {
  isConnected: boolean;
  subscribed: string[];
  prices: Record<string, PriceData>;
  priceHistory: Record<string, number[]>;
}

const RealTimeChart: React.FC = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ChartState>({
    isConnected: false,
    subscribed: [],
    prices: {},
    priceHistory: {}
  });
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // WebSocket 초기화 및 연결
  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initializeWebSocket = () => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL ||
                    'ws://localhost:8000/api/v2/realtime/ws/prices';

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true }));
        setError(null);

        // 초기 심볼 구독
        subscribeToSymbols(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
        setState(prev => ({ ...prev, isConnected: false }));
      };

      wsRef.current.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
      };

    } catch (err) {
      console.error('Error initializing WebSocket:', err);
      setError('Failed to initialize WebSocket');
    }
  };

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('📡 Connected to server:', data.message);
        break;

      case 'price_update':
        // 🔥 실시간 가격 데이터 처리
        const symbol = data.symbol;
        const newPrice = data.last_price;

        setState(prev => {
          // 가격 히스토리 업데이트 (최대 100개 저장)
          const history = prev.priceHistory[symbol] || [];
          const updatedHistory = [...history, newPrice].slice(-100);

          return {
            ...prev,
            prices: {
              ...prev.prices,
              [symbol]: {
                symbol: symbol,
                last_price: newPrice,
                ask_price: data.ask_price,
                bid_price: data.bid_price,
                ask_size: data.ask_size,
                bid_size: data.bid_size,
                timestamp: data.timestamp,
                data_type: data.data_type
              }
            },
            priceHistory: {
              ...prev.priceHistory,
              [symbol]: updatedHistory
            }
          };
        });
        break;

      case 'subscription':
        console.log(`✅ ${data.action}:`, data.symbols);
        setState(prev => ({
          ...prev,
          subscribed: data.symbols
        }));
        break;

      case 'subscriptions':
        setState(prev => ({
          ...prev,
          subscribed: data.symbols
        }));
        break;

      case 'error':
        console.error('Server error:', data.message);
        setError(data.message);
        break;
    }
  };

  const subscribeToSymbols = (symbols: string | string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbols: Array.isArray(symbols) ? symbols : [symbols]
      }));
    } else {
      setError('WebSocket not connected');
    }
  };

  const unsubscribeFromSymbols = (symbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        symbols: symbols
      }));
    }
  };

  const handleAddSymbol = () => {
    const symbol = inputValue.trim().toUpperCase();
    if (symbol) {
      subscribeToSymbols(symbol);
      setInputValue('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    unsubscribeFromSymbols([symbol]);
  };

  const getPriceChangeColor = (symbol: string) => {
    const history = state.priceHistory[symbol];
    if (!history || history.length < 2) return '#000';

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    return current > previous ? '#22c55e' : current < previous ? '#ef4444' : '#000';
  };

  return (
    <div className="real-time-chart">
      <header className="chart-header">
        <h1>📈 Real-time Stock Prices</h1>

        <div className={`status ${state.isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {state.isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="controls">
        <input
          type="text"
          placeholder="Enter symbol (e.g., NVDA)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
        />
        <button onClick={handleAddSymbol} disabled={!state.isConnected}>
          Add Symbol
        </button>
      </div>

      <div className="subscription-info">
        <strong>Subscribed ({state.subscribed.length}):</strong>
        <span>{state.subscribed.join(', ')}</span>
      </div>

      <div className="price-grid">
        {Object.entries(state.prices).map(([symbol, priceData]) => (
          <PriceCard
            key={symbol}
            priceData={priceData}
            color={getPriceChangeColor(symbol)}
            onRemove={() => handleRemoveSymbol(symbol)}
          />
        ))}
      </div>
    </div>
  );
};

// 개별 가격 카드 컴포넌트
interface PriceCardProps {
  priceData: PriceData;
  color: string;
  onRemove: () => void;
}

const PriceCard: React.FC<PriceCardProps> = ({ priceData, color, onRemove }) => {
  return (
    <div className="price-card">
      <div className="card-header">
        <h3 className="symbol">{priceData.symbol}</h3>
        <button className="remove-btn" onClick={onRemove} title="Remove">✕</button>
      </div>

      <div className="card-price" style={{ color }}>
        ${priceData.last_price?.toFixed(2) ?? 'N/A'}
      </div>

      <div className="card-details">
        <div className="detail-row">
          <span className="label">Ask:</span>
          <span className="value">${priceData.ask_price?.toFixed(2) ?? 'N/A'}</span>
          <span className="size">({priceData.ask_size})</span>
        </div>

        <div className="detail-row">
          <span className="label">Bid:</span>
          <span className="value">${priceData.bid_price?.toFixed(2) ?? 'N/A'}</span>
          <span className="size">({priceData.bid_size})</span>
        </div>
      </div>

      <div className="card-footer">
        <small>{new Date(priceData.timestamp).toLocaleTimeString()}</small>
      </div>
    </div>
  );
};

export default RealTimeChart;
```

#### 2.2 CSS 스타일 (RealTimeChart.css)

```css
.real-time-chart {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e5e7eb;
}

.chart-header h1 {
  margin: 0;
  font-size: 28px;
  color: #1f2937;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}

.status.connected {
  background: #dcfce7;
  color: #166534;
}

.status.disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-banner {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-banner button {
  background: none;
  border: none;
  color: #92400e;
  cursor: pointer;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.controls button {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.controls button:hover:not(:disabled) {
  background: #2563eb;
}

.controls button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.subscription-info {
  background: #f3f4f6;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
}

.subscription-info strong {
  margin-right: 10px;
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.price-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.price-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.symbol {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.remove-btn {
  background: #f3f4f6;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-btn:hover {
  background: #e5e7eb;
  color: #ef4444;
}

.card-price {
  font-size: 32px;
  font-weight: 700;
  margin: 12px 0;
  transition: color 0.1s;
}

.card-details {
  margin: 12px 0;
  font-size: 13px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  color: #1f2937;
  font-weight: 600;
}

.size {
  color: #9ca3af;
  font-size: 11px;
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  color: #9ca3af;
  text-align: right;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .price-grid {
    grid-template-columns: 1fr;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .controls {
    flex-direction: column;
  }

  .controls input,
  .controls button {
    width: 100%;
  }
}
```

#### 2.3 환경 설정

`.env` 파일에 다음 추가:

```env
# WebSocket 서버 URL
REACT_APP_WS_URL=ws://localhost:8000/api/v2/realtime/ws/prices
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
