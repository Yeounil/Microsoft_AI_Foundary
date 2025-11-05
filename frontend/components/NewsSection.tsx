'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Newspaper,
  Clock,
  TrendingUp,
  RefreshCw,
  Brain,
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { newsAPI } from '@/services/api';
import { NewsArticle, NewsSummary } from '@/types/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NewsSectionProps {
  selectedSymbol?: string;
  selectedMarket?: string;
}

export default function NewsSection({ selectedSymbol, selectedMarket }: NewsSectionProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [crawlingLoading, setCrawlingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [articleSummaries, setArticleSummaries] = useState<{ [key: number]: string }>({});
  const [loadingArticleSummary, setLoadingArticleSummary] = useState<number | null>(null);

  // React 19 useTransition for async AI operations
  const [isAnalysisPending, startAnalysisTransition] = useTransition();
  const [isSummaryPending, startSummaryTransition] = useTransition();

  useEffect(() => {
    if (selectedSymbol) {
      fetchStockNews();
    } else {
      fetchGeneralNews();
    }
  }, [selectedSymbol, selectedMarket]);

  const fetchGeneralNews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await newsAPI.getFinancialNews('finance', 10, 'en');
      setNews(response.articles);
    } catch (err: any) {
      setError('뉴스를 가져오는 중 오류가 발생했습니다.');
      console.error('뉴스 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStockNews = useCallback(async () => {
    if (!selectedSymbol) return;

    setLoading(true);
    setError('');

    try {
      // 먼저 기존 DB에서 많은 뉴스를 가져오기
      const response = await newsAPI.getStockNews(selectedSymbol, 20, false);
      console.log(`[DEBUG] ${selectedSymbol} 뉴스 로딩:`, response.articles.length, '개');

      // 소스별 분포 로그
      const sourceCount = response.articles.reduce((acc: any, article: any) => {
        const source = article.api_source || article.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      console.log('[DEBUG] 뉴스 소스 분포:', sourceCount);

      setNews(response.articles);

      // 뉴스가 부족한 경우 자동으로 크롤링 (백엔드에서 자동 처리됨)
      if (response.articles.length < 10) {
        console.log('[DEBUG] 뉴스가 부족하여 자동 크롤링 시도...');
        // 백엔드에서 자동으로 크롤링하고 업데이트된 결과를 다시 가져옴
        const updatedResponse = await newsAPI.getStockNews(selectedSymbol, 20, false);
        if (updatedResponse.articles.length > response.articles.length) {
          setNews(updatedResponse.articles);
          console.log('[DEBUG] 크롤링 후 업데이트된 뉴스:', updatedResponse.articles.length, '개');
        }
      }
    } catch (err: any) {
      setError('주식 뉴스를 가져오는 중 오류가 발생했습니다.');
      console.error('주식 뉴스 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  const handleAnalyzeWithNews = useCallback(() => {
    if (!selectedSymbol) return;

    startAnalysisTransition(async () => {
      setAnalysisLoading(true);
      setError('');

      try {
        console.log('🔍 뉴스 분석 시작:', selectedSymbol);
        const response = await newsAPI.analyzeStockWithNews(selectedSymbol, 7, 20);
        console.log('📊 분석 응답 받음:', response);

        if (response && response.ai_analysis) {
          setAiAnalysis(response.ai_analysis);
          setRelatedNews(response.related_news || []);
          console.log('✅ 분석 완료');
        } else {
          throw new Error('응답 데이터가 올바르지 않습니다.');
        }
      } catch (err: any) {
        console.error('❌ 뉴스 분석 오류:', err);
        console.error('❌ 응답 상세:', err.response?.data);
        setError(`뉴스 기반 AI 분석 오류: ${err.response?.data?.detail || err.message}`);
      } finally {
        setAnalysisLoading(false);
      }
    });
  }, [selectedSymbol]);

  const handleCrawlNews = useCallback(async () => {
    if (!selectedSymbol) return;

    setCrawlingLoading(true);
    setError('');

    try {
      console.log(`[DEBUG] ${selectedSymbol} 뉴스 크롤링 시작...`);
      const crawlResult = await newsAPI.crawlStockNews(selectedSymbol, 20);
      console.log('[DEBUG] 크롤링 결과:', crawlResult.crawled_count, '개 새 뉴스');

      // 크롤링 후 뉴스 목록 새로고침
      await fetchStockNews();
    } catch (err: any) {
      setError('뉴스 크롤링 중 오류가 발생했습니다.');
      console.error('뉴스 크롤링 오류:', err);
    } finally {
      setCrawlingLoading(false);
    }
  }, [selectedSymbol, fetchStockNews]);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }, []);

  const handleToggleArticleSummary = useCallback((index: number, article: NewsArticle) => {
    // If already expanded, just collapse
    if (expandedArticle === index) {
      setExpandedArticle(null);
      return;
    }

    // If not expanded and no summary exists, fetch it
    if (!articleSummaries[index]) {
      setLoadingArticleSummary(index);

      startSummaryTransition(async () => {
        try {
          const articleData = {
            title: article.title,
            description: article.description || '',
            content: article.description || '',
            url: article.url,
            source: article.source
          };

          const response = await newsAPI.summarizeSingleArticle(articleData);

          // Store the summary
          setArticleSummaries(prev => ({
            ...prev,
            [index]: response.ai_summary
          }));
        } catch (error) {
          console.error('AI 요약 생성 실패:', error);
          // Set error message
          setArticleSummaries(prev => ({
            ...prev,
            [index]: 'AI 요약을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          }));
        } finally {
          setLoadingArticleSummary(null);
        }
      });
    }

    // Expand the article
    setExpandedArticle(index);
  }, [expandedArticle, articleSummaries]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Newspaper className="w-6 h-6" />
          {selectedSymbol ? `${selectedSymbol} 관련 뉴스` : '금융 뉴스'}
        </h2>
        <div className="flex gap-2">
          {selectedSymbol && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCrawlNews}
                disabled={crawlingLoading}
                className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {crawlingLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                뉴스 업데이트
              </Button>
              <Button
                onClick={handleAnalyzeWithNews}
                disabled={analysisLoading}
                className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-semibold"
              >
                {analysisLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {analysisLoading ? '분석 진행 중...' : '뉴스 기반 AI 분석'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-destructive text-center mb-4">
          {error}
        </p>
      )}

      <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col gap-4">
          {news.map((article, index) => (
            <Card key={index} className="flex flex-col">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">
                      {article.source.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {article.source}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.published_at)}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3 leading-tight text-black">
                  {article.title}
                </h3>

                {article.description && (
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {article.description}
                  </p>
                )}

                {/* AI Summary Section */}
                {expandedArticle === index && articleSummaries[index] && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-1 mb-2 text-orange-600 font-semibold">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm">AI 분석 요약</span>
                    </div>
                    <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {articleSummaries[index]}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loadingArticleSummary === index && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                    <span className="text-sm text-orange-600">
                      AI 요약을 생성하고 있습니다...
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleArticleSummary(index, article)}
                    disabled={loadingArticleSummary === index}
                    className="text-orange-600 hover:bg-yellow-50 hover:text-orange-700"
                  >
                    {loadingArticleSummary === index ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {loadingArticleSummary === index
                      ? 'AI 요약 생성 중...'
                      : `AI 요약 ${expandedArticle === index ? '숨기기' : '보기'}`
                    }
                    <ChevronRight
                      className={`w-4 h-4 ml-1 transition-transform ${
                        expandedArticle === index ? 'rotate-90' : ''
                      }`}
                    />
                  </Button>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    원문 보기 →
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {news.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-base text-muted-foreground">
            표시할 뉴스가 없습니다.
          </p>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.5);
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: #424242;
          font-weight: bold;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .prose p {
          margin-bottom: 0.5rem;
        }
        .prose ul, .prose ol {
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .prose li {
          margin-bottom: 0.25rem;
        }
        .prose strong {
          font-weight: bold;
          color: #000000;
        }
      `}</style>
    </div>
  );
}
