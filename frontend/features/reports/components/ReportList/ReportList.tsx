'use client';

import { Report } from '@/types';
import { ReportCard } from './ReportCard';

interface ReportListProps {
  reports: Report[];
  onReportDeleted?: () => void;
}

export function ReportList({ reports, onReportDeleted }: ReportListProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">아직 생성된 분석 보고서가 없습니다.</p>
        <p className="text-sm mt-2">
          종목 대시보드에서 AI 분석 보고서를 생성해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} onDeleted={onReportDeleted} />
      ))}
    </div>
  );
}
