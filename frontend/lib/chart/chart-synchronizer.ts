/**
 * 차트 데이터 동기화
 * REST API와 WebSocket 데이터를 동기화하여 정확도 보장
 */

import { ChartDataLoader, ChartInterval } from "./chart-data-loader";
import { FMPWebSocketClient } from "../websocket/fmp-websocket-client";
import { CandleData } from "../websocket/types";
import { logger } from "../logger";

export interface SynchronizerOptions {
  syncIntervalMs?: number; // 동기화 주기 (기본: 60초)
  enableAutoSync?: boolean; // 자동 동기화 활성화 (기본: true)
  syncOnVisibilityChange?: boolean; // 백그라운드 탭 복귀 시 동기화 (기본: true)
}

export type CandleUpdateCallback = (candle: CandleData) => void;

/**
 * 차트 동기화 클래스
 */
export class ChartSynchronizer {
  private symbol: string;
  private interval: ChartInterval;
  private wsClient: FMPWebSocketClient;
  private syncTimer: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private lastSyncTime: number = 0;
  private options: Required<SynchronizerOptions>;
  private updateCallback: CandleUpdateCallback | null = null;

  constructor(
    symbol: string,
    interval: ChartInterval,
    wsClient: FMPWebSocketClient,
    options: SynchronizerOptions = {}
  ) {
    this.symbol = symbol;
    this.interval = interval;
    this.wsClient = wsClient;
    this.options = {
      syncIntervalMs: options.syncIntervalMs || 60000,
      enableAutoSync: options.enableAutoSync ?? true,
      syncOnVisibilityChange: options.syncOnVisibilityChange ?? true,
    };
  }

  /**
   * 동기화 시작
   */
  start(updateCallback: CandleUpdateCallback) {
    this.updateCallback = updateCallback;

    // 자동 동기화 활성화
    if (this.options.enableAutoSync) {
      this.startPeriodicSync();
    }

    // 백그라운드 탭 처리
    if (
      this.options.syncOnVisibilityChange &&
      typeof document !== "undefined"
    ) {
      this.setupVisibilityListener();
    }
  }

  /**
   * 동기화 중지
   */
  stop() {
    this.stopPeriodicSync();
    this.removeVisibilityListener();
    this.updateCallback = null;
  }

  /**
   * 수동 동기화 실행
   */
  async syncNow(): Promise<boolean> {
    try {
      const recentCandles = await ChartDataLoader.loadRecentCandles(
        this.symbol,
        5,
        this.interval
      );

      if (recentCandles.length === 0) {
        logger.warn(`No recent candles loaded for ${this.symbol}`);
        return false;
      }

      // 최신 캔들 업데이트
      const latestCandle = recentCandles[recentCandles.length - 1];

      // WebSocket 캔들과 비교
      const wsCandle = this.wsClient.getCandle(this.symbol);

      if (this.needsCorrection(wsCandle, latestCandle)) {
        logger.debug(
          `[Sync] Correcting candle for ${this.symbol}`,
          latestCandle
        );

        // WebSocket 캔들 업데이트
        this.wsClient.setCandle(this.symbol, latestCandle);

        // 콜백 호출
        if (this.updateCallback) {
          this.updateCallback(latestCandle);
        }
      }

      this.lastSyncTime = Date.now();
      return true;
    } catch (error) {
      console.error(`[Sync] Failed to sync ${this.symbol}:`, error);
      return false;
    }
  }

  /**
   * 보정이 필요한지 확인
   */
  private needsCorrection(
    wsCandle: CandleData | undefined,
    apiCandle: CandleData
  ): boolean {
    if (!wsCandle) {
      return true; // WebSocket 캔들이 없으면 보정 필요
    }

    // 시간이 같지만 OHLC 값이 다른 경우
    if (wsCandle.time === apiCandle.time) {
      const tolerance = 0.01; // 1% 허용 오차

      return (
        Math.abs(wsCandle.open - apiCandle.open) / apiCandle.open > tolerance ||
        Math.abs(wsCandle.high - apiCandle.high) / apiCandle.high > tolerance ||
        Math.abs(wsCandle.low - apiCandle.low) / apiCandle.low > tolerance ||
        Math.abs(wsCandle.close - apiCandle.close) / apiCandle.close > tolerance
      );
    }

    // 시간이 다르면 API 캔들이 더 최신
    return wsCandle.time < apiCandle.time;
  }

  /**
   * 주기적 동기화 시작
   */
  private startPeriodicSync() {
    if (this.syncTimer) {
      return; // 이미 시작됨
    }

    // 첫 동기화는 즉시 실행
    this.syncNow();

    // 주기적 동기화
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, this.options.syncIntervalMs);

    logger.info(
      `[Sync] Periodic sync started for ${this.symbol} (interval: ${this.options.syncIntervalMs}ms)`
    );
  }

  /**
   * 주기적 동기화 중지
   */
  private stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info(`[Sync] Periodic sync stopped for ${this.symbol}`);
    }
  }

  /**
   * Visibility API 리스너 설정
   */
  private setupVisibilityListener() {
    this.visibilityHandler = () => {
      if (!document.hidden) {
        // 탭이 활성화되었을 때
        const now = Date.now();
        const timeSinceLastSync = now - this.lastSyncTime;

        // 마지막 동기화로부터 30초 이상 경과 시 동기화
        if (timeSinceLastSync > 30000) {
          logger.debug(
            `[Sync] Tab became visible, syncing ${this.symbol} (${Math.round(timeSinceLastSync / 1000)}s since last sync)`
          );
          this.syncNow();
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  /**
   * Visibility API 리스너 제거
   */
  private removeVisibilityListener() {
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * 마지막 동기화 시간 조회
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * 동기화 주기 변경
   */
  setSyncInterval(intervalMs: number) {
    this.options.syncIntervalMs = intervalMs;

    // 재시작
    if (this.syncTimer) {
      this.stopPeriodicSync();
      this.startPeriodicSync();
    }
  }
}
