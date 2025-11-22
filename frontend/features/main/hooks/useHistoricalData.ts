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
import { useStockStore } from "@/store/stock-store";
import { logger } from "@/lib/logger";

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
  enhancedChartType?: string, // Enhanced 차트 타입 추가
  isMobile?: boolean, // 모바일 여부
  isTablet?: boolean // 태블릿 여부
) {
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    currentPrice: null,
    priceChange: 0,
    priceChangePercent: 0,
    previousClose: null,
  });

  const { updateStockInfo } = useStockStore();

  // Historical 데이터 로드
  const loadHistoricalData = useCallback(async () => {
    if (!seriesRef.current) {
      logger.warn("[Chart] Series not ready for data loading");
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

      logger.debug(
        `[Chart] Loading historical data: ${symbol}, period: ${period}, apiInterval: ${apiInterval}, chartInterval: ${chartInterval}, mode: ${chartMode}, enhancedType: ${enhancedChartType}`
      );

      // ChartDataLoader 사용 (자동으로 Intraday API 라우팅)
      const result = await ChartDataLoader.loadHistoricalData(
        symbol,
        period as LoaderChartPeriod,
        apiInterval as LoaderChartInterval
      );

      const candleData = result.candles;

      // Update stock store with company name
      if (result.companyName) {
        updateStockInfo({ company_name: result.companyName });
      }

      logger.debug(`[Chart] Received ${candleData.length} candles from API`);

      if (candleData.length > 0) {
        // 데이터 처리
        let processedData = candleData;

        // Basic 모드일 때 데이터 필터링
        if (chartMode === "basic") {
          processedData = filterBasicModeData(candleData, timeRange);
          logger.debug(
            `[Chart] Filtered data: ${candleData.length} -> ${processedData.length}`
          );
        }

        // Enhanced 모드에서 주봉/월봉/연봉 집계
        if (chartMode === "enhanced") {
          if (chartInterval === "1wk") {
            processedData = ChartDataLoader.aggregateToWeekly(processedData);
            logger.debug(
              `[Chart] Aggregated to weekly: ${candleData.length} -> ${processedData.length} candles`
            );
          } else if (chartInterval === "1mo") {
            processedData = ChartDataLoader.aggregateToMonthly(processedData);
            logger.debug(
              `[Chart] Aggregated to monthly: ${candleData.length} -> ${processedData.length} candles`
            );
          } else if (chartInterval === "1y") {
            processedData = ChartDataLoader.aggregateToYearly(processedData);
            logger.debug(
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
              // 디바이스별 interval에 따른 표시 캔들 개수
              const getVisibleCount = (interval: string): number => {
                if (isMobile) {
                  // 모바일: 더 적은 캔들로 더 크게 표시
                  const mobileCountMap: Record<string, number> = {
                    "1m": 60,    // 1시간치 (데스크탑의 50%)
                    "5m": 40,    // 3시간 20분치
                    "15m": 25,   // 6시간 15분치
                    "30m": 20,   // 10시간치
                    "1h": 12,    // 12시간치
                    "1d": 30,    // 1개월치 (90 -> 30)
                    "1wk": 20,   // 20주치 (52 -> 20)
                    "1mo": 12,   // 1년치 (24 -> 12)
                    "1y": 5,     // 5년치 (10 -> 5)
                  };
                  return mobileCountMap[interval] || 30;
                } else if (isTablet) {
                  // 태블릿: 중간
                  const tabletCountMap: Record<string, number> = {
                    "1m": 90,    // 1시간 30분치
                    "5m": 60,    // 5시간치
                    "15m": 40,   // 10시간치
                    "30m": 30,   // 15시간치
                    "1h": 18,    // 18시간치
                    "1d": 60,    // 2개월치
                    "1wk": 36,   // 36주치
                    "1mo": 18,   // 1년 반치
                    "1y": 7,     // 7년치
                  };
                  return tabletCountMap[interval] || 60;
                } else {
                  // 데스크탑: 기존 설정
                  const desktopCountMap: Record<string, number> = {
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
                  return desktopCountMap[interval] || 90;
                }
              };

              const visibleCount = getVisibleCount(chartInterval);

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

          logger.debug(
            `[Chart] Successfully loaded ${processedData.length} data points`
          );
        } catch (error) {
          console.error("[Chart] Failed to set data:", error);
        }
      } else {
        logger.warn("[Chart] No data returned from API");
      }
    } catch (error) {
      console.error("[Chart] Failed to load historical data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [seriesRef, chartRef, symbol, timeRange, interval, chartType, chartMode, enhancedChartType, updateStockInfo]);

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
