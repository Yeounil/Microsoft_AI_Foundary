import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  OpenInNew,
  AccessTime
} from '@mui/icons-material';
import { recommendationAPI } from '../services/api';

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
  symbol: string;
  market: string;
  company_name: string;
  priority: number;
  created_at: string;
}

const RecommendedNews: React.FC = () => {
  const [recommendedNews, setRecommendedNews] = useState<RecommendedNewsItem[]>([]);
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // 관심 종목 관리 상태 (제거됨 - 이제 StockSearch에서 관리)
  
  // 뉴스 원문 보기 상태
  const [selectedNewsUrl, setSelectedNewsUrl] = useState<string>('');
  const [newsDialogOpen, setNewsDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    loadRecommendedNews();
    loadUserInterests();
  }, []);

  const loadRecommendedNews = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await recommendationAPI.getRecommendedNews(10, 7);
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
      const data = await recommendationAPI.getUserInterests();
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
      await recommendationAPI.trackNewsInteraction({
        news_url: newsUrl,
        action,
        news_title: newsTitle,
        symbol,
        interaction_time: action === 'view' ? 30 : 0
      });
      
      // 상호작용 후 추천 뉴스 갱신
      if (action === 'like' || action === 'dislike') {
        setTimeout(() => loadRecommendedNews(), 1000);
      }
    } catch (err) {
      console.error('뉴스 상호작용 추적 오류:', err);
    }
  };

  // handleAddInterest 함수 제거됨 (StockSearch에서 처리)

  const handleRemoveInterest = async (interest: UserInterest) => {
    try {
      await recommendationAPI.removeUserInterest(interest.symbol, interest.market);
      loadUserInterests();
      loadRecommendedNews(); // 관심 종목 제거 후 추천 뉴스 갱신
    } catch (err: any) {
      setError(err.response?.data?.detail || '관심 종목 제거 중 오류가 발생했습니다.');
    }
  };

  const handleViewOriginalNews = (url: string, title: string, symbol?: string) => {
    setSelectedNewsUrl(url);
    setNewsDialogOpen(true);
    handleNewsInteraction(url, 'view', title, symbol);
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'error';
      case 2: return 'warning';
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
            userInterests.map((interest) => (
              <Chip
                key={`${interest.symbol}-${interest.market}`}
                label={`${interest.symbol} (${interest.company_name || interest.symbol})`}
                color={getPriorityColor(interest.priority)}
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
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {news.description}
                    </Typography>
                    
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

      {/* 관심 종목 추가 다이얼로그 제거됨 - 이제 StockSearch에서 하트 버튼으로 처리 */}

      {/* 뉴스 원문 다이얼로그 */}
      <Dialog 
        open={newsDialogOpen} 
        onClose={() => setNewsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          뉴스 원문 보기
          <IconButton
            component="a"
            href={selectedNewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ ml: 'auto' }}
          >
            <OpenInNew />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: '70vh', border: '1px solid #ddd' }}>
            <iframe
              src={selectedNewsUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title="뉴스 원문"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewsDialogOpen(false)}>닫기</Button>
          <Button
            component="a"
            href={selectedNewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
          >
            새 창에서 열기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecommendedNews;