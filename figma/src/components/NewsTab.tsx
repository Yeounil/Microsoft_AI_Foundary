import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Newspaper, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Stock } from '../App';

interface NewsTabProps {
  stock: Stock;
}

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  aiSummary?: string;
}

const generateMockNews = (stock: Stock): NewsItem[] => {
  const newsTemplates = [
    {
      title: `${stock.name}, 분기 실적 예상치 상회... 주가 ${stock.changePercent > 0 ? '상승' : '하락'}`,
      summary: `${stock.name}가 발표한 분기 실적이 시장 예상을 뛰어넘으며 투자자들의 관심을 끌고 있습니다.`,
      sentiment: stock.changePercent > 0 ? 'positive' : 'negative' as const,
    },
    {
      title: `애널리스트 "${stock.symbol} 목표가 상향 조정"`,
      summary: '주요 투자은행들이 긍정적인 전망을 내놓으며 목표주가를 상향 조정했습니다.',
      sentiment: 'positive' as const,
    },
    {
      title: `${stock.name} CEO, 신제품 라인업 발표 예정`,
      summary: '다음 주 열릴 발표회에서 혁신적인 신제품을 공개할 것으로 알려졌습니다.',
      sentiment: 'positive' as const,
    },
    {
      title: `시장 전문가 "현 시점 ${stock.symbol} 투자 전략은?"`,
      summary: '업계 전문가들이 분석한 현재 시장 상황과 투자 포인트를 정리했습니다.',
      sentiment: 'neutral' as const,
    },
    {
      title: `${stock.name}, 글로벌 시장 점유율 확대`,
      summary: '신흥 시장에서의 성장세가 두드러지며 전체 매출이 증가하고 있습니다.',
      sentiment: 'positive' as const,
    },
  ];

  return newsTemplates.map((template, index) => ({
    id: index + 1,
    ...template,
    source: ['Bloomberg', 'Reuters', 'CNBC', 'Financial Times', 'WSJ'][index],
    timestamp: `${Math.floor(Math.random() * 24)}시간 전`,
  }));
};

export function NewsTab({ stock }: NewsTabProps) {
  const [news] = useState<NewsItem[]>(generateMockNews(stock));
  const [expandedNews, setExpandedNews] = useState<number | null>(null);

  const toggleAiSummary = (newsId: number) => {
    if (expandedNews === newsId) {
      setExpandedNews(null);
    } else {
      setExpandedNews(newsId);
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-red-100 text-red-800 border-red-200">긍정</Badge>;
      case 'negative':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">부정</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">중립</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="shadow-md border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            AI 뉴스 큐레이션
          </CardTitle>
          <CardDescription>
            {stock.name}에 대한 최신 뉴스를 AI가 분석하고 요약해드립니다
          </CardDescription>
        </CardHeader>
      </Card>

      {/* News List */}
      <div className="space-y-3 sm:space-y-4">
        {news.map(item => (
          <Card key={item.id} className="shadow-md border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
                    <Newspaper className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">{item.source}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{item.timestamp}</span>
                  </div>
                  <CardTitle className="text-slate-800 mb-2">{item.title}</CardTitle>
                  <CardDescription>{item.summary}</CardDescription>
                </div>
                <div className="self-start">
                  {getSentimentBadge(item.sentiment)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                onClick={() => toggleAiSummary(item.id)}
                className="gap-2 text-secondary hover:text-secondary/80 h-auto py-2 px-3 -ml-3"
              >
                <Sparkles className="w-4 h-4" />
                AI 요약 {expandedNews === item.id ? '숨기기' : '보기'}
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    expandedNews === item.id ? 'rotate-90' : ''
                  }`}
                />
              </Button>

              {expandedNews === item.id && (
                <div className="mt-3 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-secondary mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    AI 분석 요약
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    이 뉴스는 {stock.name}의 {item.sentiment === 'positive' ? '긍정적인' : item.sentiment === 'negative' ? '부정적인' : ''} 
                    측면을 다루고 있습니다. 전문가들은 이러한 움직임이 단기적으로 주가에 
                    {item.sentiment === 'positive' ? '긍정적인' : item.sentiment === 'negative' ? '부정적인' : '중립적인'} 
                    영향을 미칠 것으로 전망하고 있습니다. 
                    {item.sentiment === 'positive' && '투자자들은 이를 매수 기회로 판단하고 있으며, '}
                    시장의 추가적인 반응을 지켜볼 필요가 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <Card className="shadow-md border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            뉴스 기반 시장 센티먼트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700">전체 뉴스 센티먼트</span>
                <span className="text-slate-900">68% 긍정적</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: '68%' }}></div>
              </div>
            </div>
            <p className="text-slate-700 p-3 bg-slate-50 rounded-lg">
              💡 최근 24시간 뉴스 분석 결과, {stock.name}에 대한 시장의 전반적인 분위기는 긍정적입니다.
              주요 애널리스트들의 평가와 실적 전망이 주가 상승을 뒷받침하고 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
