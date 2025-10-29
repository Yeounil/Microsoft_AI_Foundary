import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import type { Stock } from '../App';

interface ChartTabProps {
  stock: Stock;
}

const generateMockData = (basePrice: number, days: number) => {
  const data = [];
  let price = basePrice;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    price = price * (1 + (Math.random() - 0.48) * 0.03);
    
    data.push({
      date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000 + 10000000),
    });
  }
  
  return data;
};

export function ChartTab({ stock }: ChartTabProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');

  const getDaysFromRange = (range: string) => {
    switch (range) {
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '1Y': return 365;
      default: return 30;
    }
  };

  const chartData = generateMockData(stock.price, getDaysFromRange(timeRange));

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
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
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
