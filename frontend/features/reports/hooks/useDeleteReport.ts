import { useState } from 'react';

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
      // Get access token from localStorage (same pattern as api-client.ts)
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/news-report/report/${reportId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '레포트 삭제에 실패했습니다.');
      }

      const data: DeleteReportResponse = await response.json();
      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
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
