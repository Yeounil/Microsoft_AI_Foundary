"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RelatedNewsListProps {
  newsId: string;
}

interface RelatedNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url: string;
}

// 임시 데이터 (실제로는 API에서 가져와야 함)
const mockRelatedNews: RelatedNewsItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `related-${i + 1}`,
  title: `애플 관련 뉴스 ${i + 1}: AI 기술 혁신이 가져올 변화`,
  summary: `애플의 새로운 AI 기술이 스마트폰 시장에 미칠 영향을 분석한 ${i + 1}번째 기사입니다. 업계 전문가들의 다양한 의견을 담고 있습니다.`,
  source: ['TechCrunch', 'The Verge', 'Reuters', '한국경제', '매일경제'][i % 5],
  publishedAt: `${(i % 24) + 1}시간 전`,
  sentiment: (['positive', 'negative', 'neutral'] as const)[i % 3],
  url: `https://example.com/news/${i + 1}`
}));

export function RelatedNewsList({ newsId }: RelatedNewsListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [relatedNews, setRelatedNews] = useState<RelatedNewsItem[]>(mockRelatedNews);
  const newsPerPage = 5;

  const totalPages = Math.ceil(relatedNews.length / newsPerPage);
  const startIndex = (currentPage - 1) * newsPerPage;
  const displayedNews = relatedNews.slice(startIndex, startIndex + newsPerPage);

  useEffect(() => {
    // TODO: API에서 유사 뉴스 가져오기
    // const fetchRelatedNews = async () => {
    //   const data = await newsAPI.getRelatedNews(newsId, 20);
    //   setRelatedNews(data);
    // };
    // fetchRelatedNews();
  }, [newsId]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 text-xs">긍정</Badge>;
      case 'negative':
        return <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50 text-xs">부정</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50 text-xs">중립</Badge>;
    }
  };

  const handleNewsClick = (newsItem: RelatedNewsItem) => {
    router.push(`/news-analysis/${newsItem.id}`);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">유사 뉴스</h2>
          <Badge variant="outline" className="font-semibold">
            총 {relatedNews.length}개
          </Badge>
        </div>
      </Card>

      {/* 뉴스 목록 */}
      <div className="space-y-2">
        {displayedNews.map((news, index) => (
          <Card
            key={news.id}
            className="p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white"
            onClick={() => handleNewsClick(news)}
          >
            <div className="space-y-3">
              {/* 뉴스 번호와 감성 */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                  {startIndex + index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getSentimentIcon(news.sentiment)}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed flex-1">
                      {news.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {news.summary}
                  </p>
                </div>
                {getSentimentBadge(news.sentiment)}
              </div>

              {/* 메타 정보 */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="font-medium">{news.source}</span>
                <span className="text-gray-300">|</span>
                <span>{news.publishedAt}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Card className="p-3 bg-white">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 border-gray-300 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 border-gray-300 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
