import { useQuery } from '@tanstack/react-query';
import { getMyReports } from '@/lib/api/newsReportApi';

/**
 * 내 레포트 목록 조회 훅
 * @param limit 조회할 레포트 개수
 * @param offset 건너뛸 레포트 개수 (페이징)
 */
export function useMyReports(limit: number = 10, offset: number = 0) {
  return useQuery({
    queryKey: ['myReports', limit, offset],
    queryFn: () => getMyReports(limit, offset),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 보관
  });
}
