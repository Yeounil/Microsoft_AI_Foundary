import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
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
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
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

  const fetchStockData = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await stockAPI.getStockData(symbol, period, market);
      setStockData(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [symbol, period, market]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  const formatPrice = (value: number): string => {
    if (!stockData) return value.toString();
    
    if (stockData.currency === 'KRW') {
      return `₩${value.toLocaleString()}`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
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
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {periodOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant={chartType === 'line' ? 'contained' : 'outlined'}
                onClick={() => setChartType('line')}
                size="small"
              >
                선형차트
              </Button>
              <Button
                variant={chartType === 'bar' ? 'contained' : 'outlined'}
                onClick={() => setChartType('bar')}
                size="small"
              >
                바차트
              </Button>
            </Box>
          </Box>
        </Stack>

        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            {chartType === 'line' ? (
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
            ) : (
              <BarChart data={stockData.price_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={formatPrice} />
                <Tooltip 
                  labelFormatter={formatDate}
                  formatter={(value: number) => [formatPrice(value), '종가']}
                />
                <Bar dataKey="close" fill="#8884d8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockChart;