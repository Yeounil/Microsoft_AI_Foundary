import apiClient from '@/lib/api-client';
import type { Report, ReportDetail, MyReportsResponse } from '@/types';

/**
 * 내 레포트 목록 조회
 */
export async function getMyReports(
  limit: number = 20,
  offset: number = 0
): Promise<MyReportsResponse> {
  const response = await apiClient.get<MyReportsResponse>('/api/v1/news-report/my-reports', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * 특정 레포트 상세 조회
 */
export async function getReportById(reportId: number): Promise<ReportDetail> {
  const response = await apiClient.get<ReportDetail>(`/api/v1/news-report/report/${reportId}`);
  return response.data;
}

/**
 * 심볼로 최신 레포트 조회
 */
export async function getReportBySymbol(symbol: string): Promise<ReportDetail> {
  const response = await apiClient.get<ReportDetail>(`/api/v1/news-report/${symbol.toUpperCase()}`);
  return response.data;
}

/**
 * 새 레포트 생성
 */
export async function createReport(
  symbol: string,
  limit: number = 20
): Promise<ReportDetail> {
  const response = await apiClient.post<ReportDetail>('/api/v1/news-report', {
    symbol: symbol.toUpperCase(),
    limit,
  });
  return response.data;
}
