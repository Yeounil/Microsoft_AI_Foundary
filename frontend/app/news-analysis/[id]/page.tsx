'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function NewsAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Mock data - 실제로는 API에서 가져올 예정
  const newsData = {
    title: '애플, 아이폰을 위한 새로운 AI 기능 발표',
    source: 'TechCrunch',
    date: '2025년 1월 8일 15:30',
    sentiment: 'positive',
    impact: '긍정적 (주가 상승 예상)',
    relatedStocks: ['AAPL', 'NVDA', 'GOOGL'],
    aiSummary: `애플이 차세대 아이폰에 탑재될 혁신적인 AI 기능을 발표했습니다. 자연어 처리, 실시간 번역, 사진 인식 기능이 강화되어 모바일 AI 기술의 새로운 기준을 제시할 것으로 보입니다. 시장 전문가들은 이번 발표가 애플의 시장 점유율 확대에 긍정적인 영향을 미칠 것으로 전망하고 있습니다.`,
    originalContent: `애플이 차세대 아이폰에 통합될 일련의 획기적인 AI 기능을 발표했습니다. 새로운 기능에는 고급 자연어 처리, 실시간 번역, 향상된 사진 인식 기능이 포함됩니다. 회사의 CEO는 이러한 혁신이 모바일 AI 기술에서 상당한 도약을 나타내며, 소비자 전자제품의 AI 혁명에서 애플을 선두에 위치시킨다고 말했습니다. 업계 분석가들은 이러한 기능이 향후 분기에 강력한 아이폰 판매를 주도하여 경쟁적인 스마트폰 시장에서 애플의 시장 점유율을 높일 것으로 예측합니다.`,
    translatedContent: '',
  };

  const similarNews = [
    {
      id: '2',
      title: '구글, 차세대 AI 모델 공개 예정',
      source: 'Reuters',
      date: '2025년 1월 8일 14:00',
      sentiment: 'positive',
    },
    {
      id: '3',
      title: '마이크로소프트, AI 파트너십 강화',
      source: 'WSJ',
      date: '2025년 1월 8일 12:30',
      sentiment: 'positive',
    },
    {
      id: '4',
      title: 'AI 칩 수요 급증으로 반도체 업계 호황',
      source: 'Bloomberg',
      date: '2025년 1월 8일 10:15',
      sentiment: 'positive',
    },
    {
      id: '5',
      title: '엔비디아, AI 시장 선두 지위 굳건',
      source: 'CNBC',
      date: '2025년 1월 7일 16:45',
      sentiment: 'positive',
    },
    {
      id: '6',
      title: '퀄컴, 모바일 AI 칩 개발 가속화',
      source: 'TechCrunch',
      date: '2025년 1월 7일 14:20',
      sentiment: 'neutral',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/news-report/${id}`)}
          >
            관련 뉴스 AI 분석
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-sm">
                AI가 관련 뉴스를 종합적으로 분석하여 투자 인사이트를 제공합니다.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Side - Main Content */}
        <div className="space-y-6">
          {/* Article Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{newsData.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>{newsData.source}</span>
                    <span>•</span>
                    <span>{newsData.date}</span>
                  </CardDescription>
                </div>
                <Badge
                  variant={newsData.sentiment === 'positive' ? 'default' : newsData.sentiment === 'negative' ? 'destructive' : 'secondary'}
                >
                  {newsData.sentiment === 'positive' ? '긍정' : newsData.sentiment === 'negative' ? '부정' : '중립'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Impact Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>주가 영향 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">예상 영향:</span>
                <span className="text-sm text-green-600 font-medium">{newsData.impact}</span>
              </div>
              <div>
                <span className="text-sm font-medium">관련 종목:</span>
                <div className="mt-2 flex gap-2">
                  {newsData.relatedStocks.map((stock) => (
                    <Badge key={stock} variant="outline">
                      {stock}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>AI 번역 내용</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="korean">
                <TabsList className="mb-4">
                  <TabsTrigger value="korean">한국어</TabsTrigger>
                </TabsList>

                <TabsContent value="korean" className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-semibold">AI 요약</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {newsData.aiSummary}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm leading-relaxed">
                      {newsData.originalContent}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    원문 보기
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Similar News */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>유사 뉴스</CardTitle>
              <CardDescription>총 {similarNews.length}개</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {similarNews.map((news) => (
                  <Card
                    key={news.id}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => router.push(`/news-analysis/${news.id}`)}
                  >
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm line-clamp-2">{news.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {news.source} • {news.date}
                      </CardDescription>
                      <Badge
                        variant={news.sentiment === 'positive' ? 'default' : news.sentiment === 'negative' ? 'destructive' : 'secondary'}
                        className="mt-2 w-fit"
                      >
                        {news.sentiment === 'positive' ? '긍정' : news.sentiment === 'negative' ? '부정' : '중립'}
                      </Badge>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}