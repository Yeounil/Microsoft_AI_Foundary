import { CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChartHeaderProps {
  symbol: string;
  isRealtime: boolean;
  isLoading: boolean;
  currentPrice: number | null;
  priceChange: number;
  priceChangePercent: number;
}

/**
 * ChartHeader Component
 * 차트 제목, LIVE 배지, 실시간 가격 정보를 표시합니다.
 */
export function ChartHeader({
  symbol,
  isRealtime,
  isLoading,
  currentPrice,
  priceChange,
  priceChangePercent,
}: ChartHeaderProps) {
  return (
    <div className="flex-1">
      {/* Title Section */}
      {isLoading ? (
        <div className="mb-2">
          <Skeleton className="h-8 w-64" />
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-2">
          <CardTitle>실시간 차트 - {symbol}</CardTitle>
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      ) : currentPrice !== null ? (
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold">${currentPrice.toFixed(2)}</span>
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              priceChange >= 0 ? "text-stock-up" : "text-stock-down"
            }`}
          >
            {priceChange >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)} ({priceChange >= 0 ? "+" : ""}
            {priceChangePercent.toFixed(2)}%)
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground animate-pulse">
          가격 로딩 중...
        </div>
      )}
    </div>
  );
}
