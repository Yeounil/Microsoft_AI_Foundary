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
import apiClient from '@/lib/api-client';

interface StockItem {
  symbol: string;
  name: string;
  price: number | null;
  change: number;
  changePercent: number;
  isLoading: boolean;
}

interface StockListProps {
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

export function ImprovedStockList({ onSelectStock, selectedSymbol }: StockListProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStocks, setAllStocks] = useState<{ symbol: string; name: string; marketCap: number }[]>([]);
  const [stockPrices, setStockPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  const { watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();
  const fmpWsClient = useRef(getFMPWebSocketClient());

  // 1. 모든 종목 리스트 로드 (백엔드에서)
  useEffect(() => {
    const loadAllStocks = async () => {
      try {
        console.log('[ImprovedStockList] Loading all tradable stocks from backend...');
        const response = await apiClient.getAllTradableStocks(1000000000, 100);

        if (response.stocks && Array.isArray(response.stocks)) {
          const stocks = response.stocks.map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.name,
            marketCap: stock.marketCap || 0,
          }));
          setAllStocks(stocks);
          console.log(`[ImprovedStockList] ✅ Loaded ${response.stocks.length} stocks`);

          // 첫 번째 종목을 자동으로 선택
          if (stocks.length > 0 && onSelectStock && !selectedSymbol) {
            onSelectStock(stocks[0].symbol);
            console.log(`[ImprovedStockList] Auto-selected first stock: ${stocks[0].symbol}`);
          }
        }
        setIsLoadingStocks(false);
      } catch (error) {
        console.error('[ImprovedStockList] Failed to load stocks:', error);
        setIsLoadingStocks(false);
      }
    };

    loadAllStocks();
  }, []);

  // 2. 시가총액 상위 100개의 가격 로드 (배치 조회)
  useEffect(() => {
    if (allStocks.length === 0) return;

    const loadPrices = async () => {
      try {
        // 시가총액 상위 100개 (또는 전체)
        const topSymbols = allStocks.slice(0, 100).map(s => s.symbol);

        console.log('[ImprovedStockList] Loading prices for top 100 stocks via backend...');
        const response = await apiClient.getBatchQuotes(topSymbols);

        if (response.quotes && Array.isArray(response.quotes)) {
          const pricesMap: Record<string, any> = {};
          response.quotes.forEach((quote: any) => {
            pricesMap[quote.symbol] = {
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
            };
          });

          setStockPrices(pricesMap);
          console.log(`[ImprovedStockList] ✅ Loaded ${response.quotes.length} prices`);
        }
      } catch (error) {
        console.error('[ImprovedStockList] Failed to load prices:', error);
      }
    };

    loadPrices();
  }, [allStocks]);

  // 3. WebSocket 구독 (상위 20개만 실시간 업데이트)
  useEffect(() => {
    if (allStocks.length === 0) return;

    const connectAndSubscribe = async () => {
      try {
        const wsClient = fmpWsClient.current;

        console.log('[ImprovedStockList] Starting WebSocket connection for real-time updates...');

        // WebSocket 연결
        await wsClient.connect();

        // 상위 20개만 실시간 구독
        const topSymbols = allStocks.slice(0, 20).map(s => s.symbol);

        // 구독 전에 캔들 콜백 먼저 등록
        topSymbols.forEach(symbol => {
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
        await wsClient.subscribe(topSymbols, 60000); // 1분 간격
        console.log(`[ImprovedStockList] ✅ WebSocket subscribed to ${topSymbols.length} symbols (for real-time updates)`);
      } catch (error) {
        console.error('[ImprovedStockList] ❌ WebSocket connection failed:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      // Cleanup: 구독 해제
      const wsClient = fmpWsClient.current;
      const topSymbols = allStocks.slice(0, 20).map(s => s.symbol);

      topSymbols.forEach(symbol => {
        wsClient.offCandle(symbol, () => {});
      });
      wsClient.unsubscribe(topSymbols);
    };
  }, [allStocks]);

  // 종목 데이터 생성 - REST API 또는 WebSocket 데이터 기반
  const stocks = useMemo((): StockItem[] => {
    return allStocks.map(stock => {
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

      // 가격 데이터가 없으면 로딩 중 (상위 100개 밖의 종목)
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: null,
        change: 0,
        changePercent: 0,
        isLoading: true,
      };
    });
  }, [allStocks, stockPrices]);

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
            disabled={isLoadingStocks}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingStocks ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground animate-pulse">종목 리스트 로딩 중...</div>
          </div>
        ) : (
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
        )}
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
