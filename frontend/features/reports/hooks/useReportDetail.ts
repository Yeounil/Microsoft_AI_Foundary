import { useQuery } from '@tanstack/react-query';
import { getReportById } from '@/lib/api/newsReportApi';

/**
 * 레포트 상세 조회 훅
 * @param reportId 레포트 ID
 */
export function useReportDetail(reportId: number) {
  return useQuery({
    queryKey: ['reportDetail', reportId],
    queryFn: () => getReportById(reportId),
    enabled: !!reportId && reportId > 0, // reportId가 유효할 때만 실행
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지
    gcTime: 30 * 60 * 1000, // 30분간 캐시 보관
  });
}
