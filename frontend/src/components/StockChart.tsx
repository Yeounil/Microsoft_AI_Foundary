import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label
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
  CircularProgress,
  Stack,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { StockData } from '../types/api';
import { stockAPI } from '../services/api';

interface StockChartProps {
  symbol: string;
  market: string;
}

const StockChart: React.FC<StockChartProps> = ({ symbol, market }) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [period, setPeriod] = useState<string>('1y');
  const [interval, setInterval] = useState<string>('1d');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // 새로고침 관련 상태
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  const getValidIntervalOptions = (selectedPeriod: string) => {
    const allIntervals = [
      { value: '1m', label: '1분' },
      { value: '5m', label: '5분' },
      { value: '15m', label: '15분' },
      { value: '30m', label: '30분' },
      { value: '60m', label: '1시간' },
      { value: '90m', label: '90분' },
      { value: '1d', label: '1일' },
      { value: '5d', label: '5일' },
      { value: '1wk', label: '1주' },
      { value: '1mo', label: '1개월' },
      { value: '3mo', label: '3개월' }
    ];

    const getIntervals = (values: string[]) => allIntervals.filter(i => values.includes(i.value));

    switch (selectedPeriod) {
      case '1d':
        return getIntervals(['1m', '5m', '15m', '30m', '60m']);
      case '5d':
        return getIntervals(['5m', '15m', '60m', '1d']);
      case '1mo':
        return getIntervals(['30m', '60m', '90m', '1d']);
      case '3mo':
      case '6mo':
      case '1y':
        return getIntervals(['1d', '5d', '1wk', '1mo']);
      case '2y':
        return getIntervals(['1d', '1wk', '1mo', '3mo']);
      case '5y':
        return getIntervals(['1d', '1mo', '3mo']);
      default:
        return getIntervals(['1d', '5d', '1wk', '1mo']);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const validIntervals = getValidIntervalOptions(newPeriod);

    // If current interval is not in the new list of valid intervals, set a new default.
    if (!validIntervals.some(option => option.value === interval)) {
      switch (newPeriod) {
        case '1d':
          setInterval('15m');
          break;
        case '5d':
          setInterval('15m');
          break;
        case '1mo':
          setInterval('60m');
          break;
        default: // For 3mo, 6mo, 1y, etc.
          setInterval('1d');
          break;
      }
    }
  };

  const fetchStockData = useCallback(async (isRefresh: boolean = false) => {
    if (!symbol) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const data = await stockAPI.getStockData(symbol, period, market, interval);

      // The date string from the API is used directly.
      // The formatDate function will handle parsing and timezone conversion.
      setStockData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.detail || '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [symbol, period, market, interval]);

  // 수동 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    if (refreshing || loading) return;
    fetchStockData(true);
  }, [fetchStockData, refreshing, loading]);

  // 자동 새로고침 토글 핸들러
  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // 자동 새로고침 Effect
  useEffect(() => {
    let intervalId: number;
    
    if (autoRefresh && symbol) {
      // 30초마다 자동 새로고침
      intervalId = window.setInterval(() => {
        handleRefresh();
      }, 30000);
    }
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefresh, symbol, handleRefresh]);

  // 컴포넌트 언마운트 시 자동 새로고침 정리
  useEffect(() => {
    return () => {
      setAutoRefresh(false);
    };
  }, []);

  // Calculate year reference lines
  const { yearReferenceLines, yearStartDatesSet } = React.useMemo(() => {
    if (!stockData || !stockData.price_data || stockData.price_data.length === 0) {
      return { yearReferenceLines: [], yearStartDatesSet: new Set() };
    }

    const timeZone = market === 'us' ? 'Asia/Seoul' : undefined;
    const lines: { year: number; date: string }[] = [];
    const yearStarts = new Set<number>(); // Set of timestamps
    let currentYear = -1;

    stockData.price_data.forEach((dataPoint) => {
      const date = new Date(dataPoint.date);
      const year = parseInt(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(date), 10);

      if (year !== currentYear) {
        lines.push({ year, date: dataPoint.date });
        yearStarts.add(date.getTime()); // Add timestamp to set
        currentYear = year;
      }
    });
    return { yearReferenceLines: lines, yearStartDatesSet: yearStarts };
  }, [stockData, market]);

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
    const timeZone = market === 'us' ? 'Asia/Seoul' : undefined;

    if (['1m', '2m', '5m', '15m', '30m', '60m', '90m'].includes(interval)) {
      // M.D HH:mm format
      const monthDay = new Intl.DateTimeFormat('ko-KR', {
        timeZone,
        month: 'numeric',
        day: 'numeric'
      }).format(date).replace(/\s/g, '').slice(0, -1); // M.D

      const timePart = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      });
      return `${monthDay} ${timePart}`;
    } else {
      // M.D format for longer intervals
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone,
        month: 'numeric',
        day: 'numeric'
      }).format(date).replace(/\s/g, '').slice(0, -1);
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
    // 한국 주식 시장 전통: 상승(빨간색), 하락(파란색)
    return change.value >= 0 ? '#FF1744' : '#2196F3'; // 빨간색 상승, 파란색 하락
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {stockData.company_name}
            </Typography>
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
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" display="block">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </Typography>
            )}
          </Box>
          
          <Box>
            <Stack direction="column" spacing={2} alignItems="flex-end">
              {/* 새로고침 컨트롤 */}
              <Box display="flex" alignItems="center" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={handleAutoRefreshToggle}
                      size="small"
                      color="primary"
                    />
                  }
                  label="자동 새로고침"
                  sx={{ fontSize: '0.875rem' }}
                />
                <IconButton
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  color="primary"
                  size="small"
                  sx={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              {/* 기간 및 간격 컨트롤 */}
              <Box display="flex" gap={2} flexWrap="wrap">
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
            </Stack>
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
              <Tooltip 
                labelFormatter={formatDate}
                formatter={(value: number) => [formatPrice(value), '종가']}
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#4CAF50"
                strokeWidth={2}
                dot={false}
              />
              {yearReferenceLines.map(line => (
                <ReferenceLine
                  key={line.date}
                  x={line.date}
                  stroke="#2196F3" // Blue color
                  strokeWidth={2}    // Increased thickness
                  strokeDasharray="4 4"
                >
                  <Label
                    value={line.year}
                    position="insideBottom"
                    fill="#333"
                    fontSize={12}
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceLine>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockChart;