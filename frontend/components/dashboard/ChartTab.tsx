'use client';

import React, { useEffect, useRef, memo } from 'react';
import type { Stock } from '@/components/dashboard/Dashboard';

interface ChartTabProps {
  stock: Stock;
  market?: string;
}

export const ChartTab = memo(({ stock, market = 'us' }: ChartTabProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = React.useState(false);

  // Ensure we only render on client
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) {
      return;
    }

    // 기존 위젯 제거
    containerRef.current.innerHTML = '';

    const symbol =
      market === 'kr' && !stock.symbol.includes('.')
        ? `KRX:${stock.symbol}`
        : stock.symbol;

    // TradingView 설정
    const config = {
      lineWidth: 2,
      lineType: 0,
      chartType: 'area',
      fontColor: 'rgb(106, 109, 120)',
      gridLineColor: 'rgba(242, 242, 242, 0.06)',
      volumeUpColor: 'rgba(34, 171, 148, 0.5)',
      volumeDownColor: 'rgba(247, 82, 95, 0.5)',
      backgroundColor: '#FFFFFF',
      widgetFontColor: '#131722',
      upColor: '#089981',
      downColor: '#f23645',
      borderUpColor: '#089981',
      borderDownColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
      colorTheme: 'light',
      isTransparent: false,
      locale: 'ko',
      chartOnly: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      symbols: [[stock.name || stock.symbol, `${symbol}|1D`]],
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      fontSize: '10',
      headerFontSize: 'medium',
      autosize: true,
      width: '100%',
      height: '100%',
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false
    };

    // TradingView 공식 방식: HTML 주입 후 스크립트 로드
    if (containerRef.current) {
      // Step 1: Create the container structure
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container';
      widgetContainer.style.width = '100%';
      widgetContainer.style.height = '100%';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetContainer.appendChild(widgetDiv);

      // Step 2: Create the script tag and set configuration BEFORE appending
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      script.async = true;
      // Set configuration as textContent before appending to DOM
      script.textContent = JSON.stringify(config);

      widgetContainer.appendChild(script);

      // Step 3: Clear existing content and append new structure
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(widgetContainer);
    }

    // 클린업 함수
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [stock.symbol, stock.name, market, isClient]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        flex: 1,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF'
      }}
    />
  );
});
