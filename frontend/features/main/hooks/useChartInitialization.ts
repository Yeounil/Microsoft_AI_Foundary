import { useEffect, useRef, useState, RefObject } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import { useTheme } from "next-themes";

/**
 * 차트 초기화 Hook
 * lightweight-charts 인스턴스를 생성하고 관리합니다.
 * 모바일 최적화 옵션 포함
 */
export function useChartInitialization(
  chartContainerRef: RefObject<HTMLDivElement | null>
) {
  const chartRef = useRef<IChartApi | null>(null);
  const visibleRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // 마운트 후에만 테마 적용
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === "dark";

  // 테마 변경 시 차트 색상만 업데이트 (차트 재생성 방지)
  useEffect(() => {
    if (!mounted || !chartRef.current) return;

    const isMobile = window.innerWidth < 768;
    const gridColor = isDarkMode ? "#374151" : "#e5e5e5";
    const textColor = isDarkMode ? "#9ca3af" : "#71717a";

    chartRef.current.applyOptions({
      layout: {
        textColor,
      },
      grid: {
        vertLines: { color: gridColor, visible: !isMobile },
        horzLines: { color: gridColor },
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
      timeScale: {
        borderColor: gridColor,
      },
    });
  }, [mounted, isDarkMode]);

  // 차트 초기 생성 (한 번만 실행)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 이미 차트가 있으면 생성하지 않음
    if (chartRef.current) return;

    // 모바일 감지
    const isMobile = window.innerWidth < 768;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        let currentRange: { from: number; to: number } | null = null;
        try {
          const timeScale = chartRef.current.timeScale();
          const logicalRange = timeScale.getVisibleLogicalRange();
          if (logicalRange) {
            currentRange = { from: logicalRange.from, to: logicalRange.to };
          }
        } catch (e) {
          console.error(e);
        }

        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });

        if (currentRange) {
          try {
            chartRef.current.timeScale().setVisibleLogicalRange(currentRange);
          } catch (e) {
            chartRef.current.timeScale().fitContent();
            console.error(e);
          }
        } else {
          chartRef.current.timeScale().fitContent();
        }
      }
    };

    try {
      const containerWidth = chartContainerRef.current.clientWidth;
      const containerHeight = chartContainerRef.current.clientHeight || 350;

      // 초기 색상은 라이트 모드 기본값 사용 (테마 useEffect에서 업데이트됨)
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
          fontFamily: "'Inter', 'Noto Sans KR', sans-serif",
          fontSize: isMobile ? 11 : 12,
        },
        width: containerWidth,
        height: containerHeight,
        autoSize: true,
        grid: {
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
            color: "#9ca3af",
            labelBackgroundColor: "#374151",
          },
          horzLine: {
            width: 1,
            color: "#9ca3af",
            labelBackgroundColor: "#374151",
          },
        },
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
          timeVisible: true,
          secondsVisible: false,
          rightOffset: isMobile ? 3 : 10,
          barSpacing: isMobile ? 5 : 6,
          minBarSpacing: isMobile ? 2 : 3,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
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

      // ResizeObserver로 컨테이너 크기 변화 감지
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              let currentRange: { from: number; to: number } | null = null;
              try {
                const timeScale = chart.timeScale();
                const logicalRange = timeScale.getVisibleLogicalRange();
                if (logicalRange) {
                  currentRange = {
                    from: logicalRange.from,
                    to: logicalRange.to,
                  };
                  visibleRangeRef.current = currentRange;
                }
              } catch (e) {
                console.error(e);
              }

              chart.applyOptions({ width, height });

              if (currentRange || visibleRangeRef.current) {
                try {
                  const rangeToApply = currentRange || visibleRangeRef.current;
                  if (rangeToApply) {
                    chart.timeScale().setVisibleLogicalRange(rangeToApply);
                  }
                } catch (e) {
                  chart.timeScale().fitContent();
                  console.error(e);
                }
              } else {
                chart.timeScale().fitContent();
              }
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
        chartRef.current = null;
      };
    } catch (error) {
      console.error("차트 초기화 실패:", error);
    }
  }, [chartContainerRef]);

  return chartRef;
}
