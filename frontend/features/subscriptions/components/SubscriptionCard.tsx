'use client';

import { useState } from 'react';
import { Subscription } from '../types';
import { useDeleteSubscription, useToggleSubscription, useSendTestEmail } from '../hooks/useSubscriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Mail, MoreVertical, Trash2, Send, Clock, Calendar, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';

interface SubscriptionCardProps {
  subscription: Subscription;
  onUpdate: () => void;
}

export function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteSubscription = useDeleteSubscription();
  const toggleSubscription = useToggleSubscription();
  const sendTestEmail = useSendTestEmail();

  const handleDelete = async () => {
    await deleteSubscription.mutateAsync(subscription.id);
    setShowDeleteDialog(false);
    onUpdate();
  };

  const handleToggle = async () => {
    await toggleSubscription.mutateAsync(subscription.id);
    onUpdate();
  };

  const handleSendTest = async () => {
    await sendTestEmail.mutateAsync(subscription.id);
  };

  const frequencyLabel = {
    daily: '매일',
    weekly: '매주',
    monthly: '매월',
  };

  const reportTypeLabels = {
    news: '뉴스',
    technical: '기술적 분석',
    comprehensive: '종합 분석',
  };

  return (
    <>
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md",
        !subscription.is_active && "opacity-60"
      )}>
        <CardHeader className="p-3 md:p-4 lg:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{subscription.email}</span>
                <Badge variant={subscription.is_active ? 'default' : 'secondary'} className="text-xs">
                  {subscription.is_active ? '활성' : '비활성'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {frequencyLabel[subscription.frequency]} {subscription.send_time} 발송
              </p>
            </div>

            {/* 드롭다운 메뉴 - 데스크탑/모바일 통일 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px]">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-4 lg:p-6 pt-0 md:pt-0 lg:pt-0">
          <div className="space-y-3">
            {/* 구독 종목 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">구독 종목</p>
              <div className="flex flex-wrap gap-1.5">
                {subscription.symbols.map((symbol) => (
                  <Badge key={symbol} variant="secondary" className="text-xs md:text-sm">
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 리포트 타입 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">리포트 유형</p>
              <div className="flex flex-wrap gap-1">
                {subscription.report_types.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {reportTypeLabels[type]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 세부 정보 - 반응형 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 text-xs text-muted-foreground">
              {/* 다음 발송 시간 */}
              {subscription.is_active && subscription.next_send_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  다음: {format(new Date(subscription.next_send_time), 'M/d HH:mm', { locale: ko })}
                </span>
              )}
              {subscription.is_active && subscription.next_send_time && (
                <span className="hidden md:inline text-muted-foreground/50">|</span>
              )}
              {/* 생성일 */}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                생성: {format(new Date(subscription.created_at), 'yyyy.M.d', { locale: ko })}
              </span>
            </div>

            {/* 하단: 활성화 토글 */}
            <div className="flex items-center justify-end pt-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {subscription.is_active ? '활성화' : '비활성화'}
                </span>
                <Switch checked={subscription.is_active} onCheckedChange={handleToggle} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 구독이 완전히 삭제되며 더 이상 이메일을 받지
              못합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 수정 다이얼로그 */}
      <EditSubscriptionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        subscription={subscription}
        onSuccess={() => {
          setShowEditDialog(false);
          onUpdate();
        }}
      />
    </>
  );
}
