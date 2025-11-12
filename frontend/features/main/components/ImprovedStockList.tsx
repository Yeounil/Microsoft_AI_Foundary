'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Star, Search, TrendingUp, TrendingDown } from 'lucide-react';
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
  price: number | null;
  change: number;
  changePercent: number;
  isLoading: boolean;
}

// 인기 종목 리스트 (Tech 20개)
const popularStocks: { symbol: string; name: string }[] = [
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
  const fmpWsClient = useRef(getFMPWebSocketClient());

  // REST API로 초기 가격 로드
  useEffect(() => {
    const loadInitialPrices = async () => {
      const symbols = popularStocks.map(s => s.symbol);

      console.log('[ImprovedStockList] Loading initial prices from REST API...');

      // 각 종목의 Quote 데이터 로드 (병렬 처리)
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          );
          const data = await response.json();

          if (data && data.length > 0) {
            const quote = data[0];
            return {
              symbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changesPercentage,
            };
          }
          return null;
        } catch (error) {
          console.error(`[ImprovedStockList] Failed to load price for ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(pricePromises);

      // 결과를 state에 저장
      const pricesMap: Record<string, any> = {};
      results.forEach((result) => {
        if (result) {
          pricesMap[result.symbol] = {
            price: result.price,
            change: result.change,
            changePercent: result.changePercent,
          };
          console.log(`[ImprovedStockList] ✅ Loaded ${result.symbol}: $${result.price}`);
        }
      });

      setStockPrices(pricesMap);
      console.log(`[ImprovedStockList] Loaded ${Object.keys(pricesMap).length} prices from REST API`);
    };

    loadInitialPrices();
  }, []);

  // WebSocket 연결 및 구독 (실시간 업데이트용)
  useEffect(() => {
    const connectAndSubscribe = async () => {
      try {
        const wsClient = fmpWsClient.current;

        console.log('[ImprovedStockList] Starting WebSocket connection for real-time updates...');

        // WebSocket 연결
        await wsClient.connect();

        // 인기 종목 구독
        const symbols = popularStocks.map(s => s.symbol);

        // 구독 전에 캔들 콜백 먼저 등록
        symbols.forEach(symbol => {
          const callback = (candle: any) => {
            console.log(`[ImprovedStockList] 📊 WebSocket update for ${symbol}: $${candle.close}`);

            setStockPrices(prev => ({
              ...prev,
              [symbol]: {
                price: candle.close,
                change: candle.close - candle.open,
                changePercent: ((candle.close - candle.open) / candle.open) * 100,
              }
            }));
          };

          wsClient.onCandle(symbol, callback);
        });

        // 구독
        await wsClient.subscribe(symbols, 60000); // 1분 간격
        console.log(`[ImprovedStockList] ✅ WebSocket subscribed to ${symbols.length} symbols (for real-time updates)`);
      } catch (error) {
        console.error('[ImprovedStockList] ❌ WebSocket connection failed:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      // Cleanup: 구독 해제
      const wsClient = fmpWsClient.current;
      const symbols = popularStocks.map(s => s.symbol);

      symbols.forEach(symbol => {
        wsClient.offCandle(symbol, () => {});
      });
      wsClient.unsubscribe(symbols);
    };
  }, []);

  // 종목 데이터 생성 - REST API 또는 WebSocket 데이터 기반
  const stocks = useMemo((): StockItem[] => {
    return popularStocks.map(stock => {
      const priceData = stockPrices[stock.symbol];

      if (priceData && priceData.price) {
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: priceData.price,
          change: priceData.change || 0,
          changePercent: priceData.changePercent || 0,
          isLoading: false,
        };
      }

      // 가격 데이터가 없으면 로딩 중
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: null,
        change: 0,
        changePercent: 0,
        isLoading: true,
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
                {stock.isLoading || stock.price === null ? (
                  <span className="text-sm text-muted-foreground animate-pulse">가격 로딩 중...</span>
                ) : (
                  <>
                    <span className="text-sm font-medium">${stock.price.toFixed(2)}</span>
                    <span
                      className={`flex items-center text-xs gap-2 ${
                        stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stock.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
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
