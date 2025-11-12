'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi
} from 'lightweight-charts';
import { useStockStore } from '@/store/stock-store';
import { useChartData } from '@/hooks/use-chart-data';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

interface DashboardChartProps {
  symbol: string;
}

export function DashboardChart({ symbol }: DashboardChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  const { selectedStock, watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();

  const isInWatchlist = watchlist.includes(symbol);

  // Helper function - memoized
  const getPeriodFromRange = useCallback((range: TimeRange): string => {
    switch (range) {
      case '1D': return '1mo';  // 1개월 데이터로 더 많은 포인트 제공
      case '1W': return '1mo';
      case '1M': return '1mo';
      case '3M': return '3mo';
      case '6M': return '6mo';
      case '1Y': return '1y';
      case '5Y': return '5y';
      case 'ALL': return 'max';
      default: return '1mo';
    }
  }, []);

  // React Query로 차트 데이터 가져오기 (자동 캐싱)
  const period = useMemo(() => getPeriodFromRange(timeRange), [timeRange, getPeriodFromRange]);
  const chartInterval = '1d';  // 백엔드가 일별 데이터만 지원

  const { data: chartResponse, isLoading: isLoadingChart } = useChartData({
    symbol,
    period,
    interval: chartInterval,
  });

  const chartData = useMemo(() => chartResponse?.chart_data || null, [chartResponse]);

  // Initialize chart
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

    // Remove TradingView watermark from DOM
    setTimeout(() => {
      if (chartContainerRef.current) {
        const links = chartContainerRef.current.querySelectorAll('a[href*="tradingview"]');
        links.forEach(link => {
          link.remove();
        });
      }
    }, 100);

    // Add candlestick series (v5 API)
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


  // Update chart data with error handling
  useEffect(() => {
    if (!seriesRef.current || !chartData || chartData.length === 0) {
      console.log('No dashboard chart data available');
      return;
    }

    try {
      // Convert date strings to Unix timestamps and validate
      const processedData = chartData.map(item => {
        const timestamp = typeof item.date === 'string'
          ? Math.floor(new Date(item.date).getTime() / 1000)
          : item.date;

        // Validate timestamp
        if (isNaN(timestamp) || timestamp <= 0) {
          console.warn('Invalid timestamp for item:', item);
          return null;
        }

        return {
          ...item,
          date: timestamp
        };
      }).filter(item => item !== null);

      if (processedData.length === 0) {
        console.warn('No valid data after processing');
        return;
      }

      // Sort data by time in ascending order
      const sortedData = processedData.sort((a, b) => (a?.date || 0) - (b?.date || 0));

      const candleData = sortedData.map(item => ({
        time: item!.date as import("lightweight-charts").Time,
        open: item!.open,
        high: item!.high,
        low: item!.low,
        close: item!.close,
      }));

      console.log(`Updating dashboard chart with ${candleData.length} data points`);

      seriesRef.current.setData(candleData);
      chartRef.current?.timeScale().fitContent();
    } catch (error) {
      console.error('차트 데이터 업데이트 실패:', error);
      console.error('Chart data:', chartData);
    }
  }, [chartData]);

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {selectedStock?.company_name || symbol}
            </CardTitle>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-lg font-semibold">
                ${selectedStock?.current_price.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                onClick={() => setTimeRange(range)}
                className="text-xs transition-all duration-200 hover:shadow-sm"
              >
                {range === '1D' ? '1일' : range === '1W' ? '1주' : range === '1M' ? '1개월' : range === '3M' ? '3개월' :
                 range === '6M' ? '6개월' : range === '1Y' ? '1년' : range === '5Y' ? '5년' : '전체'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="relative w-full" />
      </CardContent>
    </Card>
  );
}