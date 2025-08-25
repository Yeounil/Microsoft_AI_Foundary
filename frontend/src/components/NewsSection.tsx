import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Avatar,
  Link,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
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
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
      const response = await newsAPI.getStockNews(selectedSymbol, 8);
      setNews(response.articles);
    } catch (err: any) {
      setError('주식 뉴스를 가져오는 중 오류가 발생했습니다.');
      console.error('주식 뉴스 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchStockNews();
    } else {
      fetchGeneralNews();
    }
  }, [selectedSymbol, selectedMarket, fetchStockNews, fetchGeneralNews]);

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
        <Button
          variant="contained"
          startIcon={summaryLoading ? <CircularProgress size={20} /> : <TrendingUpIcon />}
          onClick={handleSummarizeNews}
          disabled={summaryLoading || news.length === 0}
        >
          AI 요약
        </Button>
      </Box>

      {aiSummary && (
        <Card sx={{ mb: 3, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🤖 AI 뉴스 요약
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {news.map((article, index) => (
          <Box key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                    {article.source.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {article.source}
                  </Typography>
                </Box>

                <Typography variant="h6" component="h3" sx={{ mb: 1 }} noWrap>
                  {article.title}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    '-webkit-line-clamp': 3,
                    '-webkit-box-orient': 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {article.description}
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <ScheduleIcon sx={{ fontSize: 16 }} color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(article.published_at)}
                    </Typography>
                  </Box>
                  
                  <Link
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="caption"
                  >
                    원문 보기
                  </Link>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
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