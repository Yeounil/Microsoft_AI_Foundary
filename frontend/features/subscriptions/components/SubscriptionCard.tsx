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
import { Mail, MoreVertical, Trash2, Send, Clock, Calendar } from 'lucide-react';
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
      <Card className={!subscription.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{subscription.email}</CardTitle>
                <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                  {subscription.is_active ? '활성' : '비활성'}
                </Badge>
              </div>
              <CardDescription>
                {frequencyLabel[subscription.frequency]} {subscription.send_time} 발송
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  수정
                </DropdownMenuItem>
                {/* DNS 미설정으로 인한 테스트 발송 기능 임시 비활성화 */}
                {/* <DropdownMenuItem onClick={handleSendTest}>
                  <Send className="mr-2 h-4 w-4" />
                  테스트 발송
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* 구독 종목 */}
            <div>
              <p className="text-sm font-medium mb-2">구독 종목</p>
              <div className="flex flex-wrap gap-2">
                {subscription.symbols.map((symbol) => (
                  <Badge key={symbol} variant="outline">
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 리포트 타입 */}
            <div>
              <p className="text-sm font-medium mb-2">리포트 유형</p>
              <div className="flex flex-wrap gap-2">
                {subscription.report_types.map((type) => (
                  <Badge key={type} variant="secondary">
                    {reportTypeLabels[type]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 다음 발송 시간 */}
            {subscription.is_active && subscription.next_send_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  다음 발송:{' '}
                  {format(new Date(subscription.next_send_time), 'yyyy년 M월 d일 HH:mm', {
                    locale: ko,
                  })}
                </span>
              </div>
            )}

            {/* 생성일 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                생성일:{' '}
                {format(new Date(subscription.created_at), 'yyyy년 M월 d일', { locale: ko })}
              </span>
            </div>

            {/* 활성화 토글 */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">구독 활성화</span>
              <Switch checked={subscription.is_active} onCheckedChange={handleToggle} />
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
