import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { StockPriceData } from '@/types';

interface UseChartDataOptions {
  symbol: string;
  period?: string;
  interval?: string;
  enabled?: boolean;
}

interface ChartDataResponse {
  symbol: string;
  company_name: string;
  current_price: number;
  currency: string;
  chart_data: StockPriceData[];
  cache_info?: string;
}

/**
 * 차트 데이터를 가져오는 React Query 훅
 * - 자동 캐싱 (기간에 따라 다름)
 * - 중복 요청 방지
 * - 로딩/에러 상태 관리
 */
export function useChartData({
  symbol,
  period = '1mo',
  interval = '1d',
  enabled = true,
}: UseChartDataOptions) {
  // 기간에 따라 캐싱 시간 다르게 설정
  // 1mo (1D 범위용): 30초 캐싱 (실시간에 가까움)
  // 그 외 (1M, 3M, 1Y 등): 5분 캐싱 (일별 데이터는 자주 변하지 않음)
  const staleTime = period === '1mo' ? 30 * 1000 : 5 * 60 * 1000;
  const gcTime = period === '1mo' ? 2 * 60 * 1000 : 10 * 60 * 1000;

  return useQuery<ChartDataResponse>({
    queryKey: ['chart-data', symbol, period, interval],
    queryFn: async () => {
      const data = await apiClient.getChartData(symbol, period, interval);
      return data;
    },
    enabled: enabled && !!symbol,
    staleTime, // 30초 또는 5분
    gcTime, // 2분 또는 10분
    retry: 2, // 차트는 중요하므로 2번 재시도
    refetchInterval: period === '1mo' ? 30 * 1000 : false, // 1D 범위는 30초마다 자동 갱신
  });
}

/**
 * 여러 심볼의 차트 데이터를 병렬로 가져오는 훅
 */
export function useMultipleChartData(
  symbols: string[],
  period: string = '1mo',
  interval: string = '1d'
) {
  return useQuery({
    queryKey: ['chart-data-multiple', symbols, period, interval],
    queryFn: async () => {
      const results = await Promise.all(
        symbols.map((symbol) =>
          apiClient.getChartData(symbol, period, interval)
        )
      );
      return results;
    },
    enabled: symbols.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
