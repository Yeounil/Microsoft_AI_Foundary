import { useEffect, useRef, RefObject } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";

/**
 * 차트 초기화 Hook
 * lightweight-charts 인스턴스를 생성하고 관리합니다.
 * 모바일 최적화 옵션 포함
 */
export function useChartInitialization(
  chartContainerRef: RefObject<HTMLDivElement | null>
) {
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 모바일 감지
    const isMobile = window.innerWidth < 768;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chartRef.current?.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        // 리사이즈 후 차트 fit
        chartRef.current?.timeScale().fitContent();
      }
    };

    try {
      // 컨테이너의 실제 크기를 사용
      const containerWidth = chartContainerRef.current.clientWidth;
      const containerHeight = chartContainerRef.current.clientHeight || 350;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
          fontFamily: "'Inter', 'Noto Sans KR', sans-serif",
          fontSize: isMobile ? 10 : 12,
        },
        width: containerWidth,
        height: containerHeight,
        grid: {
          vertLines: { color: "#e5e5e5" },
          horzLines: { color: "#e5e5e5" },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            width: 1,
            color: '#9ca3af',
            labelBackgroundColor: '#374151',
          },
          horzLine: {
            width: 1,
            color: '#9ca3af',
            labelBackgroundColor: '#374151',
          },
        },
        rightPriceScale: {
          borderColor: "#e5e5e5",
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: "#e5e5e5",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: isMobile ? 5 : 10,
          barSpacing: isMobile ? 4 : 6,
          minBarSpacing: isMobile ? 2 : 3,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        // 모바일 터치 최적화
        handleScroll: {
          mouseWheel: !isMobile,
          pressedMouseMove: true,
          horzTouchDrag: isTouch,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: !isMobile,
          pinch: isTouch,
          axisPressedMouseMove: {
            time: true,
            price: true,
          },
        },
        kineticScroll: {
          touch: isTouch,
          mouse: false,
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
