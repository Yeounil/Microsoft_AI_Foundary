/**
 * WebSocket 연결 관리
 * connect, disconnect, login, reconnect 로직을 담당
 */

import { Logger } from "./logger";
import { ConnectionOptions, ConnectionCallback, FMPMessage } from "./types";

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private wsUrl: string;
  private logger: Logger;

  // 연결 상태
  private _isConnected = false;
  private _isConnecting = false;
  private connectPromise: Promise<boolean> | null = null;

  // 재연결 설정
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private loginTimeout: number;
  private isOnline = true;

  // 로그인 응답 대기
  private loginResolver: ((success: boolean) => void) | null = null;

  // 콜백
  private connectionCallbacks: ConnectionCallback[] = [];
  private messageHandlers: ((message: FMPMessage) => void)[] = [];

  constructor(options: ConnectionOptions, logger: Logger) {
    this.apiKey =
      options.apiKey ||
      process.env.NEXT_PUBLIC_FMP_API_KEY ||
      "";
    this.wsUrl =
      options.wsUrl ||
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://websockets.financialmodelingprep.com";
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.loginTimeout = options.loginTimeout || 5000;
    this.logger = logger;

    if (!this.apiKey) {
      this.logger.error(
        "API key not found! Please set NEXT_PUBLIC_FMP_API_KEY in .env.local"
      );
    } else {
      this.logger.debug(
        `API key loaded: ${this.apiKey.substring(0, 10)}...`
      );
    }

    // 브라우저 환경에서만 online/offline 이벤트 리스너 등록
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.logger.info('Network is online');
        this.isOnline = true;
        // 오프라인에서 온라인으로 전환 시 재연결 시도
        if (!this._isConnected && !this._isConnecting) {
          this.reconnectAttempts = 0; // 재시도 카운터 리셋
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.logger.warn('Network is offline');
        this.isOnline = false;
      });
    }
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    // 이미 연결됨
    if (this._isConnected) {
      this.logger.debug("Already connected");
      return true;
    }

    // 연결 중이면 기존 Promise 반환 (중복 연결 방지)
    if (this._isConnecting && this.connectPromise) {
      this.logger.debug("Connection in progress, waiting...");
      return this.connectPromise;
    }

    this._isConnecting = true;

    try {
      this.logger.info("Connecting...");

      const wsUrl = `${this.wsUrl}?apikey=${this.apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.connectPromise = new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        this.ws.onopen = async () => {
          this.logger.info("Connected");
          this._isConnected = true;
          this._isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyConnectionChange(true);

          // 로그인 (FMP WebSocket은 연결 후 반드시 login 이벤트 필요)
          const loginSuccess = await this.login();

          if (loginSuccess) {
            this.connectPromise = null;
            resolve(true);
          } else {
            this.logger.warn("Login failed, will retry via reconnect logic");
            this._isConnecting = false;
            this.connectPromise = null;
            this.ws?.close();
            reject(new Error("Login failed - retrying"));
          }
        };

        this.ws.onerror = (error) => {
          this.logger.error("Error:", error);
          this._isConnected = false;
          this._isConnecting = false;
          this.connectPromise = null;
          this.notifyConnectionChange(false);
          reject(error);
        };

        this.ws.onclose = () => {
          this.logger.info("Disconnected");
          this._isConnected = false;
          this._isConnecting = false;
          this.connectPromise = null;
          this.notifyConnectionChange(false);
          this.handleReconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });

      return this.connectPromise;
    } catch (error) {
      this.logger.error("Connection failed:", error);
      this._isConnecting = false;
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
      this.logger.error(
        "Invalid API key. Please set NEXT_PUBLIC_FMP_API_KEY in .env.local"
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

        // 타임아웃
        setTimeout(() => {
          if (this.loginResolver) {
            this.logger.warn(`Login timeout after ${this.loginTimeout}ms`);
            this.loginResolver(false);
            this.loginResolver = null;
          }
        }, this.loginTimeout);
      });

      this.ws.send(JSON.stringify(loginMessage));
      this.logger.debug("Login message sent, waiting for response...");

      return await loginPromise;
    } catch (error) {
      this.logger.error("Login failed:", error);
      return false;
    }
  }

  /**
   * 메시지 처리
   */
  private handleMessage(data: string) {
    try {
      const message: FMPMessage = JSON.parse(data);

      // 로그인 응답 처리
      if ("event" in message && message.event === "login") {
        this.handleLoginResponse(message);
        return;
      }

      // 다른 이벤트 처리 (subscribe/unsubscribe는 정상 동작이므로 로깅 생략)
      if ("event" in message) {
        const eventType = message.event;
        if (eventType !== "subscribe" && eventType !== "unsubscribe") {
          this.logger.debug(`Event received: ${eventType}`, message);
        }
      }

      // 메시지 핸들러에 전달
      this.messageHandlers.forEach((handler) => handler(message));
    } catch (error) {
      this.logger.error("Message parse error:", error);
    }
  }

  /**
   * 로그인 응답 처리
   */
  private handleLoginResponse(message: FMPMessage) {
    // 로그인이 이미 처리된 경우 중복 메시지 무시
    if (!this.loginResolver) {
      this.logger.warn("Ignoring duplicate login message (already processed)");
      return;
    }

    const success: boolean =
      ("status" in message &&
        (message.status === 200 || message.status === "success")) ||
      ("statusCode" in message && message.statusCode === 200) ||
      ("message" in message &&
        message.message?.toLowerCase().includes("authenticated")) ||
      false;

    this.logger.info(
      `Login response: ${success ? "success" : "failed"}`,
      message
    );

    // loginResolver 실행 및 정리
    if (this.loginResolver) {
      this.loginResolver(success);
      this.loginResolver = null;
    }

    if (!success) {
      this.logger.error("Login failed. Check your API key:", message);

      if (
        "message" in message &&
        message.message?.includes("Connected from another location")
      ) {
        this.logger.warn(
          "Already connected from another location. Closing and will retry..."
        );
      }

      if (
        ("status" in message && message.status === 401) ||
        ("message" in message && message.message?.includes("Unauthorized"))
      ) {
        this.logger.warn("Unauthorized - authentication required");
      }
    }
  }

  /**
   * 재연결 처리
   */
  private async handleReconnect() {
    // 오프라인 상태면 재연결 시도하지 않음
    if (!this.isOnline) {
      this.logger.info('Offline - waiting for network to resume');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
    const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);

    this.logger.info(
      `Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error("Reconnection failed:", error);
      }
    }, delay);
  }

  /**
   * 네트워크 온라인 상태 확인
   */
  get isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this._isConnected = false;
    this._isConnecting = false;
    this.connectPromise = null;
    this.notifyConnectionChange(false);
  }

  /**
   * 메시지 전송
   */
  send(message: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn("WebSocket not ready. Cannot send message.");
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error("Send failed:", error);
      return false;
    }
  }

  /**
   * 메시지 핸들러 등록
   */
  onMessage(handler: (message: FMPMessage) => void) {
    this.messageHandlers.push(handler);
  }

  /**
   * 메시지 핸들러 제거
   */
  offMessage(handler: (message: FMPMessage) => void) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 연결 상태 변경 콜백 등록
   */
  onConnectionChange(callback: ConnectionCallback) {
    this.connectionCallbacks.push(callback);
  }

  /**
   * 연결 상태 변경 알림
   */
  private notifyConnectionChange(isConnected: boolean) {
    this.connectionCallbacks.forEach((callback) => callback(isConnected));
  }

  /**
   * 연결 상태 확인
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  get isConnecting(): boolean {
    return this._isConnecting;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
