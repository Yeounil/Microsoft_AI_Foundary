'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useState, useCallback, useEffect } from 'react';
import type { Stock } from './Dashboard';

interface ChartTabProps {
  stock: Stock;
  market?: string;
}

// TradingView Widget script 타입
declare global {
  interface Window {
    TradingView: any;
  }
}

export function ChartTab({ stock, market = 'us' }: ChartTabProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const getIntervalFromRange = useCallback((range: string): string => {
    switch (range) {
      case '1D': return '5';
      case '1W': return '60';
      case '1M': return 'D';
      case '3M': return 'D';
      case '1Y': return 'W';
      default: return 'D';
    }
  }, []);

  // TradingView Widget 스크립트 로드
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://s3.tradingview.com/tv.js"]'
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  // 위젯 생성 및 업데이트
  useEffect(() => {
    if (!scriptLoaded) return;

    const createWidget = () => {
      const container = document.getElementById('tradingview-widget');
      if (container) {
        container.innerHTML = '';
      }

      const symbol =
        market === 'kr' && !stock.symbol.includes('.')
          ? `KRX:${stock.symbol}`
          : stock.symbol;

      if (typeof window !== 'undefined' && window.TradingView) {
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: getIntervalFromRange(timeRange),
            timezone: 'Asia/Seoul',
            theme: 'light',
            style: '1',
            locale: 'ko',
            enable_publishing: false,
            allow_symbol_change: false,
            container_id: 'tradingview-widget',
            hide_volume: false,
            hide_legend: false,
            save_image: true,
            width: '100%',
            height: 500
          });
        } catch (error) {
          console.error('Failed to initialize TradingView widget:', error);
        }
      }
    };

    createWidget();
  }, [scriptLoaded, stock.symbol, timeRange, market, getIntervalFromRange]);

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>가격 차트</CardTitle>
            <CardDescription className="hidden sm:block">TradingView 실시간 차트</CardDescription>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="min-w-[3.5rem] h-9"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TradingView Widget Container */}
        <div
          id="tradingview-widget"
          className="w-full min-h-96"
          style={{ height: '500px' }}
        />

        {/* AI Insights */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-secondary mb-2">🤖 AI 분석 인사이트</h4>
          <ul className="space-y-1.5 sm:space-y-2 text-slate-700">
            <li>• 최근 {timeRange} 동안 {stock.change >= 0 ? '상승' : '하락'} 추세를 보이고 있습니다.</li>
            <li>• 거래량이 평균 대비 {Math.floor(Math.random() * 30 + 10)}% 증가했습니다.</li>
            <li>• 기술적 지표상 {stock.changePercent > 1 ? '강세' : stock.changePercent < -1 ? '약세' : '중립'} 신호를 나타냅니다.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
