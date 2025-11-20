import { memo } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockItem as StockItemType } from "../../services/stockListService";

interface StockItemProps {
  stock: StockItemType;
  isSelected: boolean;
  isInWatchlist: boolean;
  onSelect: (symbol: string) => void;
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
}

/**
 * StockItem Component
 * 개별 종목 행을 표시합니다.
 */
export const StockItem = memo(function StockItem({
  stock,
  isSelected,
  isInWatchlist,
  onSelect,
  onToggleWatchlist,
}: StockItemProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-border p-2 md:p-3 lg:p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer active:scale-[0.98] touch-manipulation ${
        isSelected ? "bg-primary/10 border-primary shadow-sm" : ""
      }`}
      onClick={() => onSelect(stock.symbol)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <h3 className="font-semibold truncate text-sm lg:text-base">{stock.name}</h3>
          <span className="text-[10px] lg:text-xs text-muted-foreground shrink-0">
            {stock.symbol}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs lg:text-sm">
          {stock.isLoading || stock.price === null ? (
            <span className="text-muted-foreground animate-pulse">
              로딩...
            </span>
          ) : (
            <>
              <span className="font-medium">
                ${stock.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center gap-0.5 text-[10px] lg:text-xs ${
                  stock.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stock.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(stock.changePercent).toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => onToggleWatchlist(e, stock.symbol)}
          className="h-8 w-8 p-0 min-h-[36px] min-w-[36px]"
        >
          <Star
            className={`h-4 w-4 ${
              isInWatchlist ? "fill-yellow-400 text-yellow-400" : ""
            }`}
          />
        </Button>
        <Button
          size="sm"
          variant="outline"
          asChild
          onClick={(e) => e.stopPropagation()}
          className="hidden lg:flex h-8 px-3 text-xs"
        >
          <Link href={`/dashboard/${stock.symbol}`}>상세</Link>
        </Button>
      </div>
    </div>
  );
});
