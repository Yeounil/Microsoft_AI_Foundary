"use client";

import { useEffect, useRef } from "react";

/**
 * TradingView Ticker Tape Widget
 * 실시간 주식 시세를 표시하는 티커 테이프
 */
export function TickerTapeWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 스크립트 제거 (중복 방지)
    const existingScript = containerRef.current.querySelector("script");
    if (existingScript) {
      existingScript.remove();
    }

    // TradingView 위젯 스크립트 생성
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        {
          proName: "NASDAQ:NDX",
          title: "NASDAQ 100"
        },
        {
          proName: "CME_MINI:NQ1!",
          title: "NASDAQ 100 Futures"
        },
        {
          proName: "SP:SPX",
          title: "S&P 500"
        },
        {
          proName: "TVC:DJI",
          title: "Dow Jones"
        },
        {
          proName: "FX:USDKRW",
          title: "USD/KRW"
        },
        {
          proName: "TVC:DXY",
          title: "Dollar Index"
        }
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "regular",
      colorTheme: "light",
      locale: "en"
    });

    containerRef.current.appendChild(script);

    // Cleanup
    return () => {
      if (containerRef.current) {
        const scriptToRemove = containerRef.current.querySelector("script");
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container mb-6">
      <div className="tradingview-widget-container__widget" ref={containerRef}></div>
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
          className="text-xs text-muted-foreground"
        >
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}
