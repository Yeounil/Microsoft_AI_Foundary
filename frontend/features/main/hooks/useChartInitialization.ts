import { useEffect, useRef, RefObject } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import { ChartInterval, TimeRange } from "../services/chartService";
import { ChartMode } from "@/features/dashboard/services/dashboardChartService";

/**
 * 차트 초기화 Hook
 * lightweight-charts 인스턴스를 생성하고 관리합니다.
 * 모바일 최적화 옵션 포함
 */
export function useChartInitialization(
  chartContainerRef: RefObject<HTMLDivElement | null>,
  chartMode?: ChartMode,
  timeRange?: TimeRange,
  interval?: ChartInterval
) {
  const chartRef = useRef<IChartApi | null>(null);
  const visibleRangeRef = useRef<{ from: number; to: number } | null>(null);

  // 최신 값을 참조하기 위한 ref (차트 재생성 방지)
  const chartModeRef = useRef(chartMode);
  const timeRangeRef = useRef(timeRange);
  const intervalRef = useRef(interval);

  // ref 업데이트
  useEffect(() => {
    chartModeRef.current = chartMode;
    timeRangeRef.current = timeRange;
    intervalRef.current = interval;
  }, [chartMode, timeRange, interval]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 모바일 감지
    const isMobile = window.innerWidth < 768;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        // 현재 visible range 저장
        let currentRange: { from: number; to: number } | null = null;
        try {
          const timeScale = chartRef.current.timeScale();
          const logicalRange = timeScale.getVisibleLogicalRange();
          if (logicalRange) {
            currentRange = { from: logicalRange.from, to: logicalRange.to };
          }
        } catch (e) {
          // 초기 로드 시 range가 없을 수 있음
          console.error(e);
        }

        // 차트 크기 업데이트
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });

        // visible range 복원 또는 fitContent
        if (currentRange) {
          try {
            chartRef.current.timeScale().setVisibleLogicalRange(currentRange);
          } catch (e) {
            chartRef.current.timeScale().fitContent();
            console.error(e);
          }
        } else {
          // 처음 로드 시에만 fitContent
          chartRef.current.timeScale().fitContent();
        }
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
          fontSize: isMobile ? 11 : 12,
        },
        localization: {
          // crosshair 툴팁의 시간 포맷
          timeFormatter: (time: number) => {
            const date = new Date(time * 1000);
            const currentChartMode = chartModeRef.current;
            const currentTimeRange = timeRangeRef.current;
            const currentInterval = intervalRef.current;

            const formatTime = () => {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              return `${hours.toString().padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}`;
            };

            const formatDate = () => {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              return `${month}/${day}`;
            };

            const formatDateTime = () => {
              return `${formatDate()} ${formatTime()}`;
            };

            // Basic 모드
            if (currentChartMode === "basic") {
              if (currentTimeRange === "1D") {
                return formatTime();
              } else if (currentTimeRange === "1W") {
                return formatDateTime();
              } else {
                return formatDate();
              }
            }

            // Enhanced 모드
            if (
              currentInterval &&
              ["1m", "5m", "15m", "30m", "1h", "1d"].includes(currentInterval)
            ) {
              return formatDateTime();
            } else {
              return formatDate();
            }
          },
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
            color: "#9ca3af",
            labelBackgroundColor: "#374151",
          },
          horzLine: {
            width: 1,
            color: "#9ca3af",
            labelBackgroundColor: "#374151",
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
          timeVisible: true, // 모바일에서도 시간 표시
          secondsVisible: false,
          rightOffset: isMobile ? 3 : 10,
          barSpacing: isMobile ? 5 : 6, // 모바일에서 바 간격 적절히 조정
          minBarSpacing: isMobile ? 2 : 3,
          fixLeftEdge: true,
          fixRightEdge: true,
          // 로컬 시간 기준으로 표시 (chartMode와 timeRange/interval에 따라 포맷 다름)
          tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);

            // 시간 포맷 함수
            const formatTime = () => {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              return `${hours.toString().padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}`;
            };

            // 날짜 포맷 함수
            const formatDate = () => {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              return `${month}/${day}`;
            };

            // 날짜 + 시간 포맷 함수
            const formatDateTime = () => {
              return `${formatDate()} ${formatTime()}`;
            };

            // ref에서 최신 값 가져오기
            const currentChartMode = chartModeRef.current;
            const currentTimeRange = timeRangeRef.current;
            const currentInterval = intervalRef.current;

            // Basic 모드
            if (currentChartMode === "basic") {
              if (currentTimeRange === "1D") {
                return formatTime(); // 시간만
              } else if (currentTimeRange === "1W") {
                return formatDateTime(); // 시간 및 날짜
              } else {
                return formatDate(); // 날짜만
              }
            }

            // Enhanced 모드 (또는 chartMode가 전달되지 않은 경우 기본 동작)
            if (
              currentInterval &&
              ["1m", "5m", "15m", "30m", "1h", "1d"].includes(currentInterval)
            ) {
              return formatDateTime(); // 시간 및 날짜
            } else {
              return formatDate(); // 날짜만
            }
          },
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
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              // 현재 visible range 저장
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
                // 초기 로드 시 range가 없을 수 있음
                console.error(e);
              }

              // 차트 크기 업데이트
              chart.applyOptions({ width, height });

              // visible range 복원
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
                // 처음 로드 시에만 fitContent
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
      };
    } catch (error) {
      console.error("차트 초기화 실패:", error);
    }
  }, [chartContainerRef]);

  return chartRef;
}
