import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Search, Star, LogOut, Loader2 } from 'lucide-react';
import { ChartTab } from './ChartTab';
import { DataAnalysisTab } from './DataAnalysisTab';
import NewsSection from './NewsSection';
import { WatchlistPanel } from './WatchlistPanel';
import { stockAPI, recommendationSupabaseAPI } from '@/services/api';
import Image from 'next/image';
import myLogo from '@/assets/myLogo.png';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock>(MOCK_STOCKS[0]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingStockData, setLoadingStockData] = useState(false);

  // Load user interests from DB on mount
  useEffect(() => {
    loadUserInterests();
    // Load initial stock data
    if (selectedStock.symbol) {
      loadStockData(selectedStock);
    }
  }, []);

  // Load detailed stock data when selected stock changes
  useEffect(() => {
    if (selectedStock.symbol) {
      loadStockData(selectedStock);
    }
  }, [selectedStock.symbol]);

  const loadUserInterests = async () => {
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
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

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
  };

  const loadStockData = async (stock: Stock) => {
    try {
      setLoadingStockData(true);

      // Detect market from symbol
      const isKoreanStock = stock.symbol.endsWith('.KS') || stock.symbol.endsWith('.KQ');
      const market = stock.market || (isKoreanStock ? 'kr' : 'us');

      // Fetch detailed stock data
      const stockData = await stockAPI.getStockData(stock.symbol, '1d', market, '1d');

      // Calculate change and change percent
      const change = stockData.current_price - stockData.previous_close;
      const changePercent = stockData.previous_close !== 0
        ? (change / stockData.previous_close) * 100
        : 0;

      // Update selected stock with real data
      setSelectedStock({
        symbol: stockData.symbol,
        name: stockData.company_name,
        price: stockData.current_price,
        change: change,
        changePercent: changePercent,
        currency: stockData.currency,
        market: market
      });
    } catch (error) {
      console.error('Failed to load stock data:', error);
      // Keep the existing stock data if fetch fails
    } finally {
      setLoadingStockData(false);
    }
  };

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchQuery('');
    setWatchlistOpen(false);
    // Stock data will be loaded by useEffect
  };

  const toggleWatchlist = async (stock: Stock) => {
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
  };

  const isInWatchlist = (stock: Stock) => {
    return watchlist.some(s => s.symbol === stock.symbol);
  };

  const formatPrice = (price: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${Math.abs(change).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${Math.abs(change).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-safe">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image
                src={myLogo}
                alt="I NEED RED Logo"
                width={120}
                height={48}
                priority
                className="object-contain"
              />
              <div>
                <p className="text-xs text-slate-600">{username}님 환영합니다</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Star className="w-4 h-4" />
                    <span className="hidden sm:inline">관심 종목</span>
                    <Badge variant="secondary" className="ml-1">{watchlist.length}</Badge>
                  </Button>
                </SheetTrigger>
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
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
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors active:bg-slate-100"
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
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
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

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-white shadow-sm h-12">
            <TabsTrigger value="chart" className="text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-secondary">차트</TabsTrigger>
            <TabsTrigger value="analysis" className="text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-secondary">분석</TabsTrigger>
            <TabsTrigger value="news" className="text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-secondary">뉴스</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <ChartTab stock={selectedStock} market={selectedStock.market || 'us'} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-4">
            <DataAnalysisTab stock={selectedStock} />
          </TabsContent>

          <TabsContent value="news" className="mt-4">
            <NewsSection selectedSymbol={selectedStock.symbol} selectedMarket={selectedStock.market || 'us'} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
