import React, { useState, useEffect } from 'react';
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { stockAPI } from '../services/api';

interface StockSearchProps {
  onStockSelect: (symbol: string, market: string) => void;
}

interface StockOption {
  symbol: string;
  name: string;
}

const StockSearch: React.FC<StockSearchProps> = ({ onStockSelect }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockOption | null>(null);
  const [market, setMarket] = useState<string>('us');
  const [loading, setLoading] = useState<boolean>(false);

  // 기본 주식 목록
  const defaultStocks = {
    us: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'TSLA', name: 'Tesla, Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'NFLX', name: 'Netflix Inc.' }
    ],
    kr: [
      { symbol: '005930.KS', name: '삼성전자' },
      { symbol: '000660.KS', name: 'SK하이닉스' },
      { symbol: '051910.KS', name: 'LG화학' },
      { symbol: '035420.KS', name: 'NAVER' },
      { symbol: '035720.KS', name: '카카오' },
      { symbol: '207940.KS', name: '삼성바이오로직스' },
      { symbol: '006400.KS', name: '삼성SDI' },
      { symbol: '068270.KS', name: '셀트리온' }
    ]
  };

  useEffect(() => {
    // 시장 변경시 기본 주식 목록 로드
    const stocks = market === 'kr' ? defaultStocks.kr : defaultStocks.us;
    setStockOptions(stocks);
    setSelectedStock(null);
    setSearchQuery('');
  }, [market]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      searchStocks(searchQuery);
    } else {
      const stocks = market === 'kr' ? defaultStocks.kr : defaultStocks.us;
      setStockOptions(stocks);
    }
  }, [searchQuery, market]);

  const searchStocks = async (query: string) => {
    setLoading(true);
    try {
      const response = await stockAPI.searchStocks(query);
      if (response.results) {
        setStockOptions(response.results);
      }
    } catch (error) {
      console.error('주식 검색 오류:', error);
      // 검색 실패시 기본 목록 사용
      const stocks = market === 'kr' ? defaultStocks.kr : defaultStocks.us;
      setStockOptions(stocks);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (event: any, newValue: StockOption | null) => {
    setSelectedStock(newValue);
    if (newValue) {
      onStockSelect(newValue.symbol, market);
    }
  };

  const handleMarketChange = (event: SelectChangeEvent) => {
    setMarket(event.target.value);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        AI 금융 분석기
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
        주식을 검색하고 AI 분석을 받아보세요
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="market-select-label">시장</InputLabel>
          <Select
            labelId="market-select-label"
            id="market-select"
            value={market}
            label="시장"
            onChange={handleMarketChange}
          >
            <MenuItem value="us">미국</MenuItem>
            <MenuItem value="kr">한국</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          sx={{ flex: 1, minWidth: 300 }}
          options={stockOptions}
          getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
          value={selectedStock}
          onChange={handleStockSelect}
          inputValue={searchQuery}
          onInputChange={(event, newInputValue) => {
            setSearchQuery(newInputValue);
          }}
          loading={loading}
          renderInput={(params) => {
            const { InputProps, ...otherParams } = params;
            return (
              <TextField
                {...otherParams}
                label={market === 'kr' ? '한국 주식 검색' : '미국 주식 검색'}
                placeholder={market === 'kr' ? '예: 삼성전자, 005930' : '예: Apple, AAPL'}
                variant="outlined"
                InputProps={{
                  ...InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {InputProps?.endAdornment}
                    </>
                  ),
                }}
              />
            );
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {option.symbol}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.name}
                </Typography>
              </Box>
            </Box>
          )}
        />
      </Box>
    </Box>
  );
};

export default StockSearch;