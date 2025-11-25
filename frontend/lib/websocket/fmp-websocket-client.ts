/**
 * FMP WebSocket 클라이언트 (Facade 패턴)
 * 모든 모듈을 통합하여 간단한 인터페이스 제공
 */

import { Logger, LogLevel } from "./logger";
import { WebSocketConnection } from "./connection";
import { SubscriptionManager } from "./subscription";
import { CandleAggregator } from "./candle-aggregator";
import {
  ConnectionOptions,
  CandleAggregatorOptions,
  FMPWebSocketMessage,
  FMPMessage,
  CandleData,
  MessageCallback,
  CandleCallback,
  ConnectionCallback,
  ConnectionStatus,
} from "./types";

export class FMPWebSocketClient {
  private logger: Logger;
  private connection: WebSocketConnection;
  private subscriptionManager: SubscriptionManager;
  private candleAggregator: CandleAggregator;
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();

  constructor(
    options: ConnectionOptions = {},
    logLevel?: LogLevel,
    candleOptions: CandleAggregatorOptions = {}
  ) {
    // 로거 초기화
    this.logger = new Logger(logLevel);

    // 연결 관리자 초기화
    this.connection = new WebSocketConnection(options, this.logger);

    // 구독 관리자 초기화
    this.subscriptionManager = new SubscriptionManager(
      this.connection,
      this.logger
    );

    // 캔들 집계자 초기화
    this.candleAggregator = new CandleAggregator(candleOptions, this.logger);

    // 메시지 핸들러 등록
    this.connection.onMessage(this.handleMessage.bind(this));

    // 연결 상태 변경 시 재구독
    this.connection.onConnectionChange((isConnected) => {
      if (isConnected) {
        this.subscriptionManager.resubscribe();
      }
    });
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    return await this.connection.connect();
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.connection.disconnect();
    this.subscriptionManager.clear();
    this.candleAggregator.clear();
    this.messageCallbacks.clear();
  }

  /**
   * 심볼 구독
   */
  async subscribe(
    symbols: string | string[],
    intervalMs: number = 60000
  ): Promise<boolean> {
    return await this.subscriptionManager.subscribe(symbols, intervalMs);
  }

  /**
   * 구독 해제
   */
  async unsubscribe(symbols: string | string[]): Promise<boolean> {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map((s) => s.toUpperCase());

    // 구독 해제
    const success = await this.subscriptionManager.unsubscribe(normalizedSymbols);

    // 캔들 및 콜백 정리
    normalizedSymbols.forEach((symbol) => {
      this.candleAggregator.removeCandle(symbol);
      this.messageCallbacks.delete(symbol);
    });

    return success;
  }

  /**
   * 메시지 핸들러
   */
  private handleMessage(message: FMPMessage) {
    // 백엔드 API 형식 처리
    if ("type" in message && message.type === "price_update" && "symbol" in message) {
      const backendMessage = message as any;

      // 백엔드 형식을 FMP 형식으로 변환
      const priceMessage: FMPWebSocketMessage = {
        s: backendMessage.symbol,
        t: backendMessage.timestamp,
        lp: backendMessage.last_price,
        ls: backendMessage.last_size,
        ap: backendMessage.ask_price,
        as: backendMessage.ask_size,
        bp: backendMessage.bid_price,
        bs: backendMessage.bid_size,
      };

      const symbol = priceMessage.s.toUpperCase();

      let timestamp = priceMessage.t;
      if (timestamp && timestamp > 1e15) {
        timestamp = Math.floor(timestamp / 1000000);
      }

      const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString()
        : 'No timestamp';

      this.logger.debug(
        `Price data: ${symbol} = $${priceMessage.lp} (time: ${timeStr})`
      );

      // 메시지 콜백 실행
      this.triggerMessageCallbacks(symbol, priceMessage);

      // 캔들 데이터 생성/업데이트
      const intervalMs = this.subscriptionManager.getInterval(symbol);
      if (intervalMs) {
        this.candleAggregator.updateFromTick(symbol, priceMessage, intervalMs);
      }
    }
    // FMP 직접 연결 형식 (하위 호환)
    else if (
      "s" in message &&
      typeof message.s === "string" &&
      message.lp !== undefined
    ) {
      const priceMessage = message as FMPWebSocketMessage;
      const symbol = priceMessage.s.toUpperCase();

      let timestamp = priceMessage.t;
      if (timestamp && timestamp > 1e15) {
        timestamp = Math.floor(timestamp / 1000000);
      }

      const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString()
        : 'No timestamp';

      this.logger.debug(
        `Price data: ${symbol} = $${priceMessage.lp} (time: ${timeStr})`
      );

      this.triggerMessageCallbacks(symbol, priceMessage);

      const intervalMs = this.subscriptionManager.getInterval(symbol);
      if (intervalMs) {
        this.candleAggregator.updateFromTick(symbol, priceMessage, intervalMs);
      }
    }
  }

  /**
   * 메시지 콜백 실행
   */
  private triggerMessageCallbacks(
    symbol: string,
    message: FMPWebSocketMessage
  ) {
    const callbacks = this.messageCallbacks.get(symbol) || [];
    callbacks.forEach((cb) => cb(message));
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
    this.logger.debug(
      `Message callback registered for ${normalizedSymbol} (total: ${this.messageCallbacks.get(normalizedSymbol)!.length})`
    );
  }

  /**
   * 메시지 콜백 제거
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

  /**
   * 캔들 콜백 등록
   */
  onCandle(symbol: string, callback: CandleCallback) {
    this.candleAggregator.onCandle(symbol, callback);
  }

  /**
   * 캔들 콜백 제거
   */
  offCandle(symbol: string, callback: CandleCallback) {
    this.candleAggregator.offCandle(symbol, callback);
  }

  /**
   * 연결 상태 변경 콜백 등록
   */
  onConnectionChange(callback: ConnectionCallback) {
    this.connection.onConnectionChange(callback);
  }

  /**
   * 연결 상태 조회
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.connection.isConnected,
      isConnecting: this.connection.isConnecting,
      subscriptions: this.subscriptionManager.getSubscriptions(),
      reconnectAttempts: this.connection.getReconnectAttempts(),
    };
  }

  /**
   * 캔들 직접 설정 (REST API 동기화용)
   */
  setCandle(symbol: string, candle: CandleData): void {
    this.candleAggregator.setCandle(symbol, candle);
  }

  /**
   * 현재 캔들 조회
   */
  getCandle(symbol: string): CandleData | undefined {
    return this.candleAggregator.getCandle(symbol);
  }

  /**
   * 로그 레벨 설정
   */
  setLogLevel(level: LogLevel) {
    this.logger.setLevel(level);
  }

  /**
   * 구독 여부 확인
   */
  isSubscribed(symbol: string): boolean {
    return this.subscriptionManager.isSubscribed(symbol);
  }
}

// 싱글톤 인스턴스
let fmpWSClient: FMPWebSocketClient | null = null;

/**
 * 싱글톤 FMP WebSocket 클라이언트 획득
 */
export function getFMPWebSocketClient(
  options: ConnectionOptions = {},
  logLevel?: LogLevel
): FMPWebSocketClient {
  if (!fmpWSClient) {
    fmpWSClient = new FMPWebSocketClient(options, logLevel);
  }

  return fmpWSClient;
}

/**
 * 싱글톤 인스턴스 재설정 (테스트용)
 */
export function resetFMPWebSocketClient() {
  if (fmpWSClient) {
    fmpWSClient.disconnect();
    fmpWSClient = null;
  }
}

// 타입 재export
export type {
  FMPWebSocketMessage,
  FMPMessage,
  CandleData,
  MessageCallback,
  CandleCallback,
  ConnectionCallback,
  ConnectionStatus,
  ConnectionOptions,
} from "./types";
