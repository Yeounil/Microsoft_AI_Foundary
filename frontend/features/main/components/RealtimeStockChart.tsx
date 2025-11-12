"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
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
import { ChartDataLoader, type ChartPeriod as LoaderChartPeriod, type ChartInterval as LoaderChartInterval } from "@/lib/chart/chart-data-loader";
import apiClient from "@/lib/api-client";

type ChartType = "area" | "line" | "candle";
type TimeRange = "1D" | "1M" | "3M" | "1Y" | "5Y" | "ALL";
type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

interface RealtimeStockChartProps {
  symbol: string;
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
  symbol,
}: RealtimeStockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesType | null>(null);

  const [chartType, setChartType] = useState<ChartType>("candle");
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [interval, setInterval] = useState<ChartInterval>("1m");
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  // 실시간 가격 정보
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [previousClose, setPreviousClose] = useState<number | null>(null);

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
        `[Chart] Loading historical data: ${symbol}, period: ${period}, interval: ${chartInterval}`
      );

      // ChartDataLoader 사용 (자동으로 Intraday API 라우팅)
      const candleData = await ChartDataLoader.loadHistoricalData(
        symbol,
        period as LoaderChartPeriod,
        chartInterval as LoaderChartInterval
      );

      console.log(`[Chart] Received ${candleData.length} candles from API`);

      if (candleData.length > 0) {
        // 초기 가격 정보 설정 (마지막 캔들 기준)
        const lastCandle = candleData[candleData.length - 1];
        const firstCandle = candleData[0];

        setCurrentPrice(lastCandle.close);
        setPreviousClose(firstCandle.close);

        const change = lastCandle.close - firstCandle.close;
        const changePercent = (change / firstCandle.close) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);

        try {
          if (chartType === "candle") {
            seriesRef.current?.setData(candleData);
          } else {
            // Line/Area 차트는 close 값만 사용
            const lineData = candleData.map((item) => ({
              time: item.time as import("lightweight-charts").Time,
              value: item.close,
            }));
            seriesRef.current?.setData(lineData);
          }

          // 분단위 차트(1D)는 최근 데이터만 보이도록 확대, 나머지는 전체 보기
          if (timeRange === "1D" && candleData.length > 0) {
            // 인터벌에 따라 표시할 데이터 포인트 수 조정 (인터벌이 클수록 더 확대)
            const visibleCountMap: Record<ChartInterval, number> = {
              "1m": 120,   // 2시간
              "5m": 80,    // 6시간 40분
              "15m": 50,   // 12시간 30분
              "30m": 40,   // 20시간
              "1h": 24,    // 24시간
              "1d": 30,
            };
            const visibleCount = Math.min(visibleCountMap[interval] || 100, candleData.length);
            chartRef.current?.timeScale().setVisibleLogicalRange({
              from: Math.max(0, candleData.length - visibleCount),
              to: candleData.length - 1,
            });
          } else {
            chartRef.current?.timeScale().fitContent();
          }

          console.log(
            `[Chart] Successfully loaded ${candleData.length} data points`
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

          // 실시간 가격 정보 업데이트
          setCurrentPrice(candle.close);
          if (previousClose !== null) {
            const change = candle.close - previousClose;
            const changePercent = (change / previousClose) * 100;
            setPriceChange(change);
            setPriceChangePercent(changePercent);
          } else {
            // 이전 종가가 없으면 첫 캔들의 open을 기준으로
            const change = candle.close - candle.open;
            const changePercent = (change / candle.open) * 100;
            setPriceChange(change);
            setPriceChangePercent(changePercent);
          }

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
    // 1D 선택 시 자동으로 1m으로 설정 (Intraday API 사용)
    if (range === "1D") {
      setInterval("1m");
    } else {
      // 1D가 아니면 interval을 1d로 리셋
      setInterval("1d");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
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

            {/* 실시간 가격 정보 */}
            {currentPrice !== null ? (
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">${currentPrice.toFixed(2)}</span>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {priceChange >= 0 ? '+' : ''}
                  {priceChange.toFixed(2)} ({priceChange >= 0 ? '+' : ''}
                  {priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">가격 로딩 중...</div>
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
                {range === '1D' ? '1일' : range === '1M' ? '1개월' : range === '3M' ? '3개월' : range === '1Y' ? '1년' : range === '5Y' ? '5년' : '전체'}
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
                  {int === '1m' ? '1분' : int === '5m' ? '5분' : int === '15m' ? '15분' : int === '30m' ? '30분' : '1시간'}
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
