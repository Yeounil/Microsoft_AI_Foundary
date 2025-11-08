import React, { useEffect, useRef, memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface StockSymbol {
  s: string;
  d: string;
}

interface TradingViewWidgetProps {
  onExpandedChange?: (expanded: boolean) => void;
}

const allStocksSymbols: StockSymbol[] = [
  { s: "NASDAQ:AAPL", d: "Apple Inc." },
  { s: "NASDAQ:GOOGL", d: "Alphabet Inc." },
  { s: "NASDAQ:NVDA", d: "NVIDIA Corporation" },
  { s: "NASDAQ:MSFT", d: "Microsoft Corporation" },
  { s: "NASDAQ:TSLA", d: "Tesla, Inc." },
  { s: "NASDAQ:AMZN", d: "Amazon.com Inc." },
  { s: "NASDAQ:META", d: "Meta Platforms Inc." },
  { s: "NYSE:BRK.B", d: "Berkshire Hathaway" },
  { s: "NYSE:JPM", d: "JPMorgan Chase & Co." },
  { s: "NYSE:V", d: "Visa Inc." },
  { s: "NYSE:JNJ", d: "Johnson & Johnson" },
  { s: "NYSE:WMT", d: "Walmart Inc." },
  { s: "NYSE:PG", d: "Procter & Gamble" },
  { s: "NYSE:MA", d: "Mastercard Inc." },
  { s: "NYSE:HD", d: "The Home Depot" },
  { s: "NYSE:BAC", d: "Bank of America" },
  { s: "NYSE:DIS", d: "The Walt Disney Company" },
  { s: "NASDAQ:NFLX", d: "Netflix Inc." },
  { s: "NASDAQ:ADBE", d: "Adobe Inc." },
  { s: "NYSE:CRM", d: "Salesforce Inc." },
];

const favoriteStocksSymbols: StockSymbol[] = [
  { s: "NASDAQ:GOOGL", d: "Alphabet Inc." },
  { s: "NASDAQ:AAPL", d: "Apple Inc." },
  { s: "NASDAQ:NVDA", d: "NVIDIA Corporation" },
];

function TradingViewWidget({ onExpandedChange }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [expanded, setExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExpandToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    }
  };

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const symbols = activeTab === "all" ? allStocksSymbols : favoriteStocksSymbols;
    const displaySymbols = expanded ? symbols : symbols.slice(0, 6);

    // 기존 콘텐츠 정리
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // 위젯 컨테이너 생성
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    container.appendChild(widgetContainer);

    // 스크립트 생성 및 추가
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "light",
      dateRange: "12M",
      locale: "en",
      largeChartUrl: "",
      isTransparent: false,
      showFloatingTooltip: false,
      plotLineColorGrowing: "rgba(41, 98, 255, 1)",
      plotLineColorFalling: "rgba(41, 98, 255, 1)",
      gridLineColor: "rgba(240, 243, 250, 0.1)",
      scaleFontColor: "#131722",
      belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
      belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
      symbolActiveColor: "rgba(41, 98, 255, 0.12)",
      tabs: [
        {
          title: activeTab === "all" ? "All Stocks" : "Watchlist",
          symbols: displaySymbols,
          originalTitle: activeTab === "all" ? "All Stocks" : "Watchlist",
        },
      ],
      width: "100%",
      height: "100%",
      showSymbolLogo: true,
      showChart: true,
      backgroundColor: "#ffffff",
    });

    scriptRef.current = script;
    container.appendChild(script);

    // Cleanup 함수
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      scriptRef.current = null;
    };
  }, [activeTab, expanded, isClient]);

  return (
    <div className="h-full flex flex-col">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 px-4 py-2.5 text-sm transition-colors ${
            activeTab === "all"
              ? "text-yellow-600 border-b-2 border-yellow-500 font-semibold"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          모든 종목
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 px-4 py-2.5 text-sm transition-colors ${
            activeTab === "favorites"
              ? "text-yellow-600 border-b-2 border-yellow-500 font-semibold"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          관심 종목
        </button>
      </div>

      {/* TradingView 위젯 */}
      <div className="flex-1 relative">
        {isClient ? (
          <div
            className="tradingview-widget-container w-full h-full"
            ref={containerRef}
            style={{ position: "relative" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-gray-500">위젯 로딩 중...</div>
          </div>
        )}
        {/* 하단 브랜딩 숨기기용 오버레이 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-white"
          style={{ zIndex: 10 }}
        />
      </div>

      {/* 더보기/접기 버튼 */}
      <div className="border-t border-gray-200 p-2 flex justify-center bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExpandToggle}
          className="gap-2 text-gray-600 hover:text-yellow-600 text-xs"
        >
          {expanded ? (
            <>
              접기
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              더보기
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
