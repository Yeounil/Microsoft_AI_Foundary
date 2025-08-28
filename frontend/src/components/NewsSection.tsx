import React, { useState, useEffect } from 'react';
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
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { newsAPI } from '../services/api';
import { NewsArticle, NewsSummary } from '../types/api';

interface NewsSectionProps {
  selectedSymbol?: string;
  selectedMarket?: string;
}

const NewsSection: React.FC<NewsSectionProps> = ({ selectedSymbol, selectedMarket }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [crawlingLoading, setCrawlingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (selectedSymbol) {
      fetchStockNews();
    } else {
      fetchGeneralNews();
    }
  }, [selectedSymbol, selectedMarket]);

  const fetchGeneralNews = async () => {
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
  };

  const fetchStockNews = async () => {
    if (!selectedSymbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await newsAPI.getStockNews(selectedSymbol, 8);
      setNews(response.articles);
    } catch (err: any) {
      setError('주식 뉴스를 가져오는 중 오류가 발생했습니다.');
      console.error('주식 뉴스 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeNews = async () => {
    setSummaryLoading(true);
    setError('');
    
    try {
      let response: NewsSummary;
      
      if (selectedSymbol) {
        response = await newsAPI.summarizeStockNews(selectedSymbol, 5);
      } else {
        response = await newsAPI.summarizeNews('finance', 5, 'en');
      }
      
      setAiSummary(response.ai_summary);
    } catch (err: any) {
      setError('AI 요약을 생성하는 중 오류가 발생했습니다.');
      console.error('AI 요약 오류:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAnalyzeWithNews = async () => {
    if (!selectedSymbol) return;
    
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
  };

  const handleCrawlNews = async () => {
    if (!selectedSymbol) return;
    
    setCrawlingLoading(true);
    setError('');
    
    try {
      await newsAPI.crawlStockNews(selectedSymbol, 10);
      // 크롤링 후 뉴스 목록 새로고침
      await fetchStockNews();
    } catch (err: any) {
      setError('뉴스 크롤링 중 오류가 발생했습니다.');
      console.error('뉴스 크롤링 오류:', err);
    } finally {
      setCrawlingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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
  };

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
              >
                뉴스 업데이트
              </Button>
              <Button
                variant="contained"
                startIcon={analysisLoading ? <CircularProgress size={20} /> : <PsychologyIcon />}
                onClick={handleAnalyzeWithNews}
                disabled={analysisLoading}
                sx={{ bgcolor: 'secondary.main' }}
              >
                뉴스 기반 AI 분석
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={summaryLoading ? <CircularProgress size={20} /> : <TrendingUpIcon />}
            onClick={handleSummarizeNews}
            disabled={summaryLoading || news.length === 0}
          >
            AI 요약
          </Button>
        </Stack>
      </Box>

      {aiAnalysis && (
        <Card sx={{ mb: 3, backgroundColor: '#000000', color: '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🧠 뉴스 기반 AI 종목 분석
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2, color: '#000000' }}>
              {aiAnalysis}
            </Typography>
            
            {relatedNews.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                  📰 분석에 활용된 주요 뉴스
                </Typography>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {relatedNews.slice(0, 5).map((article, index) => (
                    <Card key={index} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: 'inherit', mb: 0.5 }}>
                          {article.title}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
                            {article.source} • {formatDate(article.published_at)}
                          </Typography>
                          <Link
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: 'inherit', fontSize: '0.75rem' }}
                          >
                            원문보기
                          </Link>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {aiSummary && (
        <Card sx={{ mb: 3, backgroundColor: 'primary.main', color: '#000000' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#000000' }}>
              🤖 AI 뉴스 요약
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: '#000000' }}>
              {aiSummary}
            </Typography>
          </CardContent>
        </Card>
      )}

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

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box />
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
};

export default NewsSection;