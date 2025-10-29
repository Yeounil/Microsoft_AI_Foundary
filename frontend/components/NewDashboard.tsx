"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, TrendingUp, Star, LogOut } from 'lucide-react';
import { ChartTab } from '@/components/ChartTab';
import { DataAnalysisTab } from '@/components/DataAnalysisTab';
import { NewsTab } from '@/components/NewsTab';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import type { Stock } from '@/components/Dashboard';

const MOCK_STOCKS: Stock[] = [
  { symbol: 'AAPL', name: '애플', price: 178.50, change: 2.35, changePercent: 1.33 },
  { symbol: 'TSLA', name: '테슬라', price: 242.80, change: -3.20, changePercent: -1.30 },
  { symbol: 'NVDA', name: '엔비디아', price: 495.20, change: 8.50, changePercent: 1.75 },
  { symbol: 'MSFT', name: '마이크로소프트', price: 378.90, change: 1.20, changePercent: 0.32 },
  { symbol: 'GOOGL', name: '구글', price: 141.30, change: -0.80, changePercent: -0.56 },
];

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export function NewDashboard({ username, onLogout }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock>(MOCK_STOCKS[0]);
  const [watchlist, setWatchlist] = useState<Stock[]>([MOCK_STOCKS[0], MOCK_STOCKS[2]]);
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const results = MOCK_STOCKS.filter(
        stock =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.includes(searchQuery)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchQuery('');
    setWatchlistOpen(false);
  };

  const toggleWatchlist = (stock: Stock) => {
    setWatchlist(prev => {
      const exists = prev.find(s => s.symbol === stock.symbol);
      if (exists) {
        return prev.filter(s => s.symbol !== stock.symbol);
      } else {
        return [...prev, stock];
      }
    });
  };

  const isInWatchlist = (stock: Stock) => {
    return watchlist.some(s => s.symbol === stock.symbol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-safe">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-slate-800">I NEED RED</h1>
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
                className="shadow-sm h-11 px-6 bg-primary hover:bg-primary/90 text-secondary"
              >
                검색
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
                        <div className="text-slate-500">${stock.price.toFixed(2)}</div>
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
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-slate-900">${selectedStock.price.toFixed(2)}</span>
              <Badge
                className={selectedStock.change >= 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
              >
                {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change.toFixed(2)} (
                {selectedStock.change >= 0 ? '+' : ''}
                {selectedStock.changePercent.toFixed(2)}%)
              </Badge>
            </div>
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
            <ChartTab stock={selectedStock} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-4">
            <DataAnalysisTab stock={selectedStock} />
          </TabsContent>

          <TabsContent value="news" className="mt-4">
            <NewsTab stock={selectedStock} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
