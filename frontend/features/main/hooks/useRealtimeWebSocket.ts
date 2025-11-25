import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction } from "react";
import { type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import {
  getFMPWebSocketClient,
  type CandleData,
} from "@/lib/fmp-websocket-client";
import {
  ChartType,
  TimeRange,
  ChartInterval,
  getIntervalMs,
} from "../services/chartService";
import { PriceInfo } from "./useHistoricalData";
import { logger } from "@/lib/logger";

// 마지막 업데이트 시간 추적용
let lastUpdateTime: number = 0;

type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

/**
 * 실시간 WebSocket 연결 Hook
 * 분봉/시간봉/일봉 차트일 때 WebSocket으로 실시간 가격을 업데이트합니다.
 */
export function useRealtimeWebSocket(
  chartRef: RefObject<IChartApi | null>,
  seriesRef: RefObject<SeriesType | null>,
  symbol: string,
  timeRange: TimeRange,
  interval: ChartInterval,
  chartType: ChartType,
  priceInfo: PriceInfo,
  setPriceInfo: Dispatch<SetStateAction<PriceInfo>>
) {
  const [isRealtime, setIsRealtime] = useState(false);
  const wsClient = useRef(getFMPWebSocketClient());

  // 실시간 WebSocket 연결 (분봉/시간봉/일봉일 때, 현재 보고 있는 종목만)
  useEffect(() => {
    // WebSocket client를 effect 시작 시 저장 (cleanup에서 사용하기 위해)
    const client = wsClient.current;

    // interval 기반으로 실시간 지원 여부 판단 (분봉/시간봉/일봉 실시간 지원)
    const isRealtimeSupported = ["1m", "5m", "15m", "30m", "1h", "1d"].includes(interval);

    if (!isRealtimeSupported || !seriesRef.current) {
      // Early return 시 realtime 상태 정리는 cleanup에서 처리
      return () => {
        setIsRealtime(false);
      };
    }

    let mounted = true;
    let handleCandle: ((candle: CandleData) => void) | null = null;

    const setupRealtimeData = async () => {
      try {
        const status = client.getConnectionStatus();

        // 모든 기존 구독 해제 (깨끗한 시작)
        const currentSubscriptions = status.subscriptions;
        if (currentSubscriptions.length > 0) {
          logger.debug(
            `[Chart] Cleaning up old subscriptions: ${currentSubscriptions.join(", ")}`
          );
          await client.unsubscribe(currentSubscriptions);
        }

        if (!status.isConnected) {
          logger.info(`[Chart] Connecting WebSocket...`);
          await client.connect();
        }

        if (!mounted) return;

        // 실시간 캔들 콜백
        handleCandle = (candle: CandleData) => {
          if (!seriesRef.current || !mounted) return;

          // 캔들 시간을 숫자로 변환 (Unix timestamp)
          const candleTime = typeof candle.time === 'number'
            ? candle.time
            : new Date(candle.time as string).getTime() / 1000;

          // 이전 시간보다 오래된 데이터는 무시 (lightweight-charts 오류 방지)
          if (candleTime < lastUpdateTime) {
            logger.debug(`[Chart] Skipping old candle: ${candleTime} < ${lastUpdateTime}`);
            return;
          }
          lastUpdateTime = candleTime;

          // 실시간 가격 정보 업데이트
          setPriceInfo((prev) => {
            if (prev.previousClose !== null) {
              const change = candle.close - prev.previousClose;
              const changePercent = (change / prev.previousClose) * 100;
              return {
                currentPrice: candle.close,
                priceChange: change,
                priceChangePercent: changePercent,
                previousClose: prev.previousClose,
              };
            }
            return { ...prev, currentPrice: candle.close };
          });

          try {
            if (chartType === "candle") {
              seriesRef.current.update({
                time: candle.time as Time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
              });
            } else {
              seriesRef.current.update({
                time: candle.time as Time,
                value: candle.close,
              });
            }

            chartRef.current?.timeScale().scrollToRealTime();
          } catch (error) {
            // "Cannot update oldest data" 오류 무시 (타이밍 이슈)
            if (error instanceof Error && error.message.includes('oldest data')) {
              logger.debug(`[Chart] Skipping oldest data update`);
            } else {
              console.error("[Chart] Update error:", error);
            }
          }
        };

        // 현재 종목만 구독
        const intervalMs = getIntervalMs(interval);
        logger.debug(
          `[Chart] Subscribing ONLY ${symbol} (${interval}, ${intervalMs}ms)`
        );

        // 새 구독 시작 시 마지막 업데이트 시간 리셋
        lastUpdateTime = 0;

        await client.subscribe(symbol, intervalMs);
        client.onCandle(symbol, handleCandle);

        setIsRealtime(true);
        logger.info(`[Chart] Realtime active for ${symbol}`);
      } catch (error) {
        console.error("[Chart WebSocket] Setup failed:", error);
        setIsRealtime(false);
      }
    };

    setupRealtimeData();

    // Cleanup
    return () => {
      logger.debug(`[Chart] Cleanup for ${symbol}`);
      mounted = false;

      if (handleCandle) {
        client.offCandle(symbol, handleCandle);
      }
      client.unsubscribe(symbol);
      setIsRealtime(false);
    };
  }, [
    chartRef,
    seriesRef,
    symbol,
    timeRange,
    interval,
    chartType,
    setPriceInfo,
  ]);

  return { isRealtime };
}
