'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Badge
} from '@mui/material';
import {
  Recommend as RecommendIcon,
  Share,
  BookmarkBorder,
  ThumbUp,
  ThumbDown,
  AccessTime
} from '@mui/icons-material';
import { recommendationSupabaseAPI } from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RecommendedNewsItem {
  id?: number;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  symbol?: string;
  recommendation_score: number;
  recommendation_reason: string;
  image_url?: string;
}

interface UserInterest {
  id: number;
  user_id: string;
  interest: string;
  created_at?: string;
}

export default function RecommendedNews() {
  const [recommendedNews, setRecommendedNews] = useState<RecommendedNewsItem[]>([]);
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadRecommendedNews();
    loadUserInterests();
  }, []);

  const loadRecommendedNews = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await recommendationSupabaseAPI.getRecommendedNewsByInterests(10);
      setRecommendedNews(data.recommendations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || '추천 뉴스를 가져오는 중 오류가 발생했습니다.');
      console.error('추천 뉴스 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInterests = async () => {
    try {
      const data = await recommendationSupabaseAPI.getUserInterests();
      setUserInterests(data.interests || []);
    } catch (err: any) {
      console.error('관심 종목 로딩 오류:', err);
    }
  };

  const handleNewsInteraction = async (
    newsUrl: string, 
    action: string, 
    newsTitle?: string, 
    symbol?: string
  ) => {
    try {
      // Supabase에서는 뉴스 상호작용 추적을 아직 구현하지 않았으므로 주석 처리
      // 나중에 필요시 Supabase API에서 구현
      console.log(`뉴스 상호작용: ${action} - ${newsTitle}`);
      
      if (action === 'like' || action === 'dislike') {
        setTimeout(() => loadRecommendedNews(), 1000);
      }
    } catch (err) {
      console.error('뉴스 상호작용 추적 오류:', err);
    }
  };

  const handleRemoveInterest = async (interest: UserInterest) => {
    try {
      await recommendationSupabaseAPI.removeUserInterestById(interest.id);
      loadUserInterests();
      loadRecommendedNews();
    } catch (err: any) {
      setError(err.response?.data?.detail || '관심 종목 제거 중 오류가 발생했습니다.');
    }
  };

  const handleViewOriginalNews = (url: string, title: string, symbol?: string) => {
    // 뉴스 상호작용 추적
    handleNewsInteraction(url, 'view', title, symbol);
    // 새 창에서 해당 뉴스 URL로 직접 이동
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}분 전`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`;
    } else {
      return `${Math.floor(diffInHours / 24)}일 전`;
    }
  };

  const getInterestColor = (index: number) => {
    // Supabase에서는 priority가 없으므로 인덱스 기반으로 색상 결정
    switch (index % 3) {
      case 0: return 'error';
      case 1: return 'warning';
      default: return 'info';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'info';
  };

  return (
    <Box>
      {/* 헤더 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2">
          <RecommendIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          맞춤 뉴스 추천
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={loadRecommendedNews}
            disabled={loading}
            size="small"
          >
            새로고침
          </Button>
        </Stack>
      </Box>

      {/* 관심 종목 목록 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          내 관심 종목 ({userInterests.length}개)
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {userInterests.length > 0 ? (
            userInterests.map((interest, index) => (
              <Chip
                key={interest.id}
                label={interest.interest}
                color={getInterestColor(index)}
                variant="outlined"
                onDelete={() => handleRemoveInterest(interest)}
                size="small"
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              상단 주식 검색에서 ❤️ 클릭으로 관심 종목을 추가하세요
            </Typography>
          )}
        </Box>
      </Paper>

      {/* 에러 메시지 */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* 로딩 */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* 추천 뉴스 목록 */}
      {!loading && recommendedNews.length > 0 && (
        <Stack spacing={2}>
          {recommendedNews.map((news, index) => (
            <Card key={index} elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {news.symbol && (
                        <Chip label={news.symbol} size="small" color="primary" />
                      )}
                      <Chip 
                        label={news.recommendation_reason} 
                        size="small" 
                        color={getScoreColor(news.recommendation_score)}
                      />
                      <Badge 
                        badgeContent={Math.round(news.recommendation_score * 100) + '%'} 
                        color="secondary"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewOriginalNews(news.url, news.title, news.symbol)}
                    >
                      {news.title}
                    </Typography>

                    <Box sx={{
                      '& p': {
                        marginBottom: '0.5rem',
                        lineHeight: 1.5,
                        fontSize: '0.875rem',
                        color: 'text.secondary'
                      },
                      '& ul, & ol': {
                        paddingLeft: '1.5rem',
                        marginBottom: '0.5rem'
                      },
                      '& li': {
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem'
                      },
                      '& strong': {
                        fontWeight: 'bold'
                      },
                      '& em': {
                        fontStyle: 'italic'
                      }
                    }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {news.description}
                      </ReactMarkdown>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" color="text.secondary">
                          {news.source}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                          <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                          {formatDate(news.published_at)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleNewsInteraction(news.url, 'like', news.title, news.symbol)}
                        >
                          <ThumbUp fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleNewsInteraction(news.url, 'dislike', news.title, news.symbol)}
                        >
                          <ThumbDown fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleNewsInteraction(news.url, 'bookmark', news.title, news.symbol)}
                        >
                          <BookmarkBorder fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.share && navigator.share({ url: news.url, title: news.title });
                            handleNewsInteraction(news.url, 'share', news.title, news.symbol);
                          }}
                        >
                          <Share fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 추천 뉴스가 없는 경우 */}
      {!loading && recommendedNews.length === 0 && !error && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            추천할 뉴스가 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            관심 종목을 추가하면 맞춤 뉴스를 추천해드립니다
          </Typography>
        </Box>
      )}

    </Box>
  );
}