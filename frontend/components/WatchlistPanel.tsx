import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Star, X, Bell } from 'lucide-react';
import type { Stock } from './Dashboard';

interface WatchlistPanelProps {
  watchlist: Stock[];
  onSelectStock: (stock: Stock) => void;
  onRemoveStock: (stock: Stock) => void;
  selectedStock: Stock;
}

export function WatchlistPanel({
  watchlist,
  onSelectStock,
  onRemoveStock,
  selectedStock,
}: WatchlistPanelProps) {
  const formatPrice = (price: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="space-y-3">
      {watchlist.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Star className="w-16 h-16 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">관심 종목을 추가해보세요</p>
          <p className="text-sm text-slate-500 mt-1">
            종목 정보 카드에서 별 버튼을 눌러 추가하세요
          </p>
        </div>
      ) : (
        <>
          <div className="text-slate-600 px-1 mb-2">
            {watchlist.length}개 종목 추적 중
          </div>
          <div className="space-y-2.5">
            {watchlist.map(stock => (
              <div
                key={stock.symbol}
                className={`p-4 rounded-lg border transition-all cursor-pointer active:scale-[0.98] ${
                  selectedStock.symbol === stock.symbol
                    ? 'bg-blue-50 border-blue-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                onClick={() => onSelectStock(stock)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-slate-900">{stock.symbol}</div>
                    <div className="text-slate-600">{stock.name}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveStock(stock);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 -mr-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-900 font-semibold">{formatPrice(stock.price, stock.currency)}</span>
                  <Badge
                    variant={stock.change >= 0 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {stock.change >= 0 ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button variant="outline" className="w-full gap-2 h-11">
              <Bell className="w-4 h-4" />
              알림 설정
            </Button>
            <p className="text-xs text-slate-500 text-center mt-2">
              관심 종목의 뉴스를 자동으로 추천받으세요
            </p>
          </div>
        </>
      )}
    </div>
  );
}
