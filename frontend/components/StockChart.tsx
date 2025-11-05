'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Loader2 } from 'lucide-react';
import { StockData } from '@/types/api';
import { stockAPI } from '@/services/api';

interface StockChartProps {
  symbol: string;
  market: string;
}

export default function StockChart({ symbol, market }: StockChartProps) {
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
    // 한국 주식 시장 전통: 상승(빨간색), 하락(파란색)
    return change.value >= 0 ? '#FF1744' : '#2196F3'; // 빨간색 상승, 파란색 하락
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-destructive text-center">
            {error}
          </h3>
        </CardContent>
      </Card>
    );
  }

  if (!stockData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-center">
            주식을 검색해주세요
          </h3>
        </CardContent>
      </Card>
    );
  }

  const change = calculateChange();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-2">
              {stockData.company_name}
            </h2>
            <div className="text-xl font-medium" style={{ color: getChangeColor() }}>
              {formatPrice(stockData.current_price)}
              <span className="text-sm ml-2">
                {change.value >= 0 ? '+' : ''}{formatPrice(change.value)}
                ({change.percent >= 0 ? '+' : ''}{change.percent.toFixed(2)}%)
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              심볼: {stockData.symbol} | 전일종가: {formatPrice(stockData.previous_close)}
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 items-end">
            {/* 새로고침 컨트롤 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={handleAutoRefreshToggle}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  자동 새로고침
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className={refreshing ? 'animate-spin' : ''}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* 기간 및 간격 컨트롤 */}
            <div className="flex gap-2 flex-wrap">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="기간" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="간격" />
                </SelectTrigger>
                <SelectContent>
                  {getValidIntervalOptions(period).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="w-full h-[400px]">
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
