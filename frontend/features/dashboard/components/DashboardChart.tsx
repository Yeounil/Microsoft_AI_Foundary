'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useStockStore } from '@/store/stock-store';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
type ChartInterval = '1m' | '3m' | '15m' | '30m' | '1h' | '1d';

interface DashboardChartProps {
  symbol: string;
}

export function DashboardChart({ symbol }: DashboardChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [interval, setInterval] = useState<ChartInterval>('1m');

  const { selectedStock, chartData, loadChartData, watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();

  const isInWatchlist = watchlist.includes(symbol);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 0,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: '#e5e5e5', style: 1 },
        horzLines: { color: '#e5e5e5', style: 1 },
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

    seriesRef.current = chart.addCandlestickSeries({
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
  }, []);

  // Load chart data
  useEffect(() => {
    const period = getPeriodFromRange(timeRange);
    const chartInterval = timeRange === '1D' ? interval : '1d';
    loadChartData(symbol, period, chartInterval);
  }, [symbol, timeRange, interval]);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !chartData) return;

    const formattedData = chartData.map(item => ({
      time: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    seriesRef.current.setData(formattedData);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

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

        {/* Time Range and Interval Selector */}
        <div className="mt-6 space-y-4">
          {/* Minute intervals for 1D */}
          {timeRange === '1D' && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">분단위:</span>
              {(['1m', '3m', '15m', '30m', '1h'] as ChartInterval[]).map((int) => (
                <Button
                  key={int}
                  variant={interval === int ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInterval(int)}
                  className="text-xs"
                >
                  {int === '1m' ? '1분' : int === '3m' ? '3분' : int === '15m' ? '15분' : int === '30m' ? '30분' : '1시간'}
                </Button>
              ))}
            </div>
          )}

          {/* Time Range */}
          <div className="flex flex-wrap gap-2">
            {(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
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