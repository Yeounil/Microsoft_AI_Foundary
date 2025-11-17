import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockListContent } from "./StockListContent";
import { StockItem } from "../../services/stockListService";

interface StockListTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  allStocksCount: number;
  favoriteStocksCount: number;
  displayStocks: StockItem[];
  watchlist: string[];
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

/**
 * StockListTabs Component
 * 전체 종목/관심 종목 탭을 표시합니다.
 */
export function StockListTabs({
  activeTab,
  onTabChange,
  allStocksCount,
  favoriteStocksCount,
  displayStocks,
  watchlist,
  onToggleWatchlist,
  onSelectStock,
  selectedSymbol,
}: StockListTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4 w-full">
        <TabsTrigger value="all" className="flex-1">
          전체 종목 ({allStocksCount})
        </TabsTrigger>
        <TabsTrigger value="favorites" className="flex-1">
          관심 종목 ({favoriteStocksCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        <StockListContent
          stocks={displayStocks}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onSelectStock={onSelectStock}
          selectedSymbol={selectedSymbol}
        />
      </TabsContent>

      <TabsContent value="favorites" className="mt-0">
        <StockListContent
          stocks={displayStocks}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onSelectStock={onSelectStock}
          selectedSymbol={selectedSymbol}
        />
      </TabsContent>
    </Tabs>
  );
}
