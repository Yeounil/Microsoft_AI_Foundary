'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { NewsArticle } from '@/types';

type Sentiment = 'positive' | 'negative' | 'neutral';

export function NewsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('hot');
  const itemsPerPage = 5;

  // Hot 뉴스 가져오기
  const { data: hotNews, isLoading: loadingHot } = useQuery({
    queryKey: ['news', 'latest', currentPage],
    queryFn: () => apiClient.getLatestNews(20),
  });

  // 관심 종목 뉴스 (인증된 경우)
  const { data: favoriteNews, isLoading: loadingFavorite } = useQuery({
    queryKey: ['news', 'personalized', currentPage],
    queryFn: () => apiClient.getPersonalizedRecommendations(10),
    enabled: false, // 로그인 상태일 때만 활성화
  });

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>뉴스</CardTitle>
        <div className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="키워드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="hot" className="flex-1">
              Hot 뉴스
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심 종목
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-0">
            <NewsListContent
              news={hotNews?.articles || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              isLoading={loadingHot}
              searchQuery={searchQuery}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <NewsListContent
              news={favoriteNews?.recommendations || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              isLoading={loadingFavorite}
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface NewsListContentProps {
  news: NewsArticle[];
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  isLoading: boolean;
  searchQuery: string;
}

function NewsListContent({
  news,
  currentPage,
  onPageChange,
  itemsPerPage,
  isLoading,
  searchQuery,
}: NewsListContentProps) {
  // 검색 필터링
  const filteredNews = searchQuery
    ? news.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : news;

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleNews = filteredNews.slice(startIndex, startIndex + itemsPerPage);

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSentimentBgColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100';
      case 'negative':
        return 'bg-red-100';
      default:
        return 'bg-muted';
    }
  };

  const getSentimentText = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '긍정';
      case 'negative':
        return '부정';
      default:
        return '중립';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-sm text-muted-foreground">뉴스를 불러오는 중...</div>
      </div>
    );
  }

  if (visibleNews.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-sm text-muted-foreground">표시할 뉴스가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visibleNews.map((item, index) => (
          <Link key={item.url || index} href={`/news-analysis/${encodeURIComponent(item.url || index)}`}>
            <Card className="cursor-pointer transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-sm leading-snug">{item.title}</CardTitle>
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${getSentimentBgColor(
                      item.sentiment
                    )}`}
                  >
                    <span className={getSentimentColor(item.sentiment)}>
                      {getSentimentIcon(item.sentiment)}
                    </span>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span>{item.source || 'Unknown'}</span>
                  <span>•</span>
                  <span>
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString('ko-KR')
                      : 'Unknown date'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                    {getSentimentText(item.sentiment)}
                  </span>
                  {item.related_stocks && item.related_stocks.length > 0 && (
                    <div className="flex gap-1">
                      {item.related_stocks.slice(0, 3).map((symbol) => (
                        <span
                          key={symbol}
                          className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}