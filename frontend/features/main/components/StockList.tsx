'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStockStore } from '@/store/stock-store';
import wsClient from '@/lib/websocket-client';

interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Mock data - 실제로는 API에서 가져올 예정
const mockStocks: StockItem[] = [
  { symbol: 'AAPL', name: '애플', price: 186.45, change: 2.34, changePercent: 1.27 },
  { symbol: 'GOOGL', name: '구글', price: 142.38, change: -1.25, changePercent: -0.87 },
  { symbol: 'MSFT', name: '마이크로소프트', price: 378.91, change: 5.67, changePercent: 1.52 },
  { symbol: 'TSLA', name: '테슬라', price: 245.12, change: -3.45, changePercent: -1.39 },
  { symbol: 'NVDA', name: '엔비디아', price: 512.76, change: 8.23, changePercent: 1.63 },
  { symbol: 'META', name: '메타', price: 389.45, change: 4.12, changePercent: 1.07 },
  { symbol: 'AMZN', name: '아마존', price: 156.78, change: 2.89, changePercent: 1.88 },
  { symbol: 'NFLX', name: '넷플릭스', price: 478.23, change: -2.34, changePercent: -0.49 },
];

export function StockList() {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [stocks, setStocks] = useState<StockItem[]>(mockStocks);

  const { watchlist, addToWatchlist, removeFromWatchlist, realtimePrices, subscribeToRealtime } = useStockStore();

  useEffect(() => {
    // WebSocket 연결 및 구독
    const connectAndSubscribe = async () => {
      try {
        await wsClient.connect();
        const symbols = stocks.map(s => s.symbol);
        subscribeToRealtime(symbols);
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      // Cleanup은 store에서 처리
    };
  }, []);

  // 실시간 가격 업데이트 반영
  useEffect(() => {
    const updatedStocks = stocks.map(stock => {
      const realtimeData = realtimePrices[stock.symbol];
      if (realtimeData && realtimeData.last_price) {
        const newPrice = realtimeData.last_price;
        const oldPrice = stock.price;
        const change = newPrice - oldPrice;
        const changePercent = (change / oldPrice) * 100;

        return {
          ...stock,
          price: newPrice,
          change,
          changePercent,
        };
      }
      return stock;
    });

    setStocks(updatedStocks);
  }, [realtimePrices]);

  const favoriteStocks = stocks.filter(stock => watchlist.includes(stock.symbol));
  const displayStocks = activeTab === 'all' ? stocks : favoriteStocks;
  const visibleStocks = showAll ? displayStocks : displayStocks.slice(0, 5);

  const toggleWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>종목 리스트</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="all" className="flex-1">
              전체 종목
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심 종목
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <StockListContent
              stocks={visibleStocks}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(!showAll)}
              totalCount={stocks.length}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <StockListContent
              stocks={visibleStocks}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(!showAll)}
              totalCount={favoriteStocks.length}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface StockListContentProps {
  stocks: StockItem[];
  showAll: boolean;
  onToggleShowAll: () => void;
  totalCount: number;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

function StockListContent({
  stocks,
  showAll,
  onToggleShowAll,
  totalCount,
  watchlist,
  onToggleWatchlist,
}: StockListContentProps) {
  const content = (
    <div className="space-y-2">
      {stocks.map((stock) => (
        <div
          key={stock.symbol}
          className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{stock.name}</h3>
              <span className="text-xs text-muted-foreground">{stock.symbol}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-medium">${stock.price.toFixed(2)}</span>
              <span
                className={`flex items-center text-xs ${
                  stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stock.change >= 0 ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleWatchlist(stock.symbol)}
              className="h-8 w-8 p-0"
            >
              <Star
                className={`h-4 w-4 ${
                  watchlist.includes(stock.symbol) ? 'fill-yellow-400 text-yellow-400' : ''
                }`}
              />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/${stock.symbol}`}>상세</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {showAll ? <ScrollArea className="h-[600px]">{content}</ScrollArea> : content}

      {totalCount > 5 && (
        <Button variant="outline" className="w-full" onClick={onToggleShowAll}>
          {showAll ? '접기' : `더보기 (${totalCount - 5}개)`}
        </Button>
      )}
    </div>
  );
}