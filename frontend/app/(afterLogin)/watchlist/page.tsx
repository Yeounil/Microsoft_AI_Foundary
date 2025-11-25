'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStockStore } from '@/store/stock-store';
import { useAuthStore } from '@/store/auth-store';
import { Trash2, TrendingUp, TrendingDown, Search, Star, Loader2 } from 'lucide-react';

export default function WatchlistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    watchlist,
    realtimePrices,
    isWebSocketConnected,
    removeFromWatchlist,
    addToWatchlist,
    subscribeToRealtime,
    unsubscribeFromRealtime,
  } = useStockStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  // 인증 체크
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 실시간 가격 구독
  useEffect(() => {
    if (watchlist.length > 0 && isWebSocketConnected) {
      subscribeToRealtime(watchlist);
    }

    return () => {
      if (watchlist.length > 0) {
        unsubscribeFromRealtime(watchlist);
      }
    };
  }, [watchlist, isWebSocketConnected, subscribeToRealtime, unsubscribeFromRealtime]);

  // 종목 추가 핸들러
  const handleAddStock = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const symbol = searchQuery.toUpperCase().trim();

    if (!watchlist.includes(symbol)) {
      addToWatchlist(symbol);
      setSearchQuery('');
    }

    setIsSearching(false);
  };

  // 종목 제거 핸들러
  const handleRemoveStock = (symbol: string) => {
    setRemovingItems(prev => new Set(prev).add(symbol));
    removeFromWatchlist(symbol);

    setTimeout(() => {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }, 300);
  };

  // 종목 클릭 핸들러
  const handleStockClick = (symbol: string) => {
    router.push(`/dashboard/${symbol}`);
  };

  // 가격 변화 표시 컴포넌트
  const PriceChange = ({ change, changePercent }: { change: number; changePercent: number }) => {
    const isPositive = change >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-stock-up' : 'text-stock-down';

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="font-medium">
          {isPositive ? '+' : ''}{change.toFixed(2)}
        </span>
        <span className="text-sm">
          ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
    );
  };

  // 관심 종목 아이템 컴포넌트
  const WatchlistItemCard = ({ symbol }: { symbol: string }) => {
    const priceData = realtimePrices[symbol];
    const isRemoving = removingItems.has(symbol);

    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isRemoving ? 'opacity-50 scale-95' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => handleStockClick(symbol)}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{symbol}</h3>
                {priceData && (
                  <Badge variant={priceData.change >= 0 ? 'default' : 'destructive'}>
                    실시간
                  </Badge>
                )}
              </div>

              {priceData ? (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    ${priceData.price.toFixed(2)}
                  </div>
                  <PriceChange
                    change={priceData.change}
                    changePercent={priceData.change_percent}
                  />
                  <div className="text-xs text-muted-foreground">
                    거래량: {priceData.volume.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveStock(symbol);
              }}
              disabled={isRemoving}
              className="min-h-[44px] min-w-[44px] p-2"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-red-500" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-3 md:py-8 md:px-4">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">나의 관심 종목</h1>
        <p className="text-muted-foreground">
          관심 종목을 추가하고 실시간으로 가격 변화를 확인하세요
        </p>
      </div>

      {/* 종목 추가 섹션 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>종목 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="종목 심볼을 입력하세요 (예: AAPL, GOOGL)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                className="pl-9 h-11"
              />
            </div>
            <Button
              onClick={handleAddStock}
              disabled={!searchQuery.trim() || isSearching}
              className="w-full sm:w-auto min-h-[44px] whitespace-nowrap"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">추가 중...</span>
                  <span className="sm:hidden">추가 중...</span>
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">관심 종목 추가</span>
                  <span className="sm:hidden">추가</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WebSocket 연결 상태 */}
      {!isWebSocketConnected && watchlist.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>실시간 데이터 연결 중...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 관심 종목 리스트 */}
      {watchlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {watchlist.map((symbol) => (
            <WatchlistItemCard key={symbol} symbol={symbol} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              관심 종목이 없습니다
            </h3>
            <p className="text-muted-foreground mb-6">
              위의 검색창을 통해 관심 있는 종목을 추가해보세요
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('AAPL');
                  handleAddStock();
                }}
              >
                AAPL 추가
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('GOOGL');
                  handleAddStock();
                }}
              >
                GOOGL 추가
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('MSFT');
                  handleAddStock();
                }}
              >
                MSFT 추가
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}