import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import type { Stock } from '@/components/dashboard/Dashboard';

interface DataAnalysisTabProps {
  stock: Stock;
}

export function DataAnalysisTab({ stock }: DataAnalysisTabProps) {
  // Generate deterministic values based on stock symbol to avoid hydration errors
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const seed = hashCode(stock.symbol);
  const aiScore = (seed % 30) + 60;
  const sentiment = stock.changePercent > 1 ? 'positive' : stock.changePercent < -1 ? 'negative' : 'neutral';

  const formatPrice = (price: number, currency?: string) => {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const metrics = [
    { label: 'AI 투자 점수', value: aiScore, max: 100 },
    { label: '시장 센티먼트', value: sentiment === 'positive' ? 75 : sentiment === 'negative' ? 35 : 55, max: 100 },
    { label: '변동성 지수', value: ((seed * 7) % 40) + 30, max: 100 },
    { label: '유동성 점수', value: ((seed * 13) % 25) + 65, max: 100 },
  ];

  const fundamentals = [
    { label: '시가총액', value: stock.currency === 'KRW' ? '₩364조' : '$2.8T' },
    { label: 'P/E 비율', value: '28.5' },
    { label: '52주 최고가', value: formatPrice(stock.price * 1.15, stock.currency) },
    { label: '52주 최저가', value: formatPrice(stock.price * 0.82, stock.currency) },
    { label: '평균 거래량', value: '58.2M' },
    { label: '배당 수익률', value: '0.52%' },
  ];

  return (
    <div className="grid gap-4">
      {/* AI Analysis Score */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            AI 종합 분석
          </CardTitle>
          <CardDescription className="hidden sm:block">머신러닝 기반 투자 적합도 평가</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-5">
            {metrics.map((metric, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700">{metric.label}</span>
                  <span className="text-slate-900">{metric.value}/100</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-300">
            <div className="flex items-start gap-3">
              {sentiment === 'positive' ? (
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mt-0.5 flex-shrink-0" />
              ) : sentiment === 'negative' ? (
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h4 className="text-secondary mb-1">AI 추천</h4>
                <p className="text-slate-700">
                  {sentiment === 'positive' && '현재 상승 모멘텀이 강하며, 단기 투자에 적합한 시점입니다.'}
                  {sentiment === 'negative' && '단기적으로 하락 압력이 있으나, 장기 관점에서 매수 기회가 될 수 있습니다.'}
                  {sentiment === 'neutral' && '횡보 구간으로 추가 신호를 기다리는 것을 권장합니다.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fundamental Data */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            기본 데이터
          </CardTitle>
          <CardDescription className="hidden sm:block">주요 재무 및 시장 지표</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fundamentals.map((item, index) => (
              <div key={index} className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                <div className="text-slate-600 mb-1">{item.label}</div>
                <div className="text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle>리스크 분석</CardTitle>
          <CardDescription className="hidden sm:block">AI 기반 위험 요소 평가</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-slate-700">시장 리스크</span>
              <Badge variant="outline" className="bg-white">낮음</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-slate-700">변동성 리스크</span>
              <Badge variant="outline" className="bg-white">보통</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-slate-700">유동성 리스크</span>
              <Badge variant="outline" className="bg-white">낮음</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
