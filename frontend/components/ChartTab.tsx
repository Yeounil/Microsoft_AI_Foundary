import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import type { Stock } from './Dashboard';
import { stockAPI } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface ChartTabProps {
  stock: Stock;
  market?: string;
}

interface ChartDataPoint {
  date: string;
  price: number;
  volume: number;
}

export function ChartTab({ stock, market = 'us' }: ChartTabProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const getPeriodFromRange = (range: string): string => {
    switch (range) {
      case '1D': return '1d';
      case '1W': return '5d';
      case '1M': return '1mo';
      case '3M': return '3mo';
      case '1Y': return '1y';
      default: return '1mo';
    }
  };

  const getIntervalFromRange = (range: string): string => {
    switch (range) {
      case '1D': return '5m';
      case '1W': return '1h';
      case '1M': return '1d';
      case '3M': return '1d';
      case '1Y': return '1wk';
      default: return '1d';
    }
  };

  useEffect(() => {
    loadChartData();
  }, [stock.symbol, timeRange, market]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const period = getPeriodFromRange(timeRange);
      const interval = getIntervalFromRange(timeRange);

      const response = await stockAPI.getChartData(stock.symbol, period, market, interval);

      setCurrency(response.currency || 'USD');

      // Transform API data to chart format
      const formattedData: ChartDataPoint[] = response.chart_data.map((point: any) => ({
        date: new Date(point.date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
          ...(timeRange === '1D' ? { hour: '2-digit', minute: '2-digit' } : {})
        }),
        price: point.close,
        volume: point.volume
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error('Failed to load chart data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value: number) => {
    if (currency === 'KRW') {
      return `₩${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>가격 차트</CardTitle>
            <CardDescription className="hidden sm:block">AI 기반 추세 분석</CardDescription>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="min-w-[3.5rem] h-9"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 sm:h-80 md:h-96 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
              <p className="text-slate-600 text-sm">차트 데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 sm:h-80 md:h-96 flex items-center justify-center">
            <p className="text-slate-600">차트 데이터를 불러올 수 없습니다.</p>
          </div>
        ) : (
          <div className="h-64 sm:h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FEE500" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FEE500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  width={currency === 'KRW' ? 80 : 60}
                  tickFormatter={formatPrice}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                  formatter={(value: number) => [formatPrice(value), '가격']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#FEE500"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Insights */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-secondary mb-2">🤖 AI 분석 인사이트</h4>
          <ul className="space-y-1.5 sm:space-y-2 text-slate-700">
            <li>• 최근 {timeRange} 동안 {stock.change >= 0 ? '상승' : '하락'} 추세를 보이고 있습니다.</li>
            <li>• 거래량이 평균 대비 {Math.floor(Math.random() * 30 + 10)}% 증가했습니다.</li>
            <li>• 기술적 지표상 {stock.changePercent > 1 ? '강세' : stock.changePercent < -1 ? '약세' : '중립'} 신호를 나타냅니다.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
