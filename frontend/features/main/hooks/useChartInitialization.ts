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
        autoSize: true, // 자동 크기 조정 활성화
        grid: {
          // 모바일에서 세로 그리드 숨김으로 차트 가시성 향상
          vertLines: {
            color: "#e5e5e5",
            visible: !isMobile,
          },
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
        // 모바일에서 왼쪽 프라이스 스케일 숨김
        leftPriceScale: {
          visible: false,
          borderVisible: false,
        },
        rightPriceScale: {
          borderColor: "#e5e5e5",
          borderVisible: !isMobile,
          scaleMargins: {
            top: isMobile ? 0.05 : 0.1,
            bottom: isMobile ? 0.1 : 0.1,
          },
        },
        timeScale: {
          borderColor: "#e5e5e5",
          borderVisible: !isMobile,
          timeVisible: !isMobile, // 모바일에서 시간 표시 간소화
          secondsVisible: false,
          rightOffset: isMobile ? 3 : 10,
          barSpacing: isMobile ? 3 : 6, // 모바일에서 바 간격 축소
          minBarSpacing: isMobile ? 1 : 3,
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

      // ResizeObserver로 컨테이너 크기 변화 감지 (더 정확한 반응형 처리)
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              chart.applyOptions({ width, height });
              chart.timeScale().fitContent();
            }
          }
        });
        resizeObserver.observe(chartContainerRef.current);
      }

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        resizeObserver?.disconnect();
        chart.remove();
      };
    } catch (error) {
      console.error("차트 초기화 실패:", error);
    }
  }, [chartContainerRef]);

  return chartRef;
}
