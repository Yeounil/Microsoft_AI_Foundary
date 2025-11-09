import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Star, Loader2 } from 'lucide-react';
import { ChartTab } from '@/components/dashboard/ChartTab';
import { DataAnalysisTab } from '@/components/dashboard/DataAnalysisTab';
import NewsSection from '@/components/main/NewsSection';
import { WatchlistPanel } from '@/components/dashboard/WatchlistPanel';
import { stockAPI, recommendationSupabaseAPI } from '@/services/api';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  market?: string;
}

const MOCK_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: '애플', price: 178.50, change: 2.35, changePercent: 1.33, currency: 'USD', market: 'us' },
  { symbol: 'TSLA', name: '테슬라', price: 242.80, change: -3.20, changePercent: -1.30, currency: 'USD', market: 'us' },
  { symbol: 'NVDA', name: '엔비디아', price: 495.20, change: 8.50, changePercent: 1.75, currency: 'USD', market: 'us' },
  { symbol: 'MSFT', name: '마이크로소프트', price: 378.90, change: 1.20, changePercent: 0.32, currency: 'USD', market: 'us' },
  { symbol: 'GOOGL', name: '구글', price: 141.30, change: -0.80, changePercent: -0.56, currency: 'USD', market: 'us' },
];

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export function Dashboard({ username, onLogout }: DashboardProps) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock>(MOCK_STOCKS[0]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingStockData, setLoadingStockData] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'analysis' | 'news'>('chart');
  const [showFloatingPanel, setShowFloatingPanel] = useState(true);

  // React 19 useTransition for async operations
  const [isPending, startTransition] = useTransition();

  // Ref to track if URL parameter was already processed
  const urlParamProcessedRef = useRef(false);

  // Handler functions (declared before useEffects that use them)
  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchQuery('');
    setWatchlistOpen(false);
  }, []);

  const loadUserInterests = useCallback(async () => {
    try {
      setLoadingWatchlist(true);
      const response = await recommendationSupabaseAPI.getUserInterests();

      // Convert interests to Stock format
      const stocks: Stock[] = [];
      for (const interest of response.interests) {
        try {
          // Detect if it's a Korean stock (ends with .KS or .KQ)
          const isKoreanStock = interest.interest.endsWith('.KS') || interest.interest.endsWith('.KQ');
          const market = isKoreanStock ? 'kr' : 'us';

          // Try to get stock data for each interest
          const stockData = await stockAPI.getStockData(interest.interest, '1d', market, '1d');

          // Calculate change and change percent
          const change = stockData.current_price - stockData.previous_close;
          const changePercent = stockData.previous_close !== 0
            ? (change / stockData.previous_close) * 100
            : 0;

          stocks.push({
            symbol: stockData.symbol,
            name: stockData.company_name,
            price: stockData.current_price,
            change: change,
            changePercent: changePercent,
            currency: stockData.currency,
            market: market
          });
        } catch (error) {
          console.error(`Failed to load stock data for ${interest.interest}:`, error);
          // Add with placeholder data if API fails
          const isKoreanStock = interest.interest.endsWith('.KS') || interest.interest.endsWith('.KQ');
          stocks.push({
            symbol: interest.interest,
            name: interest.interest,
            price: 0,
            change: 0,
            changePercent: 0,
            currency: isKoreanStock ? 'KRW' : 'USD',
            market: isKoreanStock ? 'kr' : 'us'
          });
        }
      }

      setWatchlist(stocks);
    } catch (error) {
      console.error('Failed to load user interests:', error);
    } finally {
      setLoadingWatchlist(false);
    }
  }, []);

  // Removed loadStockData to prevent infinite loop
  // Stock data is now loaded when searching/selecting stocks directly

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    startTransition(async () => {
      try {
        setSearching(true);
        const response = await stockAPI.searchStocks(searchQuery);

        // Convert search results to Stock format
        const stocks: Stock[] = response.results.map((result: any) => ({
          symbol: result.symbol,
          name: result.name || result.longName || result.symbol,
          price: result.regularMarketPrice || 0,
          change: result.regularMarketChange || 0,
          changePercent: result.regularMarketChangePercent || 0,
          currency: result.currency || 'USD',
          market: result.currency === 'KRW' ? 'kr' : 'us'
        }));

        setSearchResults(stocks);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    });
  }, [searchQuery, startTransition]);

  const handleSearchBySymbol = useCallback(async (symbol: string) => {
    try {
      setSearching(true);

      // Try search API first
      const response = await stockAPI.searchStocks(symbol);

      if (response.results && response.results.length > 0) {
        // Convert search results to Stock format
        const stocks: Stock[] = response.results.map((result: any) => ({
          symbol: result.symbol,
          name: result.name || result.longName || result.symbol,
          price: result.regularMarketPrice || 0,
          change: result.regularMarketChange || 0,
          changePercent: result.regularMarketChangePercent || 0,
          currency: result.currency || 'USD',
          market: result.currency === 'KRW' ? 'kr' : 'us'
        }));

        // Find exact match or first result
        const matchedStock = stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase()) || stocks[0];

        if (matchedStock) {
          handleSelectStock(matchedStock);
        }
      } else {
        // Search failed, try to load stock data directly
        try {
          const stockData = await stockAPI.getStockData(symbol, '1d', 'us', '1d');

          const change = stockData.current_price - stockData.previous_close;
          const changePercent = stockData.previous_close !== 0
            ? (change / stockData.previous_close) * 100
            : 0;

          const stock: Stock = {
            symbol: stockData.symbol,
            name: stockData.company_name,
            price: stockData.current_price,
            change: change,
            changePercent: changePercent,
            currency: stockData.currency,
            market: 'us'
          };

          handleSelectStock(stock);
        } catch (directError) {
          console.error('Failed to load stock data:', directError);
        }
      }
    } catch (error) {
      console.error('Symbol search failed:', error);
    } finally {
      setSearching(false);
    }
  }, [handleSelectStock]);

  const toggleWatchlist = useCallback(async (stock: Stock) => {
    const exists = watchlist.find(s => s.symbol === stock.symbol);

    try {
      if (exists) {
        // Remove from database
        await recommendationSupabaseAPI.removeUserInterestBySymbol(stock.symbol);

        // Update local state
        setWatchlist(prev => prev.filter(s => s.symbol !== stock.symbol));
      } else {
        // Add to database
        await recommendationSupabaseAPI.addUserInterest({ interest: stock.symbol });

        // Update local state
        setWatchlist(prev => [...prev, stock]);
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
      // Optionally show error to user
      alert(exists ? '관심 종목 삭제에 실패했습니다.' : '관심 종목 추가에 실패했습니다.');
    }
  }, [watchlist]);

  const isInWatchlist = useCallback((stock: Stock) => {
    return watchlist.some(s => s.symbol === stock.symbol);
  }, [watchlist]);

  const formatPrice = useCallback((price: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  }, []);

  const formatChange = useCallback((change: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${Math.abs(change).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${Math.abs(change).toFixed(2)}`;
  }, []);

  // Load stock from URL parameter (only once on mount)
  useEffect(() => {
    // Only run once on mount
    if (urlParamProcessedRef.current) {
      return;
    }

    const processUrlParam = () => {
      // TradingView widget uses 'tvwidgetsymbol' parameter
      const tvSymbol = searchParams.get('tvwidgetsymbol');
      const symbolParam = searchParams.get('symbol');

      const paramToUse = tvSymbol || symbolParam;

      if (paramToUse) {
        urlParamProcessedRef.current = true;

        // Decode URL-encoded parameter (e.g., "NASDAQ%3AGOOGL" -> "NASDAQ:GOOGL")
        const decodedSymbol = decodeURIComponent(paramToUse);

        // TradingView format: "NASDAQ:AAPL" -> extract "AAPL"
        const symbol = decodedSymbol.includes(':') ? decodedSymbol.split(':')[1] : decodedSymbol;

        // Use handleSearchBySymbol to avoid code duplication
        handleSearchBySymbol(symbol);
      }
    };

    processUrlParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - run only once on mount

  // Load user interests from DB on mount
  useEffect(() => {
    loadUserInterests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load detailed stock data when selected stock changes
  // Removed to prevent infinite loop - stock data is loaded when stock is selected

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Watchlist Sheet */}
      <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
              관심 종목
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <WatchlistPanel
              watchlist={watchlist}
              onSelectStock={handleSelectStock}
              onRemoveStock={toggleWatchlist}
              selectedStock={selectedStock}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      {activeTab !== 'chart' ? (
      <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
        {/* Search Bar */}
        <Card className="shadow-md border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">종목 검색</h2>
              <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Star className="w-4 h-4" />
                    <span className="hidden sm:inline">관심 종목</span>
                    <Badge variant="secondary" className="ml-1">{watchlist.length}</Badge>
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="종목 검색 (예: 애플, AAPL)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="pl-10 bg-white shadow-sm h-11"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="shadow-sm h-11 px-6 bg-primary hover:bg-primary/90 text-secondary"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      검색 중...
                    </>
                  ) : (
                    '검색'
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card className="absolute z-30 w-full mt-2 shadow-xl max-h-80 overflow-y-auto">
                  <CardContent className="p-2">
                    {searchResults.map(stock => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleSelectStock(stock)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100 cursor-pointer"
                      >
                        <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900">{stock.symbol}</span>
                          <span className="text-slate-600">{stock.name}</span>
                        </div>
                        <div className="text-slate-500">{formatPrice(stock.price, stock.currency)}</div>
                      </div>
                      <Badge variant={stock.change >= 0 ? 'default' : 'destructive'} className="bg-red-500">
                        {stock.change >= 0 ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Current Stock Info */}
        <Card className="shadow-md border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-slate-800 mb-1">{selectedStock.symbol}</CardTitle>
                <CardDescription>{selectedStock.name}</CardDescription>
              </div>
              <Button
                variant={isInWatchlist(selectedStock) ? 'default' : 'outline'}
                onClick={() => toggleWatchlist(selectedStock)}
                size="sm"
                className={`gap-2 ml-2 ${isInWatchlist(selectedStock) ? 'bg-primary hover:bg-primary/90 text-secondary' : ''}`}
              >
                <Star
                  className="w-4 h-4"
                  fill={isInWatchlist(selectedStock) ? 'currentColor' : 'none'}
                />
                <span className="hidden sm:inline">
                  {isInWatchlist(selectedStock) ? '관심 종목' : '추가'}
                </span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingStockData ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                <span className="text-slate-600">주식 데이터를 불러오는 중...</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl text-slate-900 font-semibold">{formatPrice(selectedStock.price, selectedStock.currency)}</span>
                <Badge
                  className={selectedStock.change >= 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                >
                  {selectedStock.change >= 0 ? '+' : '-'}{formatChange(selectedStock.change, selectedStock.currency)} (
                  {selectedStock.change >= 0 ? '+' : ''}
                  {selectedStock.changePercent.toFixed(2)}%)
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis and News Content */}
        <div className="space-y-4">
          {activeTab === 'analysis' && (
            <DataAnalysisTab stock={selectedStock} />
          )}
          {activeTab === 'news' && (
            <NewsSection selectedSymbol={selectedStock.symbol} selectedMarket={selectedStock.market || 'us'} />
          )}
        </div>
      </div>
      ) : (
      /* Chart Fullscreen */
      <ChartTab stock={selectedStock} market={selectedStock.market || 'us'} />
      )}

      {/* Fixed Floating Button Panel */}
      {showFloatingPanel && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => setActiveTab('chart')}
            className="bg-primary hover:bg-primary/90 text-secondary shadow-lg h-14 px-5 flex items-center gap-2 rounded-full"
          >
            <span className="text-xl">📊</span>
            <span className="hidden sm:inline">차트</span>
          </Button>
          <Button
            onClick={() => setActiveTab('analysis')}
            className="bg-primary hover:bg-primary/90 text-secondary shadow-lg h-14 px-5 flex items-center gap-2 rounded-full"
          >
            <span className="text-xl">📈</span>
            <span className="hidden sm:inline">분석</span>
          </Button>
          <Button
            onClick={() => setActiveTab('news')}
            className="bg-primary hover:bg-primary/90 text-secondary shadow-lg h-14 px-5 flex items-center gap-2 rounded-full"
          >
            <span className="text-xl">📰</span>
            <span className="hidden sm:inline">뉴스</span>
          </Button>
          <Button
            onClick={() => setShowFloatingPanel(false)}
            variant="outline"
            className="shadow-lg h-14 px-5 flex items-center justify-center rounded-full"
            title="패널 숨기기"
          >
            <span className="text-xl">✕</span>
          </Button>
        </div>
      )}

      {/* Show Panel Button (when hidden) */}
      {!showFloatingPanel && (
        <button
          onClick={() => setShowFloatingPanel(true)}
          className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-secondary shadow-lg h-14 w-14 rounded-full flex items-center justify-center text-xl transition-all cursor-pointer"
          title="패널 표시"
        >
          ▲
        </button>
      )}
    </div>
  );
}
