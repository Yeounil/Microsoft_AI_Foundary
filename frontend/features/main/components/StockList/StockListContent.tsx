import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StockItem as StockItemType } from "../../services/stockListService";
import { StockItem } from "./StockItem";

interface StockListContentProps {
  stocks: StockItemType[];
  showAll: boolean;
  onToggleShowAll: () => void;
  totalCount: number;
  watchlist: string[];
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

/**
 * StockListContent Component
 * 종목 리스트를 표시하고 더보기/접기 기능을 제공합니다.
 */
export function StockListContent({
  stocks,
  showAll,
  onToggleShowAll,
  totalCount,
  watchlist,
  onToggleWatchlist,
  onSelectStock,
  selectedSymbol,
}: StockListContentProps) {
  const content = (
    <div className="space-y-2">
      {stocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          검색 결과가 없습니다
        </div>
      ) : (
        stocks.map((stock) => (
          <StockItem
            key={stock.symbol}
            stock={stock}
            isSelected={selectedSymbol === stock.symbol}
            isInWatchlist={watchlist.includes(stock.symbol)}
            onSelect={onSelectStock || (() => {})}
            onToggleWatchlist={onToggleWatchlist}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {showAll ? <ScrollArea className="h-[700px]">{content}</ScrollArea> : content}

      {totalCount > 5 && (
        <Button variant="outline" className="w-full" onClick={onToggleShowAll}>
          {showAll ? "접기" : "더보기"}
        </Button>
      )}
    </div>
  );
}
