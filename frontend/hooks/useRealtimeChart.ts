/**
 * 실시간 차트 Custom Hook
 * REST API + WebSocket Hybrid 방식으로 차트 데이터 관리
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getFMPWebSocketClient } from "../lib/websocket/fmp-websocket-client";
import { ChartDataLoader, ChartInterval, ChartPeriod } from "../lib/chart/chart-data-loader";
import { ChartSynchronizer } from "../lib/chart/chart-synchronizer";
import { CandleData } from "../lib/websocket/types";
import { logger } from "../lib/logger";

export interface UseRealtimeChartOptions {
  enableRealtime?: boolean; // 실시간 업데이트 활성화 (기본: true)
  enableSync?: boolean; // 주기적 동기화 활성화 (기본: true)
  syncIntervalMs?: number; // 동기화 주기 (기본: 60초)
}

export interface UseRealtimeChartResult {
  data: CandleData[];
  isLoading: boolean;
  isRealtime: boolean;
  error: string | null;
  loadHistoricalData: () => Promise<void>;
  startRealtimeUpdates: () => Promise<void>;
  stopRealtimeUpdates: () => void;
  updateCandle: (candle: CandleData) => void;
}

/**
 * 실시간 차트 Hook
 */
export function useRealtimeChart(
  symbol: string,
  period: ChartPeriod = "1d",
  interval: ChartInterval = "1d",
  options: UseRealtimeChartOptions = {}
): UseRealtimeChartResult {
  const [data, setData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsClientRef = useRef(getFMPWebSocketClient());
  const synchronizerRef = useRef<ChartSynchronizer | null>(null);
  const candleCallbackRef = useRef<((candle: CandleData) => void) | null>(null);

  const {
    enableRealtime = true,
    enableSync = true,
    syncIntervalMs = 60000,
  } = options;

  /**
   * 과거 데이터 로드 (REST API)
   */
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const historicalData = await ChartDataLoader.loadHistoricalData(
        symbol,
        period,
        interval
      );

      if (historicalData.candles.length === 0) {
        setError("No data available");
        return;
      }

      setData(historicalData.candles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
      logger.error("Failed to load historical data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, period, interval]);

  /**
   * 실시간 업데이트 시작 (WebSocket)
   */
  const startRealtimeUpdates = useCallback(async () => {
    if (!enableRealtime) {
      logger.info("Realtime updates disabled");
      return;
    }

    try {
      const wsClient = wsClientRef.current;

      // WebSocket 연결
      await wsClient.connect();

      // 구독
      const intervalMs = ChartDataLoader.getIntervalMs(interval);
      await wsClient.subscribe(symbol, intervalMs);

      // 캔들 콜백 등록
      candleCallbackRef.current = (candle: CandleData) => {
        setData((prevData) => {
          const newData = [...prevData];
          const lastIndex = newData.length - 1;

          if (lastIndex >= 0 && newData[lastIndex].time === candle.time) {
            // 기존 캔들 업데이트
            newData[lastIndex] = candle;
          } else {
            // 새 캔들 추가
            newData.push(candle);
          }

          return newData;
        });
      };

      wsClient.onCandle(symbol, candleCallbackRef.current);

      setIsRealtime(true);
      logger.info(`Realtime updates started for ${symbol}`);

      // 동기화 시작
      if (enableSync) {
        const synchronizer = new ChartSynchronizer(
          symbol,
          interval,
          wsClient,
          {
            syncIntervalMs,
            enableAutoSync: true,
            syncOnVisibilityChange: true,
          }
        );

        synchronizer.start((candle) => {
          // 동기화된 캔들 업데이트
          if (candleCallbackRef.current) {
            candleCallbackRef.current(candle);
          }
        });

        synchronizerRef.current = synchronizer;
        logger.info(`Synchronizer started for ${symbol}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start realtime updates";
      setError(errorMessage);
      logger.error("Failed to start realtime updates:", err);
    }
  }, [symbol, interval, enableRealtime, enableSync, syncIntervalMs]);

  /**
   * 실시간 업데이트 중지
   */
  const stopRealtimeUpdates = useCallback(() => {
    const wsClient = wsClientRef.current;

    // 캔들 콜백 제거
    if (candleCallbackRef.current) {
      wsClient.offCandle(symbol, candleCallbackRef.current);
      candleCallbackRef.current = null;
    }

    // 구독 해제
    wsClient.unsubscribe(symbol);

    // 동기화 중지
    if (synchronizerRef.current) {
      synchronizerRef.current.stop();
      synchronizerRef.current = null;
    }

    setIsRealtime(false);
    logger.info(`Realtime updates stopped for ${symbol}`);
  }, [symbol]);

  /**
   * 캔들 수동 업데이트 (외부에서 호출 가능)
   */
  const updateCandle = useCallback((candle: CandleData) => {
    setData((prevData) => {
      const newData = [...prevData];
      const lastIndex = newData.length - 1;

      if (lastIndex >= 0 && newData[lastIndex].time === candle.time) {
        newData[lastIndex] = candle;
      } else {
        newData.push(candle);
      }

      return newData;
    });
  }, []);

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      stopRealtimeUpdates();
    };
  }, [stopRealtimeUpdates]);

  return {
    data,
    isLoading,
    isRealtime,
    error,
    loadHistoricalData,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    updateCandle,
  };
}
