import { useCallback, useEffect, useRef, RefObject } from "react";
import {
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { ChartType } from "../services/chartService";
import { logger } from "@/lib/logger";

type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

/**
 * 차트 시리즈 생성 및 관리 Hook
 * 차트 타입에 따라 적절한 시리즈를 생성합니다.
 */
export function useChartSeries(
  chartRef: RefObject<IChartApi | null>,
  chartType: ChartType
) {
  const seriesRef = useRef<SeriesType | null>(null);

  // 차트 시리즈 생성/재생성
  const createSeries = useCallback(() => {
    if (!chartRef.current) return;

    // 기존 시리즈 제거
    if (seriesRef.current) {
      try {
        // 시리즈가 차트에 실제로 존재하는지 확인
        if (chartRef.current && seriesRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
        }
      } catch {
        // 이미 제거된 경우 무시
        logger.warn("[Chart] Series already removed or invalid");
      } finally {
        seriesRef.current = null;
      }
    }

    // 새 시리즈 추가
    try {
      if (chartType === "candle") {
        seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
      } else if (chartType === "line") {
        seriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: "#2962ff",
          lineWidth: 2,
        });
      } else {
        seriesRef.current = chartRef.current.addSeries(AreaSeries, {
          lineColor: "#2962ff",
          topColor: "rgba(41, 98, 255, 0.28)",
          bottomColor: "rgba(41, 98, 255, 0.05)",
          lineWidth: 2,
        });
      }
    } catch (error) {
      console.error("[Chart] Failed to create series:", error);
    }
  }, [chartRef, chartType]);

  // 차트 타입 변경 시 시리즈 재생성
  useEffect(() => {
    createSeries();
  }, [createSeries]);

  return seriesRef;
}
