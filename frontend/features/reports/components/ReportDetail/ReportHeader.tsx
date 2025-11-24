'use client';

import { ReportDetail } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ReportHeaderProps {
  report: ReportDetail;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mb-8">
      {/* 뒤로 가기 버튼 */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        목록으로 돌아가기
      </Button>

      {/* 제목 및 상태 */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">{report.symbol}</h1>
            <Badge
              variant={report.is_expired ? 'secondary' : 'default'}
              className={
                report.is_expired
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }
            >
              {report.is_expired ? '만료됨' : '유효'}
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">뉴스 분석 보고서</p>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>생성: {formatDate(report.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span>{report.analyzed_count}개 뉴스 분석</span>
        </div>
        {!report.is_expired && (
          <div className="flex items-center gap-2">
            <span>만료: {formatDate(report.expires_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
