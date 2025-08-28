import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { analysisAPI } from '../services/api';
import { StockAnalysis as StockAnalysisType } from '../types/api';

interface StockAnalysisProps {
  symbol: string;
  market: string;
  companyName: string;
}

const StockAnalysis: React.FC<StockAnalysisProps> = ({ symbol, market, companyName }) => {
  const [analysis, setAnalysis] = useState<StockAnalysisType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleAnalyze = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await analysisAPI.analyzeStock(symbol, market, '1y');
      setAnalysis(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'AI 분석 중 오류가 발생했습니다.');
      console.error('분석 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAnalysis = (analysisText: string) => {
    // 간단한 마크다운 스타일 포맷팅
    return analysisText
      .split('\n')
      .map((line, index) => {
        if (line.trim().startsWith('##')) {
          return (
            <Typography key={index} variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              {line.replace(/##/g, '').trim()}
            </Typography>
          );
        } else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
          return (
            <Typography key={index} variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold' }}>
              {line.replace(/\*\*/g, '').trim()}
            </Typography>
          );
        } else if (line.trim().startsWith('-')) {
          return (
            <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
              • {line.replace(/^-\s*/, '').trim()}
            </Typography>
          );
        } else if (line.trim()) {
          return (
            <Typography key={index} variant="body1" sx={{ mb: 1 }}>
              {line.trim()}
            </Typography>
          );
        } else {
          return <Box key={index} sx={{ height: 8 }} />;
        }
      });
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2">
            <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            AI 투자 분석
          </Typography>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AssessmentIcon />}
            onClick={handleAnalyze}
            disabled={loading || !symbol}
            color="secondary"
          >
            {loading ? '분석 중...' : 'AI 분석 시작'}
          </Button>
        </Box>

        {!analysis && !loading && !error && (
          <Box textAlign="center" sx={{ py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              '{companyName || symbol}' 주식에 대한 AI 분석을 시작해보세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              OpenAI를 활용한 전문적인 투자 분석을 제공합니다.
            </Typography>
          </Box>
        )}

        {error && (
          <Box textAlign="center" sx={{ py: 2 }}>
            <Typography color="error" variant="body1">
              {error}
            </Typography>
            <Button onClick={handleAnalyze} sx={{ mt: 1 }} variant="outlined" size="small">
              다시 시도
            </Button>
          </Box>
        )}

        {analysis && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <Chip 
                icon={<TrendingUpIcon />} 
                label={analysis.symbol} 
                color="primary" 
                variant="outlined" 
              />
              <Typography variant="body2" color="text.secondary">
                현재가: {analysis.currency === 'KRW' ? '₩' : '$'}
                {analysis.current_price.toLocaleString()}
              </Typography>
            </Box>

            <Card variant="outlined" sx={{ backgroundColor: 'background.paper', p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                📊 AI 분석 보고서
              </Typography>
              
              <Box sx={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',
                },
              }}>
                {formatAnalysis(analysis.analysis)}
              </Box>

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  ⚠️ 본 분석은 AI가 생성한 참고 자료이며, 투자 결정은 신중히 하시기 바랍니다.
                </Typography>
              </Box>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StockAnalysis;