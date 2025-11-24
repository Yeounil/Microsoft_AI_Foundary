import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface IntradayDataQueryParams {
  symbol: string;
  interval: string;
  fromDate?: string;
  toDate?: string;
  enabled?: boolean;
}

/**
 * useIntradayDataQuery
 * 분단위(Intraday) 데이터를 가져오는 React Query hook
 * - 자동 캐싱
 * - 같은 파라미터로 재요청 시 캐시된 데이터 반환
 */
export function useIntradayDataQuery({
  symbol,
  interval,
  fromDate,
  toDate,
  enabled = true,
}: IntradayDataQueryParams) {
  return useQuery({
    queryKey: ['intraday-data', symbol, interval, fromDate, toDate],
    queryFn: () => apiClient.getIntradayData(symbol, interval, fromDate, toDate),
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분
  });
}
