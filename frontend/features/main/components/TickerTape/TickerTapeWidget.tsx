"use client";

import { useEffect, useRef, memo } from "react";

/**
 * TradingView Ticker Tape Widget
 * 실시간 주식 시세를 표시하는 티커 테이프
 */
function TickerTapeWidgetComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || initialized.current) return;

    initialized.current = true;

    // TradingView 위젯 스크립트 생성
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.text = JSON.stringify({
      symbols: [
        {
          proName: "NASDAQ:NDX",
          title: "NASDAQ 100"
        },
        {
          proName: "PEPPERSTONE:NAS100",
          title: "NASDAQ 100 Index"
        },
        {
          proName: "FOREXCOM:SPXUSD",
          title: "S&P 500"
        },
        {
          proName: "FOREXCOM:DJI",
          title: "Dow Jones"
        },
        {
          proName: "FX_IDC:USDKRW",
          title: "USD/KRW"
        },
        {
          proName: "TVC:DXY",
          title: "Dollar Index"
        }
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "en"
    });

    container.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container mb-6 relative" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
      {/* 클릭 방지 오버레이 */}
      <div
        className="absolute inset-0 z-10"
        style={{ cursor: 'default' }}
        onClick={(e) => e.preventDefault()}
      />
    </div>
  );
}

export const TickerTapeWidget = memo(TickerTapeWidgetComponent);
