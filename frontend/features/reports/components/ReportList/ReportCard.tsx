'use client';

import { Report } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Calendar, TrendingUp } from 'lucide-react';

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/reports/${report.id}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 group"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-primary group-hover:text-primary/80 transition-colors">
              {report.symbol}
            </h3>
          </div>
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
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>{report.analyzed_count}개 뉴스 분석</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(report.created_at)}</span>
        </div>

        {!report.is_expired && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            만료: {formatDate(report.expires_at)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
