/**
 * FMP WebSocket 실시간 데이터 클라이언트
 * TradingView Lightweight Charts와 연동
 */

interface FMPWebSocketMessage {
  s: string;       // symbol
  t: number;       // timestamp (ms)
  lp?: number;     // last price
  ap?: number;     // ask price
  bp?: number;     // bid price
  ls?: number;     // last size
  as?: number;     // ask size
  bs?: number;     // bid size
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type MessageCallback = (data: FMPWebSocketMessage) => void;
type CandleCallback = (candle: CandleData) => void;

class FMPWebSocketClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private subscriptions: Set<string> = new Set();
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();
  private candleCallbacks: Map<string, CandleCallback[]> = new Map();

  // 실시간 캔들 생성을 위한 캐시
  private currentCandles: Map<string, CandleData> = new Map();
  private candleIntervals: Map<string, number> = new Map(); // symbol -> interval in ms

  // 로그인 응답 대기를 위한 Promise resolver
  private loginResolver: ((success: boolean) => void) | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.log('[FMP WS] Already connected');
      return true;
    }

    try {
      console.log('[FMP WS] Connecting...');

      // FMP WebSocket URL
      const wsUrl = 'wss://websockets.financialmodelingprep.com';

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.ws.onopen = async () => {
          console.log('[FMP WS] Connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // 로그인
          const loginSuccess = await this.login();

          if (loginSuccess) {
            // 이전 구독 복원
            if (this.subscriptions.size > 0) {
              await this.resubscribe();
            }
            resolve(true);
          } else {
            reject(new Error('Login failed'));
          }
        };

        this.ws.onerror = (error) => {
          console.error('[FMP WS] Error:', error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[FMP WS] Disconnected');
          this.isConnected = false;
          this.handleReconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });
    } catch (error) {
      console.error('[FMP WS] Connection failed:', error);
      return false;
    }
  }

  /**
   * 로그인
   */
  private async login(): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!this.apiKey || this.apiKey === 'your_fmp_api_key_here') {
      console.error('[FMP WS] Invalid API key. Please set NEXT_PUBLIC_FMP_API_KEY in .env.local');
      return false;
    }

    try {
      const loginMessage = {
        event: 'login',
        data: {
          apiKey: this.apiKey
        }
      };

      // 로그인 응답을 기다리기 위한 Promise 생성
      const loginPromise = new Promise<boolean>((resolve) => {
        this.loginResolver = resolve;

        // 5초 타임아웃
        setTimeout(() => {
          if (this.loginResolver) {
            console.warn('[FMP WS] Login timeout - assuming success');
            this.loginResolver(true);
            this.loginResolver = null;
          }
        }, 5000);
      });

      this.ws.send(JSON.stringify(loginMessage));
      console.log('[FMP WS] Login message sent, waiting for response...');

      return await loginPromise;
    } catch (error) {
      console.error('[FMP WS] Login failed:', error);
      return false;
    }
  }

  /**
   * 심볼 구독
   */
  async subscribe(symbols: string | string[], intervalMs: number = 60000): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      console.error('[FMP WS] Not connected');
      return false;
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase());

    try {
      const subscribeMessage = {
        event: 'subscribe',
        data: {
          ticker: normalizedSymbols.length === 1 ? normalizedSymbols[0] : normalizedSymbols
        }
      };

      this.ws.send(JSON.stringify(subscribeMessage));

      // 구독 목록 업데이트
      normalizedSymbols.forEach(symbol => {
        this.subscriptions.add(symbol);
        this.candleIntervals.set(symbol, intervalMs);
      });

      console.log('[FMP WS] Subscribed to:', normalizedSymbols);
      return true;
    } catch (error) {
      console.error('[FMP WS] Subscribe failed:', error);
      return false;
    }
  }

  /**
   * 구독 해제
   */
  async unsubscribe(symbols: string | string[]): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map(s => s.toUpperCase());

    try {
      const unsubscribeMessage = {
        event: 'unsubscribe',
        data: {
          ticker: normalizedSymbols
        }
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));

      normalizedSymbols.forEach(symbol => {
        this.subscriptions.delete(symbol);
        this.candleIntervals.delete(symbol);
        this.currentCandles.delete(symbol);
      });

      console.log('[FMP WS] Unsubscribed from:', normalizedSymbols);
      return true;
    } catch (error) {
      console.error('[FMP WS] Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * 메시지 핸들러
   */
  private handleMessage(data: string) {
    try {
      const message: any = JSON.parse(data);

      // 로그인 응답 처리
      if ('event' in message) {
        if (message.event === 'login') {
          const success = message.status === 'success' || message.statusCode === 200;
          console.log('[FMP WS] Login response:', success ? 'success' : 'failed', message);

          if (this.loginResolver) {
            this.loginResolver(success);
            this.loginResolver = null;
          }

          if (!success) {
            console.error('[FMP WS] Login failed. Check your API key:', message);
          }
        } else {
          console.log('[FMP WS] Event:', message);
        }
        return;
      }

      // 실시간 가격 데이터
      if (message.s && message.lp !== undefined) {
        const symbol = message.s.toUpperCase();

        // 메시지 콜백 실행
        const callbacks = this.messageCallbacks.get(symbol) || [];
        callbacks.forEach(cb => cb(message));

        // 캔들 데이터 생성/업데이트
        this.updateCandle(symbol, message);
      }
    } catch (error) {
      console.error('[FMP WS] Message parse error:', error);
    }
  }

  /**
   * 실시간 캔들 업데이트
   */
  private updateCandle(symbol: string, message: FMPWebSocketMessage) {
    const price = message.lp || message.ap || message.bp;
    if (!price) return;

    const intervalMs = this.candleIntervals.get(symbol) || 60000; // 기본 1분
    const timestamp = message.t || Date.now();
    const candleTime = Math.floor(timestamp / intervalMs) * intervalMs;

    let candle = this.currentCandles.get(symbol);

    // 새 캔들 시작
    if (!candle || candle.time !== candleTime) {
      candle = {
        time: Math.floor(candleTime / 1000), // Unix timestamp (seconds)
        open: price,
        high: price,
        low: price,
        close: price,
        volume: message.ls || 0
      };
      this.currentCandles.set(symbol, candle);
    } else {
      // 기존 캔들 업데이트
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      if (message.ls) {
        candle.volume = (candle.volume || 0) + message.ls;
      }
    }

    // 캔들 콜백 실행
    const callbacks = this.candleCallbacks.get(symbol) || [];
    callbacks.forEach(cb => cb({ ...candle }));
  }

  /**
   * 메시지 콜백 등록
   */
  onMessage(symbol: string, callback: MessageCallback) {
    const normalizedSymbol = symbol.toUpperCase();

    if (!this.messageCallbacks.has(normalizedSymbol)) {
      this.messageCallbacks.set(normalizedSymbol, []);
    }

    this.messageCallbacks.get(normalizedSymbol)!.push(callback);
  }

  /**
   * 캔들 콜백 등록
   */
  onCandle(symbol: string, callback: CandleCallback) {
    const normalizedSymbol = symbol.toUpperCase();

    if (!this.candleCallbacks.has(normalizedSymbol)) {
      this.candleCallbacks.set(normalizedSymbol, []);
    }

    this.candleCallbacks.get(normalizedSymbol)!.push(callback);
  }

  /**
   * 콜백 제거
   */
  offMessage(symbol: string, callback: MessageCallback) {
    const normalizedSymbol = symbol.toUpperCase();
    const callbacks = this.messageCallbacks.get(normalizedSymbol);

    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  offCandle(symbol: string, callback: CandleCallback) {
    const normalizedSymbol = symbol.toUpperCase();
    const callbacks = this.candleCallbacks.get(normalizedSymbol);

    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 재구독
   */
  private async resubscribe() {
    if (this.subscriptions.size === 0) return;

    const symbols = Array.from(this.subscriptions);
    await this.subscribe(symbols);
  }

  /**
   * 재연결 처리
   */
  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[FMP WS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[FMP WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[FMP WS] Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    this.messageCallbacks.clear();
    this.candleCallbacks.clear();
    this.currentCandles.clear();
    this.candleIntervals.clear();
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// 싱글톤 인스턴스
let fmpWSClient: FMPWebSocketClient | null = null;

export function getFMPWebSocketClient(): FMPWebSocketClient {
  if (!fmpWSClient) {
    // API 키는 환경변수에서 가져오기 (프론트엔드에서는 .env.local에 설정)
    const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

    if (!apiKey) {
      console.warn('[FMP WS] API key not configured');
    }

    fmpWSClient = new FMPWebSocketClient(apiKey);
  }

  return fmpWSClient;
}

export type { FMPWebSocketMessage, CandleData, MessageCallback, CandleCallback };
