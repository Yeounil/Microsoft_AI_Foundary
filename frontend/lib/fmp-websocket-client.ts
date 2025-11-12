/**
 * FMP WebSocket 실시간 데이터 클라이언트
 * TradingView Lightweight Charts와 연동
 */

interface FMPWebSocketMessage {
  s: string; // symbol
  t: number; // timestamp (ms)
  lp?: number; // last price
  ap?: number; // ask price
  bp?: number; // bid price
  ls?: number; // last size
  as?: number; // ask size
  bs?: number; // bid size
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface FMPEventMessage {
  event: string;
  status?: string | number;
  statusCode?: number;
  message?: string;
  data?: unknown;
}

type FMPMessage = FMPWebSocketMessage | FMPEventMessage;

type MessageCallback = (data: FMPWebSocketMessage) => void;
type CandleCallback = (candle: CandleData) => void;

class FMPWebSocketClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private isConnected = false;
  private isConnecting = false; // 연결 중 플래그 추가
  private connectPromise: Promise<boolean> | null = null; // 연결 Promise 캐싱
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

  constructor(apiKey?: string) {
    // API 키를 매개변수로 받거나, 환경변수에서 직접 가져오기
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_FMP_API_KEY || "";

    if (!this.apiKey) {
      console.error(
        "[FMP WS] API key not found! Please set NEXT_PUBLIC_FMP_API_KEY in .env.local"
      );
    } else {
      console.log(
        "[FMP WS] API key loaded:",
        this.apiKey.substring(0, 10) + "..."
      );
    }
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    // 이미 연결됨
    if (this.isConnected) {
      console.log("[FMP WS] Already connected");
      return true;
    }

    // 연결 중이면 기존 Promise 반환 (중복 연결 방지)
    if (this.isConnecting && this.connectPromise) {
      console.log("[FMP WS] Connection in progress, waiting...");
      return this.connectPromise;
    }

    this.isConnecting = true;

    try {
      console.log("[FMP WS] Connecting...");

      // FMP WebSocket URL (환경 변수에서 가져오기)
      const baseWsUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://websockets.financialmodelingprep.com";
      const wsUrl = `${baseWsUrl}?apikey=${this.apiKey}`;

      this.ws = new WebSocket(wsUrl);

      this.connectPromise = new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        this.ws.onopen = async () => {
          console.log("[FMP WS] Connected");
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // 로그인 (FMP WebSocket은 연결 후 반드시 login 이벤트 필요)
          const loginSuccess = await this.login();

          if (loginSuccess) {
            // 이전 구독 복원
            if (this.subscriptions.size > 0) {
              await this.resubscribe();
            }
            this.connectPromise = null; // 연결 완료
            resolve(true);
          } else {
            console.warn("[FMP WS] Login failed, will retry via reconnect logic");
            this.isConnecting = false;
            this.connectPromise = null;
            // 연결을 닫으면 자동으로 재연결 로직이 작동함
            this.ws?.close();
            reject(new Error("Login failed - retrying"));
          }
        };

        this.ws.onerror = (error) => {
          console.error("[FMP WS] Error:", error);
          this.isConnected = false;
          this.isConnecting = false;
          this.connectPromise = null;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[FMP WS] Disconnected");
          this.isConnected = false;
          this.isConnecting = false;
          this.connectPromise = null;
          this.handleReconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });

      return this.connectPromise;
    } catch (error) {
      console.error("[FMP WS] Connection failed:", error);
      this.isConnecting = false;
      this.connectPromise = null;
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

    if (!this.apiKey || this.apiKey === "your_fmp_api_key_here") {
      console.error(
        "[FMP WS] Invalid API key. Please set NEXT_PUBLIC_FMP_API_KEY in .env.local"
      );
      return false;
    }

    try {
      const loginMessage = {
        event: "login",
        data: {
          apiKey: this.apiKey,
        },
      };

      // 로그인 응답을 기다리기 위한 Promise 생성
      const loginPromise = new Promise<boolean>((resolve) => {
        this.loginResolver = resolve;

        // 3초 타임아웃 (빠른 실패로 재연결 유도)
        setTimeout(() => {
          if (this.loginResolver) {
            console.warn("[FMP WS] Login timeout after 3s");
            this.loginResolver(false); // 타임아웃 시 실패로 처리하여 재연결
            this.loginResolver = null;
          }
        }, 3000);
      });

      this.ws.send(JSON.stringify(loginMessage));
      console.log("[FMP WS] Login message sent, waiting for response...");

      return await loginPromise;
    } catch (error) {
      console.error("[FMP WS] Login failed:", error);
      return false;
    }
  }

  /**
   * 심볼 구독
   */
  async subscribe(
    symbols: string | string[],
    intervalMs: number = 60000
  ): Promise<boolean> {
    // WebSocket 연결 대기 (최대 5초)
    if (!this.ws) {
      console.error("[FMP WS] WebSocket not initialized");
      return false;
    }

    // 연결이 완료될 때까지 대기
    if (this.ws.readyState === WebSocket.CONNECTING) {
      console.log("[FMP WS] Waiting for connection to open...");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 5000);

        if (!this.ws) {
          clearTimeout(timeout);
          reject(new Error("WebSocket not initialized"));
          return;
        }

        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            resolve();
          }
        };

        this.ws.addEventListener("open", checkConnection, { once: true });

        // 이미 열려있을 수도 있으므로 즉시 체크
        checkConnection();
      }).catch((error) => {
        console.error("[FMP WS] Connection wait failed:", error);
        return false;
      });
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error(
        "[FMP WS] WebSocket not ready. State:",
        this.ws?.readyState
      );
      return false;
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map((s) => s.toUpperCase());

    try {
      const subscribeMessage = {
        event: "subscribe",
        data: {
          ticker:
            normalizedSymbols.length === 1
              ? normalizedSymbols[0]
              : normalizedSymbols,
        },
      };

      console.log(`[FMP WS] 📤 Sending subscribe message:`, subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));

      // 구독 목록 업데이트
      normalizedSymbols.forEach((symbol) => {
        this.subscriptions.add(symbol);
        this.candleIntervals.set(symbol, intervalMs);
      });

      console.log(`[FMP WS] ✅ Subscribed to: ${normalizedSymbols.join(", ")} (interval: ${intervalMs / 1000}s)`);
      return true;
    } catch (error) {
      console.error("[FMP WS] Subscribe failed:", error);
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
    const normalizedSymbols = symbolArray.map((s) => s.toUpperCase());

    try {
      const unsubscribeMessage = {
        event: "unsubscribe",
        data: {
          ticker: normalizedSymbols,
        },
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));

      normalizedSymbols.forEach((symbol) => {
        this.subscriptions.delete(symbol);
        this.candleIntervals.delete(symbol);
        this.currentCandles.delete(symbol);
      });

      console.log("[FMP WS] Unsubscribed from:", normalizedSymbols);
      return true;
    } catch (error) {
      console.error("[FMP WS] Unsubscribe failed:", error);
      return false;
    }
  }

  /**
   * 메시지 핸들러
   */
  private handleMessage(data: string) {
    try {
      const message: FMPMessage = JSON.parse(data);

      // 이벤트 메시지 처리
      if ("event" in message) {
        if (message.event === "login") {
          // 로그인이 이미 처리된 경우 (loginResolver가 null) 중복 메시지 무시
          if (!this.loginResolver) {
            console.warn("[FMP WS] Ignoring duplicate login message (already processed):", message);
            return;
          }

          // status가 200(숫자), 'success'(문자열) 또는 statusCode가 200이면 성공
          const success: boolean =
            message.status === 200 ||
            message.status === "success" ||
            message.statusCode === 200 ||
            (message.message?.toLowerCase().includes("authenticated") ?? false);

          console.log(
            "[FMP WS] Login response:",
            success ? "success" : "failed",
            message
          );

          // loginResolver 실행 및 정리
          this.loginResolver(success);
          this.loginResolver = null;

          if (!success) {
            console.error(
              "[FMP WS] Login failed. Check your API key:",
              message
            );

            // "Connected from another location" 오류 처리
            if (message.message?.includes("Connected from another location")) {
              console.warn(
                "[FMP WS] Already connected from another location. Closing and will retry..."
              );
            }

            // Unauthorized 오류도 로그
            if (message.status === 401 || message.message?.includes("Unauthorized")) {
              console.warn("[FMP WS] Unauthorized - authentication required");
            }
          }
        } else if (message.event === "subscribe") {
          // subscribe 이벤트 처리
          if (message.status === 200) {
            console.log("[FMP WS] Subscribe success:", message);
          } else {
            console.error("[FMP WS] Subscribe failed:", message);
          }
        } else {
          console.log("[FMP WS] Other event:", message);
        }
        return;
      }

      // 실시간 가격 데이터
      if (message.s && message.lp !== undefined) {
        const symbol = message.s.toUpperCase();
        console.log(`[FMP WS] 📊 Price data: ${symbol} = $${message.lp} (time: ${new Date(message.t).toLocaleTimeString()})`);

        // 메시지 콜백 실행
        const callbacks = this.messageCallbacks.get(symbol) || [];
        callbacks.forEach((cb) => cb(message));

        // 캔들 데이터 생성/업데이트
        this.updateCandle(symbol, message);
      }
    } catch (error) {
      console.error("[FMP WS] Message parse error:", error);
    }
  }

  /**
   * 실시간 캔들 업데이트
   */
  private updateCandle(symbol: string, message: FMPWebSocketMessage) {
    const price = message.lp || message.ap || message.bp;
    if (!price) {
      return;
    }

    const intervalMs = this.candleIntervals.get(symbol) || 60000; // 기본 1분
    const timestamp = message.t || Date.now();
    const candleTime = Math.floor(timestamp / intervalMs) * intervalMs;
    const candleTimeSeconds = Math.floor(candleTime / 1000);

    let candle = this.currentCandles.get(symbol);

    // 새 캔들 시작
    if (!candle || candle.time !== candleTimeSeconds) {
      candle = {
        time: candleTimeSeconds, // Unix timestamp (seconds)
        open: price,
        high: price,
        low: price,
        close: price,
        volume: message.ls || 0,
      };
      this.currentCandles.set(symbol, candle);
      console.log(`[FMP WS] 🕯️ NEW candle for ${symbol}:`, {
        time: new Date(candleTimeSeconds * 1000).toLocaleTimeString(),
        price: `$${price}`,
        interval: `${intervalMs / 1000}s`
      });
    } else {
      // 기존 캔들 업데이트
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      if (message.ls) {
        candle.volume = (candle.volume || 0) + message.ls;
      }
      console.log(`[FMP WS] 🔄 UPDATE candle for ${symbol}: O:$${candle.open.toFixed(2)} H:$${candle.high.toFixed(2)} L:$${candle.low.toFixed(2)} C:$${candle.close.toFixed(2)}`);
    }

    // 캔들 콜백 실행
    const callbacks = this.candleCallbacks.get(symbol) || [];
    console.log(`[FMP WS] 📞 Calling ${callbacks.length} chart callback(s) for ${symbol}`);
    callbacks.forEach((cb) => cb({ ...candle }));
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
    console.log(`[FMP WS] 📝 Message callback registered for ${normalizedSymbol} (total: ${this.messageCallbacks.get(normalizedSymbol)!.length})`);
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
    console.log(`[FMP WS] 📝 Candle callback registered for ${normalizedSymbol} (total: ${this.candleCallbacks.get(normalizedSymbol)!.length})`);
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
      console.error("[FMP WS] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    // 첫 재시도는 빠르게 (500ms), 이후 exponential backoff
    const baseDelay = this.reconnectAttempts === 1 ? 500 : this.reconnectDelay;
    const delay = baseDelay * Math.pow(2, Math.max(0, this.reconnectAttempts - 2));

    console.log(
      `[FMP WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("[FMP WS] Reconnection failed:", error);
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
    this.isConnecting = false;
    this.connectPromise = null;
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
      isConnecting: this.isConnecting,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// 싱글톤 인스턴스
let fmpWSClient: FMPWebSocketClient | null = null;

export function getFMPWebSocketClient(): FMPWebSocketClient {
  if (!fmpWSClient) {
    // 생성자에서 환경변수를 직접 읽어서 처리
    fmpWSClient = new FMPWebSocketClient();
  }

  return fmpWSClient;
}

export type {
  FMPWebSocketMessage,
  FMPEventMessage,
  FMPMessage,
  CandleData,
  MessageCallback,
  CandleCallback,
};
