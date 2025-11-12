'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Star, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useStockStore } from '@/store/stock-store';
import { getFMPWebSocketClient } from '@/lib/fmp-websocket-client';

interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// 인기 종목 리스트 (FMP 100개 종목)
const popularStocks: { symbol: string; name: string }[] = [
  // Tech (20)
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corp.' },
  { symbol: 'ADOBE', name: 'Adobe Inc.' },
  { symbol: 'INTC', name: 'Intel Corp.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'MU', name: 'Micron Technology' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.' },
  { symbol: 'IBM', name: 'IBM Corp.' },
  { symbol: 'CSCO', name: 'Cisco Systems' },
  { symbol: 'HPQ', name: 'HP Inc.' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },

  // Finance (10)
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'BAC', name: 'Bank of America' },
  { symbol: 'WFC', name: 'Wells Fargo' },
  { symbol: 'GS', name: 'Goldman Sachs' },
  { symbol: 'MS', name: 'Morgan Stanley' },
  { symbol: 'C', name: 'Citigroup Inc.' },
  { symbol: 'BLK', name: 'BlackRock Inc.' },
  { symbol: 'SCHW', name: 'Charles Schwab' },
  { symbol: 'AXP', name: 'American Express' },
  { symbol: 'CB', name: 'Chubb Limited' },

  // Healthcare (10)
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'UNH', name: 'UnitedHealth Group' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'MRK', name: 'Merck & Co.' },
  { symbol: 'TMO', name: 'Thermo Fisher' },
  { symbol: 'LLY', name: 'Eli Lilly' },
  { symbol: 'ABT', name: 'Abbott Labs' },
  { symbol: 'AMGN', name: 'Amgen Inc.' },
  { symbol: 'GILD', name: 'Gilead Sciences' },

  // Retail/Consumer (10)
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'TGT', name: 'Target Corp.' },
  { symbol: 'HD', name: 'Home Depot' },
  { symbol: 'LOW', name: "Lowe's Companies" },
  { symbol: 'MCD', name: "McDonald's Corp." },
  { symbol: 'SBUX', name: 'Starbucks Corp.' },
  { symbol: 'KO', name: 'Coca-Cola Co.' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
];

interface StockListProps {
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

export function ImprovedStockList({ onSelectStock, selectedSymbol }: StockListProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockPrices, setStockPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});

  const { watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();

  const wsClient = useMemo(() => getFMPWebSocketClient(), []);

  // WebSocket 연결 및 가격 데이터 구독
  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      try {
        // WebSocket 연결
        const status = wsClient.getConnectionStatus();

        if (!status.isConnected) {
          console.log('[StockList] Connecting to WebSocket...');
          await wsClient.connect();
        }

        if (!mounted) return;

        // 인기 종목 구독 (처음 20개만)
        const symbols = popularStocks.slice(0, 20).map(s => s.symbol);

        await wsClient.subscribe(symbols, 60000); // 1분 간격

        // 실시간 가격 콜백
        symbols.forEach(symbol => {
          wsClient.onMessage(symbol, (message) => {
            if (!mounted) return;

            const price = message.lp || message.ap || message.bp;
            if (!price) return;

            setStockPrices(prev => {
              const oldPrice = prev[symbol]?.price || price;
              const change = price - oldPrice;
              const changePercent = (change / oldPrice) * 100;

              return {
                ...prev,
                [symbol]: {
                  price,
                  change,
                  changePercent
                }
              };
            });
          });
        });

        console.log('[StockList] WebSocket setup complete');
      } catch (error) {
        console.error('[StockList] WebSocket setup failed:', error);
      }
    };

    setupWebSocket();

    return () => {
      mounted = false;
    };
  }, [wsClient]);

  // 종목 데이터 생성
  const stocks = useMemo((): StockItem[] => {
    return popularStocks.map(stock => {
      const priceData = stockPrices[stock.symbol];

      return {
        symbol: stock.symbol,
        name: stock.name,
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        changePercent: priceData?.changePercent || 0,
      };
    });
  }, [stockPrices]);

  // 검색 필터링
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;

    const query = searchQuery.toLowerCase();
    return stocks.filter(
      stock =>
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);

  const favoriteStocks = filteredStocks.filter(stock => watchlist.includes(stock.symbol));
  const displayStocks = activeTab === 'all' ? filteredStocks : favoriteStocks;
  const visibleStocks = showAll ? displayStocks : displayStocks.slice(0, 5);

  const toggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // 클릭 이벤트 전파 방지

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

        {/* 검색 입력 */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="종목 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="all" className="flex-1">
              전체 종목 ({filteredStocks.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심 종목 ({favoriteStocks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <StockListContent
              stocks={visibleStocks}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(!showAll)}
              totalCount={displayStocks.length}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onSelectStock={onSelectStock}
              selectedSymbol={selectedSymbol}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <StockListContent
              stocks={visibleStocks}
              showAll={showAll}
              onToggleShowAll={() => setShowAll(!showAll)}
              totalCount={displayStocks.length}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onSelectStock={onSelectStock}
              selectedSymbol={selectedSymbol}
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
  onToggleWatchlist: (e: React.MouseEvent, symbol: string) => void;
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

function StockListContent({
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
          <div
            key={stock.symbol}
            className={`flex items-center justify-between rounded-lg border border-border p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer ${
              selectedSymbol === stock.symbol ? 'bg-primary/10 border-primary shadow-sm' : ''
            }`}
            onClick={() => onSelectStock?.(stock.symbol)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{stock.symbol}</h3>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{stock.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {stock.price > 0 ? (
                  <>
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
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">가격 로딩 중...</span>
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
                    watchlist.includes(stock.symbol) ? 'fill-yellow-400 text-yellow-400' : ''
                  }`}
                />
              </Button>
              <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                <Link href={`/dashboard/${stock.symbol}`}>상세</Link>
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {showAll ? <ScrollArea className="h-[700px]">{content}</ScrollArea> : content}

      {totalCount > 5 && (
        <Button variant="outline" className="w-full" onClick={onToggleShowAll}>
          {showAll ? '접기' : '더보기'}
        </Button>
      )}
    </div>
  );
}
