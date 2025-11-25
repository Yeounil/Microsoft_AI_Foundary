'use client';

import { useState } from 'react';
import { useMyReports } from '@/features/reports/hooks/useMyReports';
import { ReportList, ReportPagination } from '@/features/reports/components/ReportList';
import { PageLoading } from '@/shared/components/LoadingSpinner';
import { AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PAGE_SIZE = 10;

export default function ProfilePage() {
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, isLoading, error, refetch } = useMyReports(PAGE_SIZE, offset);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReportDeleted = () => {
    // 레포트 삭제 후 목록 새로고침
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">내 분석 보고서</h1>
        </div>
        <p className="text-muted-foreground">
          AI가 생성한 종목 뉴스 분석 보고서를 확인하세요
        </p>
      </div>

      {/* 로딩 상태 */}
      {isLoading && <PageLoading message="보고서 목록을 불러오는 중..." />}

      {/* 에러 상태 */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              오류가 발생했습니다
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">
              보고서 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && data && (
        <>
          {/* 통계 정보 */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              전체 <span className="font-semibold text-foreground">{data.total_count}개</span>의
              보고서
            </p>
          </div>

          {/* 레포트 리스트 */}
          <ReportList reports={data.reports} onReportDeleted={handleReportDeleted} />

          {/* 페이지네이션 */}
          <ReportPagination
            currentPage={page}
            totalCount={data.total_count}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
