"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TranslatedNewsContentProps {
  newsId: string;
}

// 임시 데이터 (실제로는 API에서 가져와야 함)
const mockNewsData = {
  originalTitle: 'Apple Announces New AI Features for iPhone',
  translatedTitle: '애플, 아이폰을 위한 새로운 AI 기능 발표',
  originalUrl: 'https://example.com/news/apple-ai',
  source: 'TechCrunch',
  publishedAt: '2025년 1월 8일 15:30',
  sentiment: 'positive' as 'positive' | 'negative' | 'neutral',
  originalContent: `Apple has announced a series of groundbreaking AI features that will be integrated into the next generation of iPhones. The new features include advanced natural language processing, real-time translation, and enhanced photo recognition capabilities.

The company's CEO stated that these innovations represent a significant leap forward in mobile AI technology, positioning Apple at the forefront of the AI revolution in consumer electronics.

Industry analysts predict that these features will drive strong iPhone sales in the coming quarters, potentially boosting Apple's market share in the competitive smartphone market.`,
  translatedContent: `애플이 차세대 아이폰에 통합될 일련의 획기적인 AI 기능을 발표했습니다. 새로운 기능에는 고급 자연어 처리, 실시간 번역, 향상된 사진 인식 기능이 포함됩니다.

회사의 CEO는 이러한 혁신이 모바일 AI 기술에서 상당한 도약을 나타내며, 소비자 전자제품의 AI 혁명에서 애플을 선두에 위치시킨다고 말했습니다.

업계 분석가들은 이러한 기능이 향후 분기에 강력한 아이폰 판매를 주도하여 경쟁적인 스마트폰 시장에서 애플의 시장 점유율을 높일 것으로 예측합니다.`,
  aiSummary: '애플이 차세대 아이폰에 탑재될 혁신적인 AI 기능을 발표했습니다. 자연어 처리, 실시간 번역, 사진 인식 기능이 강화되어 모바일 AI 기술의 새로운 기준을 제시할 것으로 보입니다. 시장 전문가들은 이번 발표가 애플의 시장 점유율 확대에 긍정적인 영향을 미칠 것으로 전망하고 있습니다.',
  stockImpact: '긍정적 (주가 상승 예상)',
  relatedStocks: ['AAPL', 'NVDA', 'GOOGL']
};

export function TranslatedNewsContent({ newsId }: TranslatedNewsContentProps) {
  const [newsData, setNewsData] = useState(mockNewsData);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    // TODO: API에서 뉴스 데이터 가져오기
    // const fetchNews = async () => {
    //   const data = await newsAPI.getNewsById(newsId);
    //   setNewsData(data);
    // };
    // fetchNews();
  }, [newsId]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-50 text-green-700 border-green-200">긍정</Badge>;
      case 'negative':
        return <Badge className="bg-red-50 text-red-700 border-red-200">부정</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200">중립</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 뉴스 정보 카드 */}
      <Card className="p-6 bg-white">
        <div className="space-y-4">
          {/* 제목과 메타 정보 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {getSentimentIcon(newsData.sentiment)}
              <h1 className="text-2xl font-bold text-gray-900 leading-tight flex-1">
                {newsData.translatedTitle}
              </h1>
              {getSentimentBadge(newsData.sentiment)}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">{newsData.source}</span>
              <span className="text-gray-300">|</span>
              <span>{newsData.publishedAt}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 주가 영향 분석 */}
      <Card className="p-6 bg-white">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">주가 영향 분석</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">예상 영향:</span>
            <span className="text-sm font-semibold text-green-600">{newsData.stockImpact}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">관련 종목: </span>
            <div className="flex gap-2 mt-2">
              {newsData.relatedStocks.map((stock) => (
                <Badge key={stock} variant="outline" className="font-mono">
                  {stock}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* AI 번역 내용 (AI 요약 포함) */}
      <Card className="p-6 bg-white">
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              AI 번역 내용
            </h3>
            <Badge variant="outline" className="text-xs">
              한국어
            </Badge>
          </div>

          {/* AI 요약 섹션 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h4 className="text-sm font-semibold text-blue-900">AI 요약</h4>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">
              {newsData.aiSummary}
            </p>
          </div>

          {/* 본문 내용 */}
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {showOriginal ? newsData.originalContent : newsData.translatedContent}
            </p>
          </div>

          {/* 원문 보기 버튼 */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-gray-600 hover:text-yellow-600 text-xs"
            >
              {showOriginal ? '번역 보기' : '원문 보기'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
