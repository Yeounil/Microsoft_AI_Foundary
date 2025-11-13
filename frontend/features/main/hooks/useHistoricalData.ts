import { useState, useCallback, useEffect, RefObject } from "react";
import { type IChartApi, type ISeriesApi } from "lightweight-charts";
import {
  ChartDataLoader,
  type ChartPeriod as LoaderChartPeriod,
  type ChartInterval as LoaderChartInterval,
} from "@/lib/chart/chart-data-loader";
import {
  ChartType,
  TimeRange,
  ChartInterval,
  getPeriodFromRange,
  getVisibleDataPoints,
} from "../services/chartService";
import {
  ChartMode,
  filterBasicModeData,
} from "@/features/dashboard/services/dashboardChartService";

type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

export interface PriceInfo {
  currentPrice: number | null;
  priceChange: number;
  priceChangePercent: number;
  previousClose: number | null;
}

/**
 * Historical 데이터 로딩 Hook
 * API에서 과거 차트 데이터를 로드하고 차트에 표시합니다.
 */
export function useHistoricalData(
  chartRef: RefObject<IChartApi | null>,
  seriesRef: RefObject<SeriesType | null>,
  symbol: string,
  timeRange: TimeRange,
  interval: ChartInterval,
  chartType: ChartType,
  chartMode?: ChartMode
) {
  const [isLoading, setIsLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    currentPrice: null,
    priceChange: 0,
    priceChangePercent: 0,
    previousClose: null,
  });

  // Historical 데이터 로드
  const loadHistoricalData = useCallback(async () => {
    if (!seriesRef.current) {
      console.warn("[Chart] Series not ready for data loading");
      return;
    }

    setIsLoading(true);

    try {
      const period = getPeriodFromRange(timeRange);

      // Enhanced 모드에서 분단위 선택 시 interval 유지
      // chartMode가 없거나 basic이면 기존 로직 사용
      let chartInterval: ChartInterval;
      if (chartMode === "enhanced" && ["1m", "5m", "15m", "30m", "1h"].includes(interval)) {
        // Enhanced 분단위: interval 유지
        chartInterval = interval;
      } else if (timeRange === "1D" || timeRange === "1W" || timeRange === "1M") {
        // 1D, 1W, 1M: interval 사용
        chartInterval = interval;
      } else {
        // 나머지: 1d 고정
        chartInterval = "1d";
      }

      console.log(
        `[Chart] Loading historical data: ${symbol}, period: ${period}, interval: ${chartInterval}, mode: ${chartMode}`
      );

      // ChartDataLoader 사용 (자동으로 Intraday API 라우팅)
      const candleData = await ChartDataLoader.loadHistoricalData(
        symbol,
        period as LoaderChartPeriod,
        chartInterval as LoaderChartInterval
      );

      console.log(`[Chart] Received ${candleData.length} candles from API`);

      if (candleData.length > 0) {
        // Basic 모드일 때 데이터 필터링
        let processedData = candleData;
        if (chartMode === "basic") {
          processedData = filterBasicModeData(candleData, timeRange);
          console.log(
            `[Chart] Filtered data: ${candleData.length} -> ${processedData.length}`
          );
        }

        // 초기 가격 정보 설정 (마지막 캔들 기준)
        const lastCandle = processedData[processedData.length - 1];
        const firstCandle = processedData[0];

        const change = lastCandle.close - firstCandle.close;
        const changePercent = (change / firstCandle.close) * 100;

        setPriceInfo({
          currentPrice: lastCandle.close,
          priceChange: change,
          priceChangePercent: changePercent,
          previousClose: firstCandle.close,
        });

        try {
          if (chartType === "candle") {
            // ChartDataLoader returns proper format, cast to proper type
            seriesRef.current?.setData(
              processedData as Array<{
                time: import("lightweight-charts").Time;
                open: number;
                high: number;
                low: number;
                close: number;
              }>
            );
          } else {
            // Line/Area 차트는 close 값만 사용
            const lineData = processedData.map((item) => ({
              time: item.time as import("lightweight-charts").Time,
              value: item.close,
            }));
            seriesRef.current?.setData(lineData);
          }

          // Basic 모드는 항상 전체 데이터 표시 (스크롤 없이 꽉 차게)
          if (chartMode === "basic") {
            chartRef.current?.timeScale().fitContent();
          } else {
            // Enhanced 모드: 분단위 차트(1D)는 최근 데이터만 보이도록 확대
            if (timeRange === "1D" && processedData.length > 0) {
              const visibleCount = getVisibleDataPoints(
                timeRange,
                interval,
                processedData.length
              );
              chartRef.current?.timeScale().setVisibleLogicalRange({
                from: Math.max(0, processedData.length - visibleCount),
                to: processedData.length - 1,
              });
            } else {
              chartRef.current?.timeScale().fitContent();
            }
          }

          console.log(
            `[Chart] Successfully loaded ${processedData.length} data points`
          );
        } catch (error) {
          console.error("[Chart] Failed to set data:", error);
        }
      } else {
        console.warn("[Chart] No data returned from API");
      }
    } catch (error) {
      console.error("[Chart] Failed to load historical data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [seriesRef, chartRef, symbol, timeRange, interval, chartType, chartMode]);

  // Historical 데이터 로드
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  return {
    isLoading,
    priceInfo,
    setPriceInfo, // 실시간 업데이트를 위해 노출
  };
}
