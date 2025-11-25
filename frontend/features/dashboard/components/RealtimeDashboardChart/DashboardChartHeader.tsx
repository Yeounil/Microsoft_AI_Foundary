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
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        {/* Title Section */}
        {isLoading ? (
          <Skeleton className="h-9 w-64 mb-2" />
        ) : (
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl md:text-2xl font-bold">
              {symbol}
              {companyName && (
                <span className="ml-2 text-base md:text-lg font-normal text-muted-foreground">
                  {companyName}
                </span>
              )}
            </CardTitle>
            {isRealtime && (
              <span className="flex items-center gap-1 text-xs text-stock-up">
                <span className="inline-block w-2 h-2 bg-stock-up rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>
        )}

        {/* Price Section */}
        {isLoading ? (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-4">
            <Skeleton className="h-6 sm:h-7 w-24 sm:w-32" />
            <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
          </div>
        ) : (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-4">
            <span className="text-base sm:text-lg font-semibold">
              ${currentPrice?.toFixed(2) || "0.00"}
            </span>
            {priceChange !== undefined && priceChangePercent !== undefined && (
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isPositive ? "text-stock-up" : "text-stock-down"
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
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={onToggleWatchlist}
          className="flex items-center gap-1.5 sm:gap-2 min-h-10 sm:min-h-11 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <Star
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
              isInWatchlist ? "fill-yellow-400 text-yellow-400" : ""
            }`}
          />
          <span className="hidden sm:inline">관심 종목</span> {isInWatchlist ? "제거" : "추가"}
        </Button>
      </div>
    </div>
  );
}
