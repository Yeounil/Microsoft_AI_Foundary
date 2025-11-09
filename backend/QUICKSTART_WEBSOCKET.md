# FMP WebSocket 빠른 시작 가이드

## 🚀 5분 안에 시작하기

### 1단계: 의존성 설치

```bash
pip install websockets>=12.0
```

### 2단계: .env 파일 확인

`.env` 파일에 FMP API 키가 있는지 확인:

```env
FMP_API_KEY=your_api_key_here
```

### 3단계: 서버 실행

```bash
uvicorn app.main:app --reload
```

**정상 실행 확인:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 4단계: 테스트

#### 옵션 A: 자동 테스트
```bash
python test_fmp_websocket.py
```

#### 옵션 B: 클라이언트 예제 실행
```bash
# 새로운 터미널 열기
python test_fmp_websocket_client.py

# 메뉴에서 선택 (예: 1)
```

#### 옵션 C: REST API 테스트
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

---

## 📱 Frontend에서 사용하기

### React 예제

```javascript
import React, { useEffect, useState } from 'react';

export function StockChart() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    // WebSocket 연결
    const ws = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');

    ws.onopen = () => {
      // 심볼 구독
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['AAPL', 'MSFT', 'TSLA']
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'price_update') {
        // 차트 데이터 업데이트
        setPrices(prev => ({
          ...prev,
          [data.symbol]: data.last_price
        }));
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      {Object.entries(prices).map(([symbol, price]) => (
        <div key={symbol}>
          <h3>{symbol}: ${price}</h3>
        </div>
      ))}
    </div>
  );
}
```

### Vue 예제

```vue
<template>
  <div>
    <div v-for="(price, symbol) in prices" :key="symbol">
      <h3>{{ symbol }}: ${{ price }}</h3>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      prices: {},
      ws: null
    };
  },
  mounted() {
    // WebSocket 연결
    this.ws = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');

    this.ws.onopen = () => {
      // 심볼 구독
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['AAPL', 'MSFT', 'TSLA']
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'price_update') {
        this.$set(this.prices, data.symbol, data.last_price);
      }
    };
  },
  beforeUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }
};
</script>
```

### HTML + JavaScript 예제

```html
<!DOCTYPE html>
<html>
<head>
    <title>Real-time Stock Prices</title>
    <style>
        .price-item {
            padding: 10px;
            margin: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .price-up { color: green; }
        .price-down { color: red; }
    </style>
</head>
<body>
    <h1>Real-time Stock Prices</h1>
    <div id="prices"></div>

    <script>
        const ws = new WebSocket('ws://localhost:8000/api/v2/realtime/ws/prices');
        let previousPrices = {};

        ws.onopen = () => {
            console.log('Connected');
            ws.send(JSON.stringify({
                action: 'subscribe',
                symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'price_update') {
                const symbol = data.symbol;
                const currentPrice = data.last_price;
                const previousPrice = previousPrices[symbol];

                let priceClass = '';
                if (previousPrice) {
                    priceClass = currentPrice > previousPrice ? 'price-up' : 'price-down';
                }

                previousPrices[symbol] = currentPrice;

                const pricesDiv = document.getElementById('prices');
                let item = document.getElementById(`price-${symbol}`);

                if (!item) {
                    item = document.createElement('div');
                    item.id = `price-${symbol}`;
                    item.className = 'price-item';
                    pricesDiv.appendChild(item);
                }

                item.innerHTML = `<strong>${symbol}</strong>: $${currentPrice.toFixed(2)}`;
                item.className = `price-item ${priceClass}`;
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('Disconnected');
        };
    </script>
</body>
</html>
```

---

## 🔄 작동 원리

```
1. Frontend에서 WebSocket 연결
   ↓
2. Backend에서 클라이언트 연결 수락
   ↓
3. Frontend에서 심볼 구독 요청 ("subscribe" action)
   ↓
4. Backend가 FMP WebSocket에 해당 심볼 구독
   ↓
5. FMP에서 실시간 데이터 수신
   ↓
6. Backend가 데이터를 캐시에 저장
   ↓
7. Backend가 구독한 클라이언트에게 데이터 전송
   ↓
8. Frontend가 데이터 수신 후 차트 업데이트
```

---

## 🔧 일반적인 작업

### 추가 심볼 구독

```javascript
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: ['NVDA', 'META', 'NFLX']
}));
```

### 심볼 구독 해제

```javascript
ws.send(JSON.stringify({
  action: 'unsubscribe',
  symbols: ['AAPL']
}));
```

### 현재 구독 상태 확인

```javascript
ws.send(JSON.stringify({
  action: 'get_subscriptions'
}));
```

### 연결 유지 (30초마다 ping)

```javascript
setInterval(() => {
  ws.send(JSON.stringify({ action: 'ping' }));
}, 30000);
```

---

## ⚠️ 주의사항

### 1. 동시 구독 제한

한 번에 최대 50개의 심볼만 구독 가능:

```javascript
// ✅ 올바른 방법
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: ['AAPL', 'MSFT']  // 2개
}));

// ❌ 잘못된 방법
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: [/* 100개 이상 */]
}));
```

### 2. 데이터 형식 확인

응답 데이터의 `type` 필드를 항상 확인:

```javascript
// ✅ 올바른 방법
if (data.type === 'price_update') {
  // 가격 데이터 처리
}

// ❌ 잘못된 방법 (모든 데이터를 차트에 표시)
updateChart(data);
```

### 3. 리소스 정리

컴포넌트 제거 시 연결 종료:

```javascript
// React
useEffect(() => {
  const ws = new WebSocket('...');
  return () => ws.close();  // 정리
}, []);

// Vue
beforeUnmount() {
  if (this.ws) {
    this.ws.close();  // 정리
  }
}
```

---

## 🐛 자주 묻는 질문

### Q: "WebSocket connection failed" 오류가 나요

**A:** 서버가 실행 중인지 확인하세요:
```bash
curl http://localhost:8000/health
```

서버가 실행 중이지 않으면:
```bash
uvicorn app.main:app --reload
```

### Q: 데이터를 받지 못해요

**A:** 다음을 확인하세요:
1. 심볼이 올바른가? (예: "AAPL" 대소문자 구분 안 함)
2. 미국 주식 거래 시간인가? (평일 9:30 AM - 4:00 PM ET)
3. FMP API 키가 유효한가?

### Q: 여러 심볼을 한 번에 구독할 수 있나요?

**A:** 네, 최대 50개까지 가능합니다:
```javascript
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: ['AAPL', 'MSFT', 'GOOGL', ..., 'STOCK50']
}));
```

### Q: 실시간이 아닌 1초 지연된 데이터를 받습니다

**A:** FMP WebSocket의 특성입니다. 더 빠른 데이터가 필요하면:
- FMP 프리미엄 플랜 확인
- 다른 데이터 제공자 고려

---

## 📚 다음 단계

1. **[FMP_WEBSOCKET_GUIDE.md](FMP_WEBSOCKET_GUIDE.md)** - 상세 문서
2. **[app/services/fmp_websocket_service.py](app/services/fmp_websocket_service.py)** - 서비스 코드
3. **[app/api/websocket_realtime.py](app/api/websocket_realtime.py)** - API 엔드포인트 코드

---

**문제가 있으신가요?** 상세 가이드의 [트러블슈팅](FMP_WEBSOCKET_GUIDE.md#트러블슈팅) 섹션을 확인하세요.
