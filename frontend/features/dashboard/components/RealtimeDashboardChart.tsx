'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star } from 'lucide-react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi
} from 'lightweight-charts';
import { useStockStore } from '@/store/stock-store';
import { getFMPWebSocketClient, type CandleData } from '@/lib/fmp-websocket-client';
import apiClient from '@/lib/api-client';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
type ChartInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
type ChartMode = "basic" | "enhanced";

interface RealtimeDashboardChartProps {
  symbol: string;
}

export function RealtimeDashboardChart({ symbol }: RealtimeDashboardChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [interval, setInterval] = useState<ChartInterval>('1m');
  const [chartMode, setChartMode] = useState<ChartMode>('enhanced');
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  const { selectedStock, watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();
  const wsClient = useRef(getFMPWebSocketClient());

  const isInWatchlist = watchlist.includes(symbol);

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
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#71717a',
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        grid: {
          vertLines: { color: '#e5e5e5' },
          horzLines: { color: '#e5e5e5' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: '#e5e5e5',
        },
        timeScale: {
          borderColor: '#e5e5e5',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // Remove TradingView watermark
      setTimeout(() => {
        if (chartContainerRef.current) {
          const links = chartContainerRef.current.querySelectorAll('a[href*="tradingview"]');
          links.forEach(link => link.remove());
        }
      }, 100);

      // Add candlestick series
      seriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error('차트 초기화 실패:', error);
    }
  }, []);

  // Historical 데이터 로드
  const loadHistoricalData = useCallback(async () => {
    if (!seriesRef.current) {
      console.warn('[Dashboard Chart] Series not ready for data loading');
      return;
    }

    setIsLoading(true);

    try {
      const period = getPeriodFromRange(timeRange);
      // 1D일 때는 interval을 사용, 아니면 1d 고정
      const chartInterval = timeRange === '1D' ? interval : '1d';

      console.log(`[Dashboard] Loading: ${symbol}, period: ${period}, interval: ${chartInterval}`);

      const data = await apiClient.getChartData(symbol, period, chartInterval);

      if (data.chart_data && data.chart_data.length > 0) {
        const processedData = data.chart_data
          .map((item) => {
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
            };
          })
          .filter((item) => item !== null)
          .sort((a, b) => (a!.time as number) - (b!.time as number));

        if (processedData.length > 0) {
          try {
            seriesRef.current?.setData(processedData as any);
            chartRef.current?.timeScale().fitContent();
            console.log(`[Dashboard] Loaded ${processedData.length} data points`);
          } catch (error) {
            console.error('[Dashboard Chart] Failed to set data:', error);
          }
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeRange, interval]);

  // Historical 데이터 로드
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  // 실시간 WebSocket 연결 (1D일 때만)
  useEffect(() => {
    if (timeRange !== '1D' || !seriesRef.current) {
      setIsRealtime(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    const setupRealtimeData = async () => {
      try {
        const client = wsClient.current;
        const status = client.getConnectionStatus();

        if (!status.isConnected) {
          console.log('[Dashboard WebSocket] Connecting...');
          await client.connect();
        }

        if (!mounted) return;

        // 실시간 캔들 콜백
        const handleCandle = (candle: CandleData) => {
          if (!seriesRef.current || !mounted) return;

          try {
            seriesRef.current.update({
              time: candle.time as import("lightweight-charts").Time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            });

            chartRef.current?.timeScale().scrollToRealtime();
          } catch (error) {
            console.error('[Dashboard WebSocket] Update error:', error);
          }
        };

        // 구독 시작
        const intervalMs = getIntervalMs(interval);
        await client.subscribe(symbol, intervalMs);
        client.onCandle(symbol, handleCandle);

        setIsRealtime(true);
        setIsLoading(false);
        console.log(`[Dashboard Hybrid Mode] REST API + WebSocket realtime for ${symbol} with ${interval} (${intervalMs}ms)`);

        return () => {
          mounted = false;
          client.offCandle(symbol, handleCandle);
          client.unsubscribe(symbol);
          setIsRealtime(false);
        };
      } catch (error) {
        console.error('[Dashboard WebSocket] Setup failed:', error);
        setIsRealtime(false);
        setIsLoading(false);
      }
    };

    setupRealtimeData();

    return () => {
      mounted = false;
      setIsLoading(false);
    };
  }, [symbol, timeRange, interval]);

  // Helper functions
  const getPeriodFromRange = (range: TimeRange): string => {
    switch (range) {
      case '1D': return '1d';
      case '1W': return '5d';
      case '1M': return '1mo';
      case '3M': return '3mo';
      case '6M': return '6mo';
      case '1Y': return '1y';
      case '5Y': return '5y';
      case 'ALL': return 'max';
      default: return '1mo';
    }
  };

  const getIntervalMs = (interval: ChartInterval): number => {
    switch (interval) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '30m': return 30 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    if (range !== '1D') {
      setInterval('1d');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-bold">
                {selectedStock?.company_name || symbol}
              </CardTitle>
              {isRealtime && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-lg font-semibold">
                ${selectedStock?.current_price.toFixed(2) || '0.00'}
              </span>
              {isLoading && (
                <span className="text-xs text-muted-foreground">로딩 중...</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Chart Mode Selector */}
            <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as ChartMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="enhanced" className="text-xs">
                  Enhanced
                </TabsTrigger>
                <TabsTrigger value="basic" className="text-xs">
                  Basic
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWatchlist}
              className="flex items-center gap-2"
            >
              <Star
                className={`h-4 w-4 ${
                  isInWatchlist ? 'fill-yellow-400 text-yellow-400' : ''
                }`}
              />
              관심 종목 {isInWatchlist ? '제거' : '추가'}
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange(range)}
                className="text-xs transition-all duration-200 hover:shadow-sm"
              >
                {range === '1D' ? '1일' : range === '1W' ? '1주' : range === '1M' ? '1개월' : range === '3M' ? '3개월' :
                 range === '6M' ? '6개월' : range === '1Y' ? '1년' : range === '5Y' ? '5년' : '전체'}
              </Button>
            ))}
          </div>

          {/* Interval selector for 1D */}
          {timeRange === '1D' && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-muted-foreground self-center">간격:</span>
              {(['1m', '5m', '15m', '30m', '1h'] as ChartInterval[]).map((int) => (
                <Button
                  key={int}
                  variant={interval === int ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInterval(int)}
                  className="text-xs"
                >
                  {int}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="relative w-full" />
      </CardContent>
    </Card>
  );
}
