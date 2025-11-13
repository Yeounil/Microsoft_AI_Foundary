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
export function StockItem({
  stock,
  isSelected,
  isInWatchlist,
  onSelect,
  onToggleWatchlist,
}: StockItemProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-border p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer ${
        isSelected ? "bg-primary/10 border-primary shadow-sm" : ""
      }`}
      onClick={() => onSelect(stock.symbol)}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{stock.symbol}</h3>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {stock.name}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {stock.isLoading || stock.price === null ? (
            <span className="text-sm text-muted-foreground animate-pulse">
              가격 로딩 중...
            </span>
          ) : (
            <>
              <span className="text-sm font-medium">
                ${stock.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center text-xs gap-2 ${
                  stock.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stock.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(stock.change).toFixed(2)} (
                {Math.abs(stock.changePercent).toFixed(2)}%)
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => onToggleWatchlist(e, stock.symbol)}
          className="h-8 w-8 p-0"
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
        >
          <Link href={`/dashboard/${stock.symbol}`}>상세</Link>
        </Button>
      </div>
    </div>
  );
}
