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
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder
} from '@mui/icons-material';
import { stockAPI, recommendationAPI } from '../services/api';

interface StockSearchProps {
  onStockSelect: (symbol: string, market: string, companyName: string) => void;
  onAlert?: (message: string, severity: 'success' | 'error') => void;
}

interface StockOption {
  symbol: string;
  name: string;
}

interface UserInterest {
  symbol: string;
  market: string;
  company_name?: string;
}

const StockSearch: React.FC<StockSearchProps> = ({ onStockSelect, onAlert }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockOption | null>(null);
  const [market, setMarket] = useState<string>('us');
  const [loading, setLoading] = useState<boolean>(false);
  
  // 관심 종목 관련 상태
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState<string>(''); // 현재 처리 중인 종목

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

  // 컴포넌트 마운트 시 사용자 관심 종목 로드
  useEffect(() => {
    loadUserInterests();
  }, []);

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
      onStockSelect(newValue.symbol, market, newValue.name);
    }
  };

  const handleMarketChange = (event: SelectChangeEvent) => {
    setMarket(event.target.value);
  };

  // 사용자 관심 종목 로드
  const loadUserInterests = async () => {
    try {
      const response = await recommendationAPI.getUserInterests();
      setUserInterests(response.interests || []);
    } catch (error) {
      console.error('관심 종목 로드 오류:', error);
    }
  };

  // 종목이 관심 목록에 있는지 확인
  const isInFavorites = (symbol: string, market: string): boolean => {
    return userInterests.some(
      interest => interest.symbol === symbol && interest.market === market
    );
  };

  // 관심 종목 추가/제거 토글
  const toggleFavorite = async (stock: StockOption) => {
    const stockKey = `${stock.symbol}-${market}`;
    setFavoriteLoading(stockKey);
    
    try {
      const isFavorited = isInFavorites(stock.symbol, market);
      
      if (isFavorited) {
        // 관심 종목에서 제거
        await recommendationAPI.removeUserInterest(stock.symbol, market);
        if (onAlert) {
          onAlert(`${stock.symbol} (${stock.name})이 관심 목록에서 제거되었습니다.`, 'success');
        }
      } else {
        // 관심 종목에 추가
        await recommendationAPI.addUserInterest({
          symbol: stock.symbol,
          market: market,
          company_name: stock.name,
          priority: 2
        });
        if (onAlert) {
          onAlert(`${stock.symbol} (${stock.name})이 관심 목록에 추가되었습니다.`, 'success');
        }
      }
      
      // 관심 종목 목록 새로고침
      await loadUserInterests();
      
    } catch (error: any) {
      console.error('관심 종목 토글 오류:', error);
      if (onAlert) {
        onAlert(error.response?.data?.detail || '관심 종목 설정 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setFavoriteLoading('');
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
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
          renderOption={(props, option) => {
            const stockKey = `${option.symbol}-${market}`;
            const isFavorited = isInFavorites(option.symbol, market);
            const isLoading = favoriteLoading === stockKey;
            
            return (
              <Box 
                component="li" 
                {...props}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%'
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {option.symbol}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.name}
                  </Typography>
                </Box>
                
                <Tooltip title={isFavorited ? "관심 종목에서 제거" : "관심 종목에 추가"}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(option);
                    }}
                    disabled={isLoading}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={20} />
                    ) : isFavorited ? (
                      <Favorite color="error" />
                    ) : (
                      <FavoriteBorder color="action" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
};

export default StockSearch;