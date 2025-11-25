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
      className={`flex items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-muted/50 cursor-pointer active:scale-[0.99] touch-manipulation ${
        isSelected ? "bg-primary/10 border-primary" : ""
      }`}
      onClick={() => onSelect(stock.symbol)}
    >
      {/* 종목 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <h3 className="font-semibold text-sm">{stock.symbol}</h3>
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-40 md:max-w-[200px]">
            {stock.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {stock.isLoading || stock.price === null ? (
            <span className="text-muted-foreground animate-pulse">로딩...</span>
          ) : (
            <>
              <span className="font-medium">${stock.price.toFixed(2)}</span>
              <span
                className={`flex items-center text-[11px] ${
                  stock.change >= 0 ? "text-stock-up" : "text-stock-down"
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
      {/* 버튼 영역 */}
      <div className="flex items-center shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => onToggleWatchlist(e, stock.symbol)}
          className="h-7 w-7"
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
          className="h-7 px-2 text-xs"
        >
          <Link href={`/dashboard/${stock.symbol}`}>
            상세
          </Link>
        </Button>
      </div>
    </div>
  );
});
