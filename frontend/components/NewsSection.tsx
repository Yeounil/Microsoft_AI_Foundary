'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Avatar,
  Link,
  Stack
} from '@mui/material';
import {
  Article as ArticleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon
} from '@mui/icons-material';
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
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2">
          <ArticleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {selectedSymbol ? `${selectedSymbol} 관련 뉴스` : '금융 뉴스'}
        </Typography>
        <Stack direction="row" spacing={1}>
          {selectedSymbol && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={crawlingLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleCrawlNews}
                disabled={crawlingLoading}
                sx={{
                  color: '#2196F3',
                  borderColor: '#2196F3',
                  '&:hover': {
                    borderColor: '#1976D2',
                    backgroundColor: 'rgba(33, 150, 243, 0.04)',
                    color: '#1976D2'
                  }
                }}
              >
                뉴스 업데이트
              </Button>
              <Button
                variant="contained"
                startIcon={analysisLoading ? <CircularProgress size={20} color="inherit" /> : <PsychologyIcon />}
                onClick={handleAnalyzeWithNews}
                disabled={analysisLoading}
                sx={{
                  background: analysisLoading
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: !analysisLoading ? 'translateY(-2px)' : 'none',
                    boxShadow: !analysisLoading ? '0 8px 20px rgba(102, 126, 234, 0.4)' : 'none',
                  },
                  '&:disabled': {
                    opacity: 0.8,
                  }
                }}
              >
                {analysisLoading ? '분석 진행 중...' : '뉴스 기반 AI 분석'}
              </Button>
            </>
          )}
        </Stack>
      </Box>


      {error && (
        <Typography color="error" align="center" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box 
        sx={{ 
          maxHeight: '600px', 
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        <Stack spacing={2}>
          {news.map((article, index) => (
            <Card key={index} sx={{ display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                    {article.source.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {article.source}
                  </Typography>
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 14 }} color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(article.published_at)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h6" component="h3" sx={{ mb: 1.5, lineHeight: 1.3, color: '#000000' }}>
                  {article.title}
                </Typography>

                {article.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, lineHeight: 1.5 }}
                  >
                    {article.description}
                  </Typography>
                )}

                {/* AI Summary Section */}
                {expandedArticle === index && articleSummaries[index] && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      backgroundColor: '#FFF9E6',
                      borderRadius: 1,
                      border: '1px solid #FFE082'
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: '#F57C00',
                        fontWeight: 600
                      }}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                      AI 분석 요약
                    </Typography>
                    <Box
                      sx={{
                        color: '#424242',
                        lineHeight: 1.6,
                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                          color: '#424242',
                          fontWeight: 'bold',
                          marginTop: '0.5rem',
                          marginBottom: '0.25rem'
                        },
                        '& p': {
                          marginBottom: '0.5rem'
                        },
                        '& ul, & ol': {
                          paddingLeft: '1.5rem',
                          marginBottom: '0.5rem'
                        },
                        '& li': {
                          marginBottom: '0.25rem'
                        },
                        '& strong': {
                          fontWeight: 'bold',
                          color: '#000000'
                        }
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {articleSummaries[index]}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                )}

                {/* Loading State */}
                {loadingArticleSummary === index && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      backgroundColor: '#FFF9E6',
                      borderRadius: 1,
                      border: '1px solid #FFE082',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1
                    }}
                  >
                    <CircularProgress size={16} sx={{ color: '#F57C00' }} />
                    <Typography variant="body2" sx={{ color: '#F57C00' }}>
                      AI 요약을 생성하고 있습니다...
                    </Typography>
                  </Box>
                )}

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    pt: 2,
                    borderTop: '1px solid rgba(0,0,0,0.08)'
                  }}
                >
                  <Button
                    size="small"
                    startIcon={loadingArticleSummary === index ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                    endIcon={<KeyboardArrowRightIcon sx={{
                      transition: 'transform 0.2s',
                      transform: expandedArticle === index ? 'rotate(90deg)' : 'rotate(0deg)'
                    }} />}
                    onClick={() => handleToggleArticleSummary(index, article)}
                    disabled={loadingArticleSummary === index}
                    sx={{
                      color: '#F57C00',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        backgroundColor: '#FFF9E6',
                        color: '#E65100'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(245, 124, 0, 0.5)'
                      }
                    }}
                  >
                    {loadingArticleSummary === index
                      ? 'AI 요약 생성 중...'
                      : `AI 요약 ${expandedArticle === index ? '숨기기' : '보기'}`
                    }
                  </Button>
                  <Link
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      }
                    }}
                  >
                    원문 보기 →
                  </Link>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      {news.length === 0 && !loading && (
        <Box textAlign="center" sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            표시할 뉴스가 없습니다.
          </Typography>
        </Box>
      )}
    </Box>
  );
}