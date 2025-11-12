'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// 기본 표시할 인기 종목 (watchlist가 비어있을 때)
const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'META', 'AMZN', 'NFLX'];

interface StockListProps {
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

export function StockList({ onSelectStock, selectedSymbol }: StockListProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [localRealtimePrices, setLocalRealtimePrices] = useState<Record<string, any>>({});

  const { watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();
  const fmpWsClient = useRef(getFMPWebSocketClient());

  // REST API로 초기 가격 로드
  useEffect(() => {
    const loadInitialPrices = async () => {
      const symbolsToLoad = watchlist.length > 0
        ? [...new Set([...watchlist, ...DEFAULT_SYMBOLS])]
        : DEFAULT_SYMBOLS;

      console.log('[StockList] Loading initial prices from REST API...');

      // 각 종목의 Quote 데이터 로드 (병렬 처리)
      const pricePromises = symbolsToLoad.map(async (symbol) => {
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
              volume: quote.volume,
            };
          }
          return null;
        } catch (error) {
          console.error(`[StockList] Failed to load price for ${symbol}:`, error);
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
            change_percent: result.changePercent,
            volume: result.volume,
          };
          console.log(`[StockList] ✅ Loaded ${result.symbol}: $${result.price}`);
        }
      });

      setLocalRealtimePrices(pricesMap);
      console.log(`[StockList] Loaded ${Object.keys(pricesMap).length} prices from REST API`);
    };

    loadInitialPrices();
  }, [watchlist]);

  // WebSocket 연결 및 구독 (실시간 업데이트용)
  useEffect(() => {
    const connectAndSubscribe = async () => {
      try {
        const wsClient = fmpWsClient.current;

        console.log('[StockList] Starting WebSocket connection for real-time updates...');

        // WebSocket 연결
        await wsClient.connect();

        // watchlist가 있으면 watchlist 종목, 없으면 기본 종목 구독
        const symbolsToSubscribe = watchlist.length > 0
          ? [...new Set([...watchlist, ...DEFAULT_SYMBOLS])]
          : DEFAULT_SYMBOLS;

        // 구독 전에 캔들 콜백 먼저 등록
        symbolsToSubscribe.forEach(symbol => {
          const callback = (candle: any) => {
            console.log(`[StockList] 📊 WebSocket update for ${symbol}: $${candle.close}`);

            setLocalRealtimePrices(prev => ({
              ...prev,
              [symbol]: {
                price: candle.close,
                change: candle.close - candle.open,
                change_percent: ((candle.close - candle.open) / candle.open) * 100,
                volume: candle.volume || 0,
              }
            }));
          };

          wsClient.onCandle(symbol, callback);
        });

        // 구독
        await wsClient.subscribe(symbolsToSubscribe, 60000); // 1분 간격
        console.log(`[StockList] ✅ WebSocket subscribed to ${symbolsToSubscribe.length} symbols (for real-time updates)`);
      } catch (error) {
        console.error('[StockList] ❌ WebSocket connection failed:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      // Cleanup: 구독 해제
      const wsClient = fmpWsClient.current;
      const symbolsToUnsubscribe = watchlist.length > 0
        ? [...new Set([...watchlist, ...DEFAULT_SYMBOLS])]
        : DEFAULT_SYMBOLS;

      symbolsToUnsubscribe.forEach(symbol => {
        wsClient.offCandle(symbol, () => {});
      });
      wsClient.unsubscribe(symbolsToUnsubscribe);
    };
  }, [watchlist]);

  // 실시간 가격 업데이트 반영 - WebSocket 데이터 기반
  const stocks = useMemo(() => {
    // WebSocket에서 받은 종목들을 StockItem으로 변환
    const symbolsToShow = watchlist.length > 0
      ? [...new Set([...watchlist, ...DEFAULT_SYMBOLS])] // watchlist + 기본 종목
      : DEFAULT_SYMBOLS; // 기본 종목만

    return symbolsToShow.map(symbol => {
      const realtimeData = localRealtimePrices[symbol];

      if (realtimeData && realtimeData.price) {
        return {
          symbol: symbol,
          name: symbol, // TODO: 회사명 매핑 추가 필요
          price: realtimeData.price,
          change: realtimeData.change || 0,
          changePercent: realtimeData.change_percent || 0,
          isLoading: false,
        };
      }

      // WebSocket 데이터가 없으면 로딩 중
      return {
        symbol: symbol,
        name: symbol,
        price: null,
        change: 0,
        changePercent: 0,
        isLoading: true,
      };
    });
  }, [localRealtimePrices, watchlist]);

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
              onSelectStock={onSelectStock}
              selectedSymbol={selectedSymbol}
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
  onToggleWatchlist: (symbol: string) => void;
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
      {stocks.map((stock) => (
        <div
          key={stock.symbol}
          className={`flex items-center justify-between rounded-lg border border-border p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm cursor-pointer ${
            selectedSymbol === stock.symbol ? 'bg-primary/10 border-primary shadow-sm' : ''
          }`}
          onClick={() => onSelectStock?.(stock.symbol)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{stock.name}</h3>
              <span className="text-xs text-muted-foreground">{stock.symbol}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {stock.isLoading || stock.price === null ? (
                <span className="text-sm text-muted-foreground animate-pulse">가격 로딩 중...</span>
              ) : (
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
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleWatchlist(stock.symbol)}
              className="h-8 w-8 p-0 cursor-pointer"
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
      {showAll ? <ScrollArea className="h-[700px]">{content}</ScrollArea> : content}

      {totalCount > 5 && (
        <Button variant="outline" className="w-full" onClick={onToggleShowAll}>
          {showAll ? '접기' : '더보기'}
        </Button>
      )}
    </div>
  );
}