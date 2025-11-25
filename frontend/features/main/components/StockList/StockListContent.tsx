import { ScrollArea } from "@/components/ui/scroll-area";
import { StockItem as StockItemType } from "../../services/stockListService";
import { StockItem } from "./StockItem";

interface StockListContentProps {
  stocks: StockItemType[];
  watchlist: string[];
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

/**
 * StockListContent Component
 * 종목 리스트를 스크롤 영역에 표시합니다.
 */
export function StockListContent({
  stocks,
  watchlist,
  onToggleWatchlist,
  onSelectStock,
  selectedSymbol,
}: StockListContentProps) {
  return (
    <ScrollArea className="h-[600px] [&>div>div[style]]:block! **:data-radix-scroll-area-scrollbar:hidden">
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
    </ScrollArea>
  );
}
