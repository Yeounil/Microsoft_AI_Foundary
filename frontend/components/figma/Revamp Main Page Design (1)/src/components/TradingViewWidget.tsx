import React, { useEffect, useRef, memo, useState } from "react";
import { Button } from "./ui/button";
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
  const container = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [expanded, setExpanded] = useState(false);

  const handleExpandToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    }
  };

  useEffect(() => {
    if (!container.current) return;

    // 기존 스크립트 제거
    container.current.innerHTML = "";

    const symbols = activeTab === "all" ? allStocksSymbols : favoriteStocksSymbols;
    const displaySymbols = expanded ? symbols : symbols.slice(0, 6);

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    container.current.appendChild(widgetContainer);

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

    container.current.appendChild(script);
  }, [activeTab, expanded]);

  return (
    <div className="h-full flex flex-col">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          모든 종목
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "favorites"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          관심 종목
        </button>
      </div>

      {/* TradingView 위젯 */}
      <div className="flex-1 relative">
        <div
          className="tradingview-widget-container w-full h-full"
          ref={container}
          style={{ position: "relative" }}
        />
        {/* 하단 브랜딩 숨기기용 오버레이 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-card"
          style={{ zIndex: 10 }}
        />
      </div>

      {/* 더보기/접기 버튼 */}
      <div className="border-t border-border p-3 flex justify-center bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExpandToggle}
          className="gap-2 text-muted-foreground hover:text-foreground"
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
