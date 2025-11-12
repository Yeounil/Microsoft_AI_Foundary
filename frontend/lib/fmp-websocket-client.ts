/**
 * FMP WebSocket Client
 *
 * 이 파일은 하위 호환성을 위한 re-export입니다.
 * 새로운 모듈화된 코드는 websocket/ 폴더에 있습니다.
 *
 * 기존 import 경로를 그대로 사용할 수 있습니다:
 * import { getFMPWebSocketClient } from "@/lib/fmp-websocket-client";
 *
 * 또는 새로운 경로를 사용할 수도 있습니다:
 * import { getFMPWebSocketClient } from "@/lib/websocket/fmp-websocket-client";
 */

// 새로운 모듈화된 코드를 re-export
export * from "./websocket/fmp-websocket-client";
export { getFMPWebSocketClient, resetFMPWebSocketClient } from "./websocket/fmp-websocket-client";

// 타입도 re-export
export type {
  FMPWebSocketMessage,
  FMPMessage,
  CandleData,
  MessageCallback,
  CandleCallback,
  ConnectionCallback,
  ConnectionStatus,
  ConnectionOptions,
} from "./websocket/types";
