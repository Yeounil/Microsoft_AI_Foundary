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
  chartMode?: ChartMode,
  enhancedChartType?: string // Enhanced 차트 타입 추가
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

      // Enhanced 모드는 항상 interval 유지
      // Basic 모드는 조건에 따라 interval 결정
      let chartInterval: ChartInterval;
      if (chartMode === "enhanced") {
        // Enhanced 모드: 항상 전달받은 interval 사용
        chartInterval = interval;
      } else if (timeRange === "1D" || timeRange === "1W" || timeRange === "1M") {
        // Basic 모드 1D, 1W, 1M: interval 사용
        chartInterval = interval;
      } else {
        // Basic 모드 나머지: 1d 고정
        chartInterval = "1d";
      }

      // 주봉/월봉/연봉은 일봉 데이터를 가져와서 프론트에서 집계
      const apiInterval = (chartInterval === "1wk" || chartInterval === "1mo" || chartInterval === "1y")
        ? "1d"
        : chartInterval;

      console.log(
        `[Chart] Loading historical data: ${symbol}, period: ${period}, apiInterval: ${apiInterval}, chartInterval: ${chartInterval}, mode: ${chartMode}, enhancedType: ${enhancedChartType}`
      );

      // ChartDataLoader 사용 (자동으로 Intraday API 라우팅)
      const candleData = await ChartDataLoader.loadHistoricalData(
        symbol,
        period as LoaderChartPeriod,
        apiInterval as LoaderChartInterval
      );

      console.log(`[Chart] Received ${candleData.length} candles from API`);

      if (candleData.length > 0) {
        // 데이터 처리
        let processedData = candleData;

        // Basic 모드일 때 데이터 필터링
        if (chartMode === "basic") {
          processedData = filterBasicModeData(candleData, timeRange);
          console.log(
            `[Chart] Filtered data: ${candleData.length} -> ${processedData.length}`
          );
        }

        // Enhanced 모드에서 주봉/월봉/연봉 집계
        if (chartMode === "enhanced") {
          if (chartInterval === "1wk") {
            processedData = ChartDataLoader.aggregateToWeekly(processedData);
            console.log(
              `[Chart] Aggregated to weekly: ${candleData.length} -> ${processedData.length} candles`
            );
          } else if (chartInterval === "1mo") {
            processedData = ChartDataLoader.aggregateToMonthly(processedData);
            console.log(
              `[Chart] Aggregated to monthly: ${candleData.length} -> ${processedData.length} candles`
            );
          } else if (chartInterval === "1y") {
            processedData = ChartDataLoader.aggregateToYearly(processedData);
            console.log(
              `[Chart] Aggregated to yearly: ${candleData.length} -> ${processedData.length} candles`
            );
          }
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
            // Enhanced 모드: interval에 따라 보이는 캔들 개수 조정
            if (processedData.length > 0) {
              // interval에 따른 기본 표시 캔들 개수
              const visibleCountMap: Record<string, number> = {
                "1m": 120,   // 2시간치
                "5m": 80,    // 6시간 40분치
                "15m": 50,   // 12시간 30분치
                "30m": 40,   // 20시간치
                "1h": 24,    // 24시간치
                "1d": 90,    // 3개월치
                "1wk": 52,   // 1년치
                "1mo": 24,   // 2년치
                "1y": 10,    // 10년치
              };

              const visibleCount = visibleCountMap[chartInterval] || processedData.length;

              // 데이터가 visibleCount보다 많으면 확대, 적으면 전체 표시
              if (processedData.length > visibleCount) {
                chartRef.current?.timeScale().setVisibleLogicalRange({
                  from: Math.max(0, processedData.length - visibleCount),
                  to: processedData.length - 1,
                });
              } else {
                chartRef.current?.timeScale().fitContent();
              }
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
  }, [seriesRef, chartRef, symbol, timeRange, interval, chartType, chartMode, enhancedChartType]);

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
