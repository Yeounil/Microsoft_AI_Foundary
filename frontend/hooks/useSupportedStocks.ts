'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface StockInfo {
  symbol: string;
  name: string;
}

interface SupportedStocksData {
  stocks: StockInfo[];
  categories: Record<string, string[]>;
}

// 빈 배열/객체 상수 (참조 안정성)
const EMPTY_STOCKS: StockInfo[] = [];
const EMPTY_SYMBOLS: string[] = [];
const EMPTY_CATEGORIES: Record<string, string[]> = {};

export function useSupportedStocks() {
  const { data, isLoading, error } = useQuery<SupportedStocksData>({
    queryKey: ['supported-stocks-with-names'],
    queryFn: async () => {
      // 1. 지원 종목 목록 가져오기
      const supportedResponse = await apiClient.getSupportedStocks();
      const symbols: string[] = supportedResponse.all_symbols || [];
      const categories = supportedResponse.categories || {};

      // 2. 종목 상세 정보 (이름 포함) 가져오기
      if (symbols.length === 0) {
        return { stocks: [], categories };
      }

      try {
        const quotesResponse = await apiClient.getBatchQuotes(symbols);
        const quotes = quotesResponse.quotes || [];

        // quotes에서 symbol과 name 매핑
        const stockInfoMap = new Map<string, string>();
        quotes.forEach((quote: { symbol: string; name?: string }) => {
          if (quote.symbol && quote.name) {
            stockInfoMap.set(quote.symbol, quote.name);
          }
        });

        // 종목 정보 배열 생성
        const stocks: StockInfo[] = symbols.map((symbol) => ({
          symbol,
          name: stockInfoMap.get(symbol) || symbol,
        }));

        return { stocks, categories };
      } catch {
        // quotes 가져오기 실패 시 symbol만 사용
        const stocks: StockInfo[] = symbols.map((symbol) => ({
          symbol,
          name: symbol,
        }));
        return { stocks, categories };
      }
    },
    staleTime: 5 * 60 * 1000,  // 5분 캐시
    gcTime: 30 * 60 * 1000,    // 30분간 GC 방지
  });

  // useMemo로 참조 안정성 보장
  const stocks = useMemo(() => data?.stocks ?? EMPTY_STOCKS, [data?.stocks]);
  const stockSymbols = useMemo(
    () => data?.stocks?.map(s => s.symbol) ?? EMPTY_SYMBOLS,
    [data?.stocks]
  );
  const categories = useMemo(
    () => data?.categories ?? EMPTY_CATEGORIES,
    [data?.categories]
  );

  return {
    stocks,
    stockSymbols,
    categories,
    isLoading,
    error,
  };
}
