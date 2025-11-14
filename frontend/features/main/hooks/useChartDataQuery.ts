import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { ChartInterval, TimeRange } from '../services/chartService';

interface ChartDataQueryParams {
  symbol: string;
  period?: TimeRange;
  interval?: ChartInterval;
  enabled?: boolean;
}

/**
 * useChartDataQuery
 * Chart 데이터를 가져오는 React Query hook
 * - 자동 캐싱
 * - 같은 파라미터로 재요청 시 캐시된 데이터 반환
 */
export function useChartDataQuery({
  symbol,
  period,
  interval,
  enabled = true,
}: ChartDataQueryParams) {
  return useQuery({
    queryKey: ['chart-data', symbol, period, interval],
    queryFn: () => apiClient.getChartData(symbol, period, interval),
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분
  });
}
