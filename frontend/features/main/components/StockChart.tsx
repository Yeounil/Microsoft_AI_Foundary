'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useStockStore } from '@/store/stock-store';

type ChartType = 'area' | 'line' | 'candle';
type ChartMode = 'basic' | 'enhanced';
type TimeRange = '1D' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

interface StockChartProps {
  symbol?: string;
}

export function StockChart({ symbol = 'AAPL' }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('area');
  const [chartMode, setChartMode] = useState<ChartMode>('enhanced');
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  const { selectedStock, chartData, loadChartData, isLoadingChart } = useStockStore();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth || 0,
      });
    };

    // Create chart
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

    // Add series based on chart type
    if (chartType === 'candle') {
      seriesRef.current = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    } else if (chartType === 'line') {
      seriesRef.current = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 2,
      });
    } else {
      seriesRef.current = chart.addAreaSeries({
        lineColor: '#2962ff',
        topColor: 'rgba(41, 98, 255, 0.28)',
        bottomColor: 'rgba(41, 98, 255, 0.05)',
        lineWidth: 2,
      });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartType]);

  // Load chart data
  useEffect(() => {
    loadChartData(symbol, getPeriodFromRange(timeRange), getIntervalFromRange(timeRange));
  }, [symbol, timeRange]);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !chartData) return;

    const formattedData = chartData.map(item => ({
      time: item.date,
      value: item.close,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    if (chartType === 'candle') {
      seriesRef.current.setData(formattedData);
    } else {
      seriesRef.current.setData(formattedData.map(item => ({
        time: item.time,
        value: item.value,
      })));
    }

    chartRef.current?.timeScale().fitContent();
  }, [chartData, chartType]);

  const getPeriodFromRange = (range: TimeRange): string => {
    switch (range) {
      case '1D': return '1d';
      case '1M': return '1mo';
      case '3M': return '3mo';
      case '1Y': return '1y';
      case '5Y': return '5y';
      case 'ALL': return 'max';
      default: return '1mo';
    }
  };

  const getIntervalFromRange = (range: TimeRange): string => {
    switch (range) {
      case '1D': return '5m';
      case '1M': return '1d';
      case '3M': return '1d';
      case '1Y': return '1wk';
      case '5Y': return '1mo';
      case 'ALL': return '1mo';
      default: return '1d';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>실시간 차트</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Mode */}
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

            {/* Chart Type */}
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
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
          {(['1D', '1M', '3M', '1Y', '5Y', 'ALL'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="text-xs"
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="relative w-full">
          {isLoadingChart && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-sm text-muted-foreground">차트 데이터 로딩 중...</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}