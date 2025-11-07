import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isFavorite?: boolean;
}

const allStocks: Stock[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 2.34, changePercent: 1.33 },
  { id: '2', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.87, change: -1.23, changePercent: -0.85 },
  { id: '3', symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.22, change: 8.76, changePercent: 1.80 },
  { id: '4', symbol: 'MSFT', name: 'Microsoft Corporation', price: 420.15, change: 3.45, changePercent: 0.83 },
  { id: '5', symbol: 'TSLA', name: 'Tesla, Inc.', price: 248.30, change: -5.12, changePercent: -2.02 },
  { id: '6', symbol: 'AMZN', name: 'Amazon.com Inc.', price: 175.90, change: 1.87, changePercent: 1.07 },
  { id: '7', symbol: 'META', name: 'Meta Platforms Inc.', price: 490.33, change: 4.21, changePercent: 0.87 },
  { id: '8', symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 410.25, change: 2.15, changePercent: 0.53 },
  { id: '9', symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 185.67, change: -0.98, changePercent: -0.52 },
  { id: '10', symbol: 'V', name: 'Visa Inc.', price: 275.44, change: 1.56, changePercent: 0.57 },
  { id: '11', symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.89, change: 0.45, changePercent: 0.29 },
  { id: '12', symbol: 'WMT', name: 'Walmart Inc.', price: 165.23, change: -0.67, changePercent: -0.40 },
  { id: '13', symbol: 'PG', name: 'Procter & Gamble', price: 155.78, change: 0.89, changePercent: 0.57 },
  { id: '14', symbol: 'MA', name: 'Mastercard Inc.', price: 445.12, change: 2.34, changePercent: 0.53 },
  { id: '15', symbol: 'HD', name: 'The Home Depot', price: 355.67, change: -1.23, changePercent: -0.34 },
  { id: '16', symbol: 'BAC', name: 'Bank of America', price: 35.45, change: -0.12, changePercent: -0.34 },
  { id: '17', symbol: 'DIS', name: 'The Walt Disney Company', price: 112.34, change: 1.87, changePercent: 1.69 },
  { id: '18', symbol: 'NFLX', name: 'Netflix Inc.', price: 615.23, change: 8.45, changePercent: 1.39 },
  { id: '19', symbol: 'ADBE', name: 'Adobe Inc.', price: 567.89, change: -2.34, changePercent: -0.41 },
  { id: '20', symbol: 'CRM', name: 'Salesforce Inc.', price: 285.67, change: 3.21, changePercent: 1.14 },
];

const favoriteStocks: Stock[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 2.34, changePercent: 1.33, isFavorite: true },
  { id: '2', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.87, change: -1.23, changePercent: -0.85, isFavorite: true },
  { id: '3', symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.22, change: 8.76, changePercent: 1.80, isFavorite: true },
];

export function StockListWidget() {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [expanded, setExpanded] = useState(false);

  const stocks = activeTab === 'all' ? allStocks : favoriteStocks;
  const displayedStocks = expanded ? stocks : stocks.slice(0, 6);

  const renderStockItem = (stock: Stock) => (
    <div
      key={stock.id}
      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-lg cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {stock.isFavorite && <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{stock.symbol}</span>
            <span className="text-xs text-muted-foreground truncate">{stock.name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="font-semibold text-foreground">${stock.price.toFixed(2)}</span>
        <div className="flex items-center gap-1 min-w-[80px] justify-end">
          {stock.change >= 0 ? (
            <>
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">
                +{stock.changePercent.toFixed(2)}%
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">
                {stock.changePercent.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          모든 종목
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'favorites'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          관심 종목
        </button>
      </div>

      {/* 종목 리스트 */}
      <div className="flex-1 overflow-hidden">
        {expanded ? (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {displayedStocks.map(renderStockItem)}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-2 space-y-1">
            {displayedStocks.map(renderStockItem)}
          </div>
        )}
      </div>

      {/* 더보기/접기 버튼 */}
      <div className="border-t border-border p-3 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              접기
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              더보기
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
