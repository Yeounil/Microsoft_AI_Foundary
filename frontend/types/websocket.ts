/**
 * WebSocket 관련 타입 정의
 */

// 실시간 가격 업데이트 타입
export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
  high: number;
  low: number;
  open: number;
  previous_close: number;
}

// WebSocket 메시지 타입 (서버에서 받는 메시지)
export interface WebSocketMessage {
  type: 'price_update' | 'error' | 'connected' | 'disconnected' | 'ping' | 'pong';
  data?: PriceUpdate | string;
  error?: string;
  timestamp?: string;
}

// WebSocket 명령 타입 (서버로 보내는 메시지)
export interface WebSocketCommand {
  action: 'subscribe' | 'unsubscribe' | 'ping' | 'get_subscriptions';
  symbols?: string[];
}

// WebSocket 연결 상태
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

// WebSocket 구독 요청 타입 (deprecated - use WebSocketCommand)
export interface SubscriptionRequest {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

// WebSocket 에러 타입
export interface WebSocketError {
  code: number;
  message: string;
  timestamp: string;
}

// 타입 가드 함수들
export function isPriceUpdate(data: unknown): data is PriceUpdate {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    'symbol' in obj &&
    'price' in obj &&
    typeof obj.symbol === 'string' &&
    typeof obj.price === 'number'
  );
}

export function isWebSocketMessage(data: unknown): data is WebSocketMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return 'type' in obj && typeof obj.type === 'string';
}

export function isWebSocketError(data: unknown): data is WebSocketError {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    'code' in obj &&
    'message' in obj &&
    typeof obj.code === 'number' &&
    typeof obj.message === 'string'
  );
}