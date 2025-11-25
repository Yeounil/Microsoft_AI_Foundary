import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { AxiosError } from 'axios';

interface DeleteReportResponse {
  success: boolean;
  message: string;
  deleted_id: number;
}

export function useDeleteReport() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteReport = async (reportId: number): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      // apiClient 사용 - interceptor를 통해 토큰 자동 처리
      const response = await apiClient.delete<DeleteReportResponse>(
        `/api/v1/news-report/report/${reportId}`
      );

      return response.data.success;
    } catch (err) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';

      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = '레포트 삭제에 실패했습니다.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteReport,
    isDeleting,
    error,
  };
}
