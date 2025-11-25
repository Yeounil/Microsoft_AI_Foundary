'use client';

import { Report } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { useDeleteReport } from '@/features/reports/hooks/useDeleteReport';
import { useState } from 'react';
import { toast } from 'sonner';

interface ReportCardProps {
  report: Report;
  onDeleted?: () => void;
}

export function ReportCard({ report, onDeleted }: ReportCardProps) {
  const router = useRouter();
  const { deleteReport, isDeleting } = useDeleteReport();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCardClick = () => {
    router.push(`/reports/${report.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    const success = await deleteReport(report.id);
    if (success) {
      toast.success('레포트가 삭제되었습니다.');
      onDeleted?.();
    } else {
      toast.error('레포트 삭제에 실패했습니다.');
    }
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card
        onClick={handleCardClick}
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="레포트 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>레포트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 레포트를 삭제하시겠습니까?
              <br />
              <span className="font-semibold text-foreground">{report.symbol}</span> 레포트는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니요</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? '삭제 중...' : '예'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
