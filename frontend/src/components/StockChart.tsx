import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder
} from '@mui/icons-material';
import { StockData } from '../types/api';
import { stockAPI, recommendationAPI } from '../services/api';

interface StockChartProps {
  symbol: string;
  market: string;
}

const StockChart: React.FC<StockChartProps> = ({ symbol, market }) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [period, setPeriod] = useState<string>('1d');
  const [interval, setInterval] = useState<string>('15m');

  // 기간 변경 시 호환되지 않는 간격이면 자동으로 조정
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const validIntervals = getValidIntervalOptions(newPeriod);
    
    // 현재 간격이 새로운 기간에 맞지 않으면 기본값으로 변경
    if (!validIntervals.some(option => option.value === interval)) {
      if (['1mo', '3mo', '6mo', '1y', '2y', '5y'].includes(newPeriod)) {
        setInterval('1d'); // 1개월 이상이면 기본을 1일로
      } else if (newPeriod === '1d') {
        setInterval('15m'); // 1일이면 기본을 15분으로
      } else {
        setInterval('1d'); // 기타는 1일로
      }
    }
  };
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // 관심 종목 관련 상태
  const [isInFavorites, setIsInFavorites] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  const periodOptions = [
    { value: '1d', label: '1일' },
    { value: '5d', label: '5일' },
    { value: '1mo', label: '1개월' },
    { value: '3mo', label: '3개월' },
    { value: '6mo', label: '6개월' },
    { value: '1y', label: '1년' },
    { value: '2y', label: '2년' },
    { value: '5y', label: '5년' }
  ];

  // 기간에 따른 적합한 간격 옵션 필터링
  const getValidIntervalOptions = (selectedPeriod: string) => {
    const allIntervals = [
      { value: '1m', label: '1분', maxPeriod: '1d' },
      { value: '2m', label: '2분', maxPeriod: '1d' },
      { value: '5m', label: '5분', maxPeriod: '5d' },
      { value: '15m', label: '15분', maxPeriod: '5d' },
      { value: '30m', label: '30분', maxPeriod: '1mo' },
      { value: '60m', label: '1시간', maxPeriod: '1mo' },
      { value: '90m', label: '90분', maxPeriod: '1mo' },
      { value: '1d', label: '1일', maxPeriod: '10y' },
      { value: '5d', label: '5일', maxPeriod: '10y' },
      { value: '1wk', label: '1주', maxPeriod: '10y' },
      { value: '1mo', label: '1월', maxPeriod: '10y' }
    ];

    // 기간별 허용 가능한 최대 간격 정의
    const periodHierarchy: { [key: string]: number } = {
      '1d': 1,
      '5d': 2,
      '1mo': 3,
      '3mo': 4,
      '6mo': 5,
      '1y': 6,
      '2y': 7,
      '5y': 8,
      '10y': 9
    };

    const intervalHierarchy: { [key: string]: number } = {
      '1m': 1,
      '2m': 2,
      '5m': 3,
      '15m': 4,
      '30m': 5,
      '60m': 6,
      '90m': 7,
      '1d': 8,
      '5d': 9,
      '1wk': 10,
      '1mo': 11
    };

    // 1개월 이상의 기간일 때는 1일 이상의 간격만 허용
    if (['1mo', '3mo', '6mo', '1y', '2y', '5y'].includes(selectedPeriod)) {
      return allIntervals.filter(interval => 
        intervalHierarchy[interval.value] >= intervalHierarchy['1d']
      );
    }

    return allIntervals.filter(interval => {
      const periodLevel = periodHierarchy[selectedPeriod] || 9;
      const intervalLevel = intervalHierarchy[interval.value] || 1;
      
      // 간격이 기간보다 클 수 없음
      return intervalLevel <= periodLevel + 3; // 약간의 여유 허용
    });
  };

  useEffect(() => {
    fetchStockData();
    checkIfInFavorites();
  }, [symbol, period, interval, market]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStockData = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await stockAPI.getStockData(symbol, period, market, interval);
      setStockData(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value: number): string => {
    if (!stockData) return value.toString();
    
    if (stockData.currency === 'KRW') {
      return `₩${value.toLocaleString()}`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // 15분 단위 등 분 단위 데이터일 때는 시간도 표시
    if (['1m', '2m', '5m', '15m', '30m', '60m', '90m'].includes(interval)) {
      return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  const calculateChange = () => {
    if (!stockData) return { value: 0, percent: 0 };
    
    const change = stockData.current_price - stockData.previous_close;
    const percent = (change / stockData.previous_close) * 100;
    
    return { value: change, percent };
  };

  const getChangeColor = () => {
    const change = calculateChange();
    return change.value >= 0 ? 'success.main' : 'error.main';
  };

  // 관심 종목 상태 확인
  const checkIfInFavorites = async () => {
    if (!symbol) return;
    
    try {
      const response = await recommendationAPI.getUserInterests();
      const interests = response.interests || [];
      const found = interests.some(
        (interest: any) => interest.symbol === symbol && interest.market === market
      );
      setIsInFavorites(found);
    } catch (error) {
      console.error('관심 종목 상태 확인 오류:', error);
    }
  };

  // 관심 종목 토글
  const toggleFavorite = async () => {
    if (!stockData || !symbol) return;
    
    setFavoriteLoading(true);
    
    try {
      if (isInFavorites) {
        await recommendationAPI.removeUserInterest(symbol, market);
        setAlertMessage(`${stockData.company_name || symbol}이 관심 목록에서 제거되었습니다.`);
      } else {
        await recommendationAPI.addUserInterest({
          symbol: symbol,
          market: market,
          company_name: stockData.company_name || symbol,
          priority: 2
        });
        setAlertMessage(`${stockData.company_name || symbol}이 관심 목록에 추가되었습니다.`);
      }
      
      setIsInFavorites(!isInFavorites);
      
    } catch (error: any) {
      console.error('관심 종목 토글 오류:', error);
      setAlertMessage(error.response?.data?.detail || '관심 종목 설정 중 오류가 발생했습니다.');
    } finally {
      setFavoriteLoading(false);
      
      // 3초 후 알림 메시지 제거
      setTimeout(() => {
        setAlertMessage('');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" variant="h6" align="center">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!stockData) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" align="center">
            주식을 검색해주세요
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const change = calculateChange();

  return (
    <Card>
      <CardContent>
        {/* 알림 메시지 */}
        {alertMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}
        
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="h5" component="h2">
                {stockData.company_name}
              </Typography>
              <Tooltip title={isInFavorites ? "관심 종목에서 제거" : "관심 종목에 추가"}>
                <IconButton
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  color={isInFavorites ? "error" : "default"}
                  size="small"
                  sx={{ ml: 0.5 }}
                >
                  {favoriteLoading ? (
                    <CircularProgress size={20} />
                  ) : isInFavorites ? (
                    <Favorite fontSize="small" />
                  ) : (
                    <FavoriteBorder fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="h6" color={getChangeColor()}>
              {formatPrice(stockData.current_price)}
              <Typography component="span" sx={{ ml: 1, fontSize: '0.8em' }}>
                {change.value >= 0 ? '+' : ''}{formatPrice(change.value)} 
                ({change.percent >= 0 ? '+' : ''}{change.percent.toFixed(2)}%)
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              심볼: {stockData.symbol} | 전일종가: {formatPrice(stockData.previous_close)}
            </Typography>
          </Box>
          
          <Box>
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>기간</InputLabel>
                <Select
                  value={period}
                  label="기간"
                  onChange={(e) => handlePeriodChange(e.target.value)}
                >
                  {periodOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>간격</InputLabel>
                <Select
                  value={interval}
                  label="간격"
                  onChange={(e) => setInterval(e.target.value)}
                >
                  {getValidIntervalOptions(period).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Stack>

        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={stockData.price_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatPrice}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip 
                labelFormatter={formatDate}
                formatter={(value: number) => [formatPrice(value), '종가']}
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockChart;