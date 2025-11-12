"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { useChartData } from "@/hooks/use-chart-data";

type ChartType = "area" | "line" | "candle";
type TimeRange = "1D" | "1M" | "3M" | "1Y" | "5Y" | "ALL";

interface StockChartProps {
  symbol?: string;
}

// Type for series API that supports all three types
type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

export function StockChart({ symbol = "AAPL" }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesType | null>(null);

  const [chartType, setChartType] = useState<ChartType>("area");
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");

  // Helper functions - memoized
  const getPeriodFromRange = useCallback((range: TimeRange): string => {
    switch (range) {
      case "1D":
        return "1mo"; // 1개월 데이터로 더 많은 포인트 제공
      case "1M":
        return "1mo";
      case "3M":
        return "3mo";
      case "1Y":
        return "1y";
      case "5Y":
        return "5y";
      case "ALL":
        return "max";
      default:
        return "1mo";
    }
  }, []);

  const getIntervalFromRange = useCallback((): string => {
    // 백엔드가 일별 데이터만 지원하므로 모두 1d로 통일
    return "1d";
  }, []);

  // React Query로 차트 데이터 가져오기 (자동 캐싱)
  const period = useMemo(() => getPeriodFromRange(timeRange), [timeRange, getPeriodFromRange]);
  const interval = useMemo(() => getIntervalFromRange(), [getIntervalFromRange]);

  const { data: chartResponse, isLoading: isLoadingChart } = useChartData({
    symbol,
    period,
    interval,
  });

  const chartData = useMemo(() => chartResponse?.chart_data || null, [chartResponse]);

  // Initialize chart - memoized
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 0,
      });
    };

    try {
      // Create chart (v5 API)
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
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

      // Remove TradingView watermark from DOM
      setTimeout(() => {
        if (chartContainerRef.current) {
          const links = chartContainerRef.current.querySelectorAll(
            'a[href*="tradingview"]'
          );
          links.forEach((link) => {
            link.remove();
          });
        }
      }, 100);

      // Add series based on chart type (v5 API)
      if (chartType === "candle") {
        seriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
      } else if (chartType === "line") {
        seriesRef.current = chart.addSeries(LineSeries, {
          color: "#2962ff",
          lineWidth: 2,
        });
      } else {
        seriesRef.current = chart.addSeries(AreaSeries, {
          lineColor: "#2962ff",
          topColor: "rgba(41, 98, 255, 0.28)",
          bottomColor: "rgba(41, 98, 255, 0.05)",
          lineWidth: 2,
        });
      }

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error("차트 초기화 실패:", error);
    }
  }, [chartType]);

  // Update chart data with error handling
  useEffect(() => {
    if (!seriesRef.current || !chartData || chartData.length === 0) {
      console.log("No chart data available");
      return;
    }

    try {
      // Convert date strings to Unix timestamps and sort
      const processedData = chartData
        .map((item) => {
          const timestamp =
            typeof item.date === "string"
              ? Math.floor(new Date(item.date).getTime() / 1000)
              : item.date;

          // Validate timestamp
          if (isNaN(timestamp) || timestamp <= 0) {
            console.warn("Invalid timestamp for item:", item);
            return null;
          }

          return {
            ...item,
            date: timestamp,
          };
        })
        .filter((item) => item !== null);

      if (processedData.length === 0) {
        console.warn("No valid data after processing");
        return;
      }

      // Sort data by time in ascending order
      const sortedData = processedData.sort(
        (a, b) => (a?.date || 0) - (b?.date || 0)
      );

      console.log(`Updating chart with ${sortedData.length} data points`);

      if (chartType === "candle") {
        const candleData = sortedData.map((item) => ({
          time: item!.date as import("lightweight-charts").Time,
          open: item!.open,
          high: item!.high,
          low: item!.low,
          close: item!.close,
        }));
        seriesRef.current.setData(candleData);
      } else {
        const lineData = sortedData.map((item) => ({
          time: item!.date as import("lightweight-charts").Time,
          value: item!.close,
        }));
        seriesRef.current.setData(lineData);
      }

      chartRef.current?.timeScale().fitContent();
    } catch (error) {
      console.error("차트 데이터 업데이트 실패:", error);
      console.error("Chart data:", chartData);
    }
  }, [chartData, chartType]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>실시간 차트 - {symbol}</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type */}
            <Tabs
              value={chartType}
              onValueChange={(v) => setChartType(v as ChartType)}
            >
              <TabsList className="h-9">
                <TabsTrigger value="area" className="text-xs">
                  영역
                </TabsTrigger>
                <TabsTrigger value="line" className="text-xs">
                  라인
                </TabsTrigger>
                <TabsTrigger value="candle" className="text-xs">
                  캔들
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2 pt-4">
          {(["1D", "1M", "3M", "1Y", "5Y", "ALL"] as TimeRange[]).map(
            (range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="relative w-full">
          {isLoadingChart && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-sm text-muted-foreground">
                차트 데이터 로딩 중...
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
