'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';

/**
 * Redirect page: news-report/[symbol] → reports/[id]
 *
 * 이 페이지는 레거시 URL을 위한 리다이렉트 페이지입니다.
 * symbol을 기반으로 가장 최신 레포트를 찾아 reports/[id]로 리다이렉트합니다.
 */
export default function NewsReportRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.id as string;

  useEffect(() => {
    const redirectToReport = async () => {
      try {
        // symbol로 최신 레포트 조회
        const response = await apiClient.getNewsReport(symbol.toUpperCase());

        if (response.id) {
          // reports/[id]로 리다이렉트
          router.replace(`/reports/${response.id}`);
        } else {
          // ID가 없으면 뉴스 분석 페이지로 이동
          router.replace('/main');
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
        // 오류 시 메인으로 이동
        router.replace('/main');
      }
    };

    if (symbol) {
      redirectToReport();
    }
  }, [symbol, router]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">레포트 페이지로 이동 중...</p>
        </div>
      </div>
    </div>
  );
}
