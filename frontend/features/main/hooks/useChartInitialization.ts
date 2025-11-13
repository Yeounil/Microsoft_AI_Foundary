import { useEffect, useRef, RefObject } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";

/**
 * 차트 초기화 Hook
 * lightweight-charts 인스턴스를 생성하고 관리합니다.
 */
export function useChartInitialization(
  chartContainerRef: RefObject<HTMLDivElement | null>
) {
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 0,
      });
    };

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
        },
        width: chartContainerRef.current.clientWidth,
        height: 450,
        grid: {
          vertLines: { color: "#e5e5e5" },
          horzLines: { color: "#e5e5e5" },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: "#e5e5e5",
        },
        timeScale: {
          borderColor: "#e5e5e5",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Remove TradingView watermark
      setTimeout(() => {
        if (chartContainerRef.current) {
          const links = chartContainerRef.current.querySelectorAll(
            'a[href*="tradingview"]'
          );
          links.forEach((link) => link.remove());
        }
      }, 100);

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error("차트 초기화 실패:", error);
    }
  }, [chartContainerRef]);

  return chartRef;
}
