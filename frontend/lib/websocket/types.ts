/**
 * FMP WebSocket 타입 정의
 */

/**
 * FMP WebSocket 실시간 가격 데이터 메시지
 */
export interface FMPWebSocketMessage {
  s: string; // symbol
  t: number; // timestamp (ms)
  lp?: number; // last price
  ap?: number; // ask price
  bp?: number; // bid price
  ls?: number; // last size (volume)
  as?: number; // ask size
  bs?: number; // bid size
}

/**
 * 캔들 데이터 (Lightweight Charts 호환)
 */
export interface CandleData {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * FMP WebSocket 이벤트 메시지 (login, subscribe 등)
 */
export interface FMPEventMessage {
  event: string;
  status?: string | number;
  statusCode?: number;
  message?: string;
  data?: unknown;
}

/**
 * FMP 메시지 타입 (실시간 데이터 또는 이벤트)
 */
export type FMPMessage = FMPWebSocketMessage | FMPEventMessage;

/**
 * 실시간 가격 데이터 콜백
 */
export type MessageCallback = (data: FMPWebSocketMessage) => void;

/**
 * 캔들 데이터 콜백
 */
export type CandleCallback = (candle: CandleData) => void;

/**
 * 연결 상태 변경 콜백
 */
export type ConnectionCallback = (isConnected: boolean) => void;

/**
 * WebSocket 연결 상태
 */
export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  subscriptions: string[];
  reconnectAttempts: number;
}

/**
 * WebSocket 연결 옵션
 */
export interface ConnectionOptions {
  apiKey?: string;
  wsUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  loginTimeout?: number;
}

/**
 * 구독 옵션
 */
export interface SubscribeOptions {
  symbols: string | string[];
  intervalMs?: number; // 캔들 인터벌 (ms)
}

/**
 * 캔들 집계 옵션
 */
export interface CandleAggregatorOptions {
  maxCandlesCached?: number; // 캐시할 최대 캔들 수 (메모리 관리)
}
