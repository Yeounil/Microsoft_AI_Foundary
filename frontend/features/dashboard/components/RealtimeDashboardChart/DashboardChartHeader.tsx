import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardChartHeaderProps {
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  isRealtime: boolean;
  isLoading: boolean;
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
  isInWatchlist,
  onToggleWatchlist,
}: DashboardChartHeaderProps) {
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <div className="flex items-start justify-between">
      <div>
        {/* Title Section */}
        {isLoading ? (
          <Skeleton className="h-9 w-64 mb-2" />
        ) : (
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
        )}

        {/* Price Section */}
        {isLoading ? (
          <div className="mt-2 flex items-center gap-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ) : (
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
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
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
