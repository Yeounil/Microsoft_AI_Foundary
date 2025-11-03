# TradingView Widget 통합 가이드

## 개요

TradingView Advanced Chart Widget을 사용하여 실시간 주식 차트를 제공합니다. 이 방식은 API KEY 관리가 필요 없는 무료 위젯을 활용하므로 백엔드 구현이 불필요합니다.

## 장점

✅ **API KEY 관리 불필요** - 무료 공개 위젯 사용
✅ **실시간 데이터** - TradingView에서 직접 제공하는 최신 데이터
✅ **전문적인 차트** - 기술적 분석 도구 포함
✅ **간단한 구현** - 스크립트 한 줄로 통합
✅ **다양한 커스터마이징** - 테마, 언어, 인터벌 등 설정 가능

## 구현 상세

### ChartTab.tsx 구조

```typescript
// 1. TradingView 스크립트 로드
useEffect(() => {
  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    document.body.appendChild(script);
  }
}, []);

// 2. 위젯 생성
useEffect(() => {
  if (scriptLoaded) {
    new window.TradingView.widget({
      symbol: symbol,           // 종목 심볼
      interval: interval,       // 시간대 (5분, 1시간, 일, 주, 월)
      container_id: 'tradingview-widget'
    });
  }
}, [scriptLoaded, stock.symbol, timeRange]);
```

### 지원하는 시간대

| 버튼 | 값 | 설명 |
|------|-----|------|
| 1D | '5' | 5분봉 |
| 1W | '60' | 1시간봉 |
| 1M | 'D' | 일봉 |
| 3M | 'D' | 일봉 |
| 1Y | 'W' | 주봉 |

### 심볼 포맷

```javascript
// 미국 주식 (기본)
symbol: 'AAPL'

// 한국 주식
symbol: 'KRX:005930'  // 삼성전자
symbol: 'KRX:000660'  // SK하이닉스

// 한국 코스닥
symbol: 'KOSDAQ:035720'  // 카카오
```

### Widget 옵션

현재 적용된 옵션:

```javascript
{
  autosize: true,                    // 자동 크기 조정
  symbol: 'AAPL',                    // 종목 심볼
  interval: 'D',                     // 기본 시간대
  timezone: 'Asia/Seoul',            // 한국 시간대
  theme: 'light',                    // 라이트 테마
  style: '1',                        // 캔들스틱 차트
  locale: 'ko',                      // 한국어
  enable_publishing: false,          // 공유 비활성화
  allow_symbol_change: false,        // 심볼 변경 비활성화
  container_id: 'tradingview-widget',// 컨테이너 ID
  hide_volume: false,                // 거래량 표시
  hide_legend: false,                // 범례 표시
  save_image: true,                  // 이미지 저장 기능
  width: '100%',                     // 너비
  height: 500                        // 높이
}
```

## 추가 커스터마이징 옵션

### 다른 테마 사용

```javascript
theme: 'dark'  // 다크 테마
```

### 차트 스타일 변경

```javascript
style: '1'     // 캔들스틱 (기본)
style: '2'     // 바 차트
style: '3'     // 라인 차트
style: '4'     // 에어리어 차트
style: '5'     // 라인 차트 (얇은)
```

### 기술적 지표 추가

기술적 지표는 Widget UI에서 직접 추가 가능합니다:
- 평균선 (Moving Average)
- 볼린저 밴드 (Bollinger Bands)
- RSI, MACD, Stochastic 등
- 그 외 50+ 지표

### 언어 변경

```javascript
locale: 'en'   // 영어
locale: 'ja'   // 일본어
locale: 'zh'   // 중국어
locale: 'ko'   // 한국어
```

## 성능 최적화

### 1. 스크립트 캐싱
- 첫 로드 후 스크립트가 캐시되므로 이후 로드 속도가 빠릅니다

### 2. 조건부 렌더링
- `scriptLoaded` 상태로 위젯 생성 시점 제어

### 3. 컨테이너 재사용
- 심볼 변경 시 기존 위젯을 제거하고 새로 생성

## 제한사항

❌ **무료 버전 제한**
- API KEY가 필요 없는 공개 위젯
- 데이터는 TradingView 서버에서 직접 제공
- 상업용 라이센스 필요시 TradingView Pro 가입 필요

❌ **커스터마이징 제한**
- Widget 제공 옵션 범위 내에서만 가능
- 완전한 커스터마이징이 필요하면 lightweight-charts 사용 필요

## 지원하는 마켓

✅ 미국 주식 (NYSE, NASDAQ)
✅ 한국 주식 (KOSPI, KOSDAQ)
✅ 글로벌 주식 및 지수
✅ 암호화폐
✅ Forex, 선물, 옵션

## 문제 해결

### Widget이 표시되지 않음

```javascript
// 1. 브라우저 콘솔에서 에러 확인
console.log(window.TradingView)  // undefined면 스크립트 로드 실패

// 2. 네트워크 확인
// https://s3.tradingview.com/tv.js 접근 가능 확인

// 3. 컨테이너 ID 확인
document.getElementById('tradingview-widget')  // null이면 ID 불일치
```

### 심볼 오류

```javascript
// 잘못된 심볼
symbol: 'SAMSUNG'  // ❌

// 올바른 심볼
symbol: 'KRX:005930'  // ✅
```

## 미래 개선 사항

1. **사용자 설정 저장** - 선호하는 시간대, 지표 저장
2. **어두운 테마 자동 감지** - OS 설정에 따라 자동 전환
3. **실시간 경고** - 가격 변동 시 알림
4. **차트 내보내기** - PNG/SVG 형식 저장

## 참고 자료

- [TradingView Widget 공식 문서](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
- [TradingView 심볼 검색](https://www.tradingview.com/symbols/)
- [TradingView 라이센스](https://www.tradingview.com/pricing/)

## 라이선스

TradingView Widget은 TradingView의 이용약관에 따릅니다.
개인 사용 및 비상업용 웹사이트는 무료로 사용 가능합니다.
