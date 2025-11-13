import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction } from "react";
import { type IChartApi, type ISeriesApi } from "lightweight-charts";
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

type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

/**
 * 실시간 WebSocket 연결 Hook
 * 1D 차트일 때만 WebSocket으로 실시간 가격을 업데이트합니다.
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

  // 실시간 WebSocket 연결 (1D일 때만, 현재 보고 있는 종목만)
  useEffect(() => {
    // WebSocket client를 effect 시작 시 저장 (cleanup에서 사용하기 위해)
    const client = wsClient.current;

    if (timeRange !== "1D" || !seriesRef.current) {
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
          console.log(
            `[Chart] Cleaning up old subscriptions: ${currentSubscriptions.join(", ")}`
          );
          await client.unsubscribe(currentSubscriptions);
        }

        if (!status.isConnected) {
          console.log(`[Chart] Connecting WebSocket...`);
          await client.connect();
        }

        if (!mounted) return;

        // 실시간 캔들 콜백
        handleCandle = (candle: CandleData) => {
          if (!seriesRef.current || !mounted) return;

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
                time: candle.time as import("lightweight-charts").Time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
              });
            } else {
              seriesRef.current.update({
                time: candle.time as import("lightweight-charts").Time,
                value: candle.close,
              });
            }

            chartRef.current?.timeScale().scrollToRealTime();
          } catch (error) {
            console.error("[Chart] Update error:", error);
          }
        };

        // 현재 종목만 구독
        const intervalMs = getIntervalMs(interval);
        console.log(
          `[Chart] 📡 Subscribing ONLY ${symbol} (${interval}, ${intervalMs}ms)`
        );

        await client.subscribe(symbol, intervalMs);
        client.onCandle(symbol, handleCandle);

        setIsRealtime(true);
        console.log(`[Chart] ✅ Realtime active for ${symbol}`);
      } catch (error) {
        console.error("[Chart WebSocket] Setup failed:", error);
        setIsRealtime(false);
      }
    };

    setupRealtimeData();

    // Cleanup
    return () => {
      console.log(`[Chart] 🔌 Cleanup for ${symbol}`);
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
