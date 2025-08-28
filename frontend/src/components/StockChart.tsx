import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  CircularProgress,
  Stack
} from '@mui/material';
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

    if (['1mo', '3mo', '6mo', '1y', '2y', '5y'].includes(selectedPeriod)) {
      return allIntervals.filter(interval => 
        ['1d', '5d', '1wk', '1mo'].includes(interval.value)
      );
    }

    return allIntervals.filter(interval => {
      if (selectedPeriod === '1d') return ['1m', '2m', '5m', '15m', '30m', '60m', '90m'].includes(interval.value);
      if (selectedPeriod === '5d') return ['5m', '15m', '30m', '60m', '90m', '1d'].includes(interval.value);
      return true;
    });
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const validIntervals = getValidIntervalOptions(newPeriod);
    
    if (!validIntervals.some(option => option.value === interval)) {
      if (['1mo', '3mo', '6mo', '1y', '2y', '5y'].includes(newPeriod)) {
        setInterval('1d');
      } else if (newPeriod === '1d') {
        setInterval('15m');
      } else {
        setInterval('1d');
      }
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [symbol, period, interval, market]);

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
              <Tooltip 
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