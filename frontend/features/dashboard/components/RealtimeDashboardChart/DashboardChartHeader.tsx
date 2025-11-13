import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartMode } from "../../services/dashboardChartService";

interface DashboardChartHeaderProps {
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  isRealtime: boolean;
  isLoading: boolean;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
}

/**
 * DashboardChartHeader Component
 * 차트 헤더 (제목, 가격, LIVE 배지, chartMode 선택, 관심 종목 버튼)
 */
export function DashboardChartHeader({
  symbol,
  companyName,
  currentPrice,
  priceChange,
  priceChangePercent,
  isRealtime,
  isLoading,
  chartMode,
  onChartModeChange,
  isInWatchlist,
  onToggleWatchlist,
}: DashboardChartHeaderProps) {
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3">
          <CardTitle className="text-2xl font-bold">
            {companyName || symbol}
          </CardTitle>
          {isRealtime && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-lg font-semibold">
            ${currentPrice?.toFixed(2) || "0.00"}
          </span>
          {priceChange !== undefined && priceChangePercent !== undefined && (
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {priceChange.toFixed(2)} ({isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%)
            </span>
          )}
          {isLoading && (
            <span className="text-xs text-muted-foreground">로딩 중...</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Chart Mode Selector */}
        <Tabs
          value={chartMode}
          onValueChange={(v) => onChartModeChange(v as ChartMode)}
        >
          <TabsList className="h-9">
            <TabsTrigger value="enhanced" className="text-xs">
              Enhanced
            </TabsTrigger>
            <TabsTrigger value="basic" className="text-xs">
              Basic
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleWatchlist}
          className="flex items-center gap-2"
        >
          <Star
            className={`h-4 w-4 ${
              isInWatchlist ? "fill-yellow-400 text-yellow-400" : ""
            }`}
          />
          관심 종목 {isInWatchlist ? "제거" : "추가"}
        </Button>
      </div>
    </div>
  );
}
