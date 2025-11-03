'use client';

import React, { useEffect, useRef } from 'react';
import type { Stock } from './Dashboard';

interface ChartTabProps {
  stock: Stock;
  market?: string;
}

export function ChartTab({ stock, market = 'us' }: ChartTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const symbol =
      market === 'kr' && !stock.symbol.includes('.')
        ? `KRX:${stock.symbol}`
        : stock.symbol;

    // 컨테이너 초기화
    containerRef.current.innerHTML = '';

    // 공식 HTML 구조 작성
    containerRef.current.innerHTML = `
      <div class="tradingview-widget-container" style="height: 100%; width: 100%;">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright" style="padding: 10px;">
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
            <span class="blue-text">TradingView</span>
          </a>
        </div>
      </div>
    `;

    // TradingView 스크립트 로드
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';

    // 설정 JSON
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

    script.textContent = JSON.stringify(config);

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [stock.symbol, stock.name, market]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF'
      }}
    />
  );
}
