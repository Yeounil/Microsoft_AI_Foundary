"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  getFMPWebSocketClient,
  type CandleData,
} from "@/lib/fmp-websocket-client";
import apiClient from "@/lib/api-client";

type ChartType = "area" | "line" | "candle";
type TimeRange = "1D" | "1M" | "3M" | "1Y" | "5Y" | "ALL";
type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

interface RealtimeStockChartProps {
  symbol?: string;
}

type SeriesType =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

interface ChartDataItem {
  date: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ProcessedChartData {
  time: import("lightweight-charts").Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

export function RealtimeStockChart({
  symbol = "AAPL",
}: RealtimeStockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesType | null>(null);

  const [chartType, setChartType] = useState<ChartType>("candle");
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [interval, setInterval] = useState<ChartInterval>("1m");
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  const wsClient = useRef(getFMPWebSocketClient());

  // 차트 초기화
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
  }, []);

  // 차트 시리즈 생성/재생성
  const createSeries = useCallback(() => {
    if (!chartRef.current) return;

    // 기존 시리즈 제거
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
        seriesRef.current = null;
      } catch (error) {
        console.warn("[Chart] Failed to remove series:", error);
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
  }, [chartType]);

  // 차트 타입 변경 시 시리즈 재생성
  useEffect(() => {
    createSeries();
  }, [createSeries]);

  // Historical 데이터 로드
  const loadHistoricalData = useCallback(async () => {
    if (!seriesRef.current) {
      console.warn("[Chart] Series not ready for data loading");
      return;
    }

    setIsLoading(true);

    try {
      const period = getPeriodFromRange(timeRange);
      // 1D일 때는 interval을 사용, 아니면 1d 고정
      const chartInterval = timeRange === "1D" ? interval : "1d";

      console.log(
        `Loading historical data: ${symbol}, period: ${period}, interval: ${chartInterval}`
      );

      const data = await apiClient.getChartData(symbol, period, chartInterval);

      if (data.chart_data && data.chart_data.length > 0) {
        // 데이터 변환
        const processedData = data.chart_data
          .map((item: ChartDataItem): ProcessedChartData | null => {
            const timestamp =
              typeof item.date === "string"
                ? Math.floor(new Date(item.date).getTime() / 1000)
                : item.date;

            if (isNaN(timestamp) || timestamp <= 0) {
              return null;
            }

            return {
              time: timestamp as import("lightweight-charts").Time,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              value: item.close, // for line/area
            };
          })
          .filter((item: ProcessedChartData | null): item is ProcessedChartData => item !== null)
          .sort(
            (a: ProcessedChartData, b: ProcessedChartData) =>
              (a.time as number) - (b.time as number)
          );

        if (processedData.length > 0) {
          try {
            if (chartType === "candle") {
              const candleData = processedData.map(
                (item: ProcessedChartData) => ({
                  time: item.time,
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                })
              );
              seriesRef.current?.setData(candleData);
            } else {
              const lineData = processedData.map(
                (item: ProcessedChartData) => ({
                  time: item.time,
                  value: item.value,
                })
              );
              seriesRef.current?.setData(lineData);
            }

            chartRef.current?.timeScale().fitContent();
            console.log(
              `Loaded ${processedData.length} historical data points`
            );
          } catch (error) {
            console.error("[Chart] Failed to set data:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load historical data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeRange, interval, chartType]);

  // Historical 데이터 로드
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  // 실시간 WebSocket 연결 (1D일 때만)
  useEffect(() => {
    if (timeRange !== "1D" || !seriesRef.current) {
      setIsRealtime(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    const setupRealtimeData = async () => {
      try {
        // WebSocket 연결
        const client = wsClient.current;
        const status = client.getConnectionStatus();

        if (!status.isConnected) {
          console.log("[WebSocket] Connecting...");
          await client.connect();
        }

        if (!mounted) return;

        // 실시간 캔들 콜백
        const handleCandle = (candle: CandleData) => {
          if (!seriesRef.current || !mounted) {
            console.warn(`[Chart] ⚠️ Cannot update: series=${!!seriesRef.current}, mounted=${mounted}`);
            return;
          }

          console.log(`[Chart] 📈 Received candle data:`, {
            time: new Date(candle.time * 1000).toLocaleTimeString(),
            type: chartType,
            data: chartType === "candle"
              ? `O:$${candle.open.toFixed(2)} H:$${candle.high.toFixed(2)} L:$${candle.low.toFixed(2)} C:$${candle.close.toFixed(2)}`
              : `$${candle.close.toFixed(2)}`
          });

          try {
            if (chartType === "candle") {
              seriesRef.current.update({
                time: candle.time as import("lightweight-charts").Time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
              });
              console.log(`[Chart] ✅ Candle chart updated successfully`);
            } else {
              seriesRef.current.update({
                time: candle.time as import("lightweight-charts").Time,
                value: candle.close,
              });
              console.log(`[Chart] ✅ Line/Area chart updated successfully`);
            }

            // 실시간 위치로 스크롤
            chartRef.current?.timeScale().scrollToRealTime();
          } catch (error) {
            console.error("[Chart] ❌ Update error:", error);
          }
        };

        // 구독 시작
        const intervalMs = getIntervalMs(interval);
        console.log(`[Chart] 🔌 Starting WebSocket subscription for ${symbol} with ${interval} interval (${intervalMs}ms)`);

        await client.subscribe(symbol, intervalMs);
        console.log(`[Chart] 📡 Subscribed successfully, registering candle callback...`);

        client.onCandle(symbol, handleCandle);
        console.log(`[Chart] ✅ Candle callback registered, waiting for data...`);

        setIsRealtime(true);
        setIsLoading(false);
        console.log(`[Chart] 🎉 Realtime mode ACTIVE for ${symbol}`);

        // Cleanup
        return () => {
          mounted = false;
          client.offCandle(symbol, handleCandle);
          client.unsubscribe(symbol);
          setIsRealtime(false);
          console.log(`[WebSocket] Stopped for ${symbol}`);
        };
      } catch (error) {
        console.error("[WebSocket] Setup failed:", error);
        setIsRealtime(false);
        setIsLoading(false);
      }
    };

    setupRealtimeData();

    return () => {
      mounted = false;
      setIsLoading(false);
    };
  }, [symbol, timeRange, interval, chartType]);

  // Helper functions
  const getPeriodFromRange = (range: TimeRange): string => {
    switch (range) {
      case "1D":
        return "1d";
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
  };

  const getIntervalMs = (interval: ChartInterval): number => {
    switch (interval) {
      case "1m":
        return 60 * 1000;
      case "5m":
        return 5 * 60 * 1000;
      case "15m":
        return 15 * 60 * 1000;
      case "30m":
        return 30 * 60 * 1000;
      case "1h":
        return 60 * 60 * 1000;
      case "1d":
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  };

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    // 1D가 아니면 interval을 1d로 리셋
    if (range !== "1D") {
      setInterval("1d");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle>실시간 차트 - {symbol}</CardTitle>
            {isRealtime && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
            {isLoading && (
              <span className="text-xs text-muted-foreground">로딩 중...</span>
            )}
          </div>

          {/* Chart Type Selector */}
          <Tabs
            value={chartType}
            onValueChange={(v) => setChartType(v as ChartType)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="candle" className="text-xs">
                캔들
              </TabsTrigger>
              <TabsTrigger value="line" className="text-xs">
                라인
              </TabsTrigger>
              <TabsTrigger value="area" className="text-xs">
                영역
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2 pt-4">
          {(["1D", "1M", "3M", "1Y", "5Y", "ALL"] as TimeRange[]).map(
            (range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeChange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            )
          )}
        </div>

        {/* Interval Selector (only for 1D) */}
        {timeRange === "1D" && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-sm text-muted-foreground self-center">
              간격:
            </span>
            {(["1m", "5m", "15m", "30m", "1h"] as ChartInterval[]).map(
              (int) => (
                <Button
                  key={int}
                  variant={interval === int ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInterval(int)}
                  className="text-xs"
                >
                  {int}
                </Button>
              )
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="relative w-full" />
      </CardContent>
    </Card>
  );
}
