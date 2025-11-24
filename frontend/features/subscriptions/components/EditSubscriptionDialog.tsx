'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateSubscription } from '../hooks/useSubscriptions';
import { Subscription, UpdateSubscriptionRequest } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { StockSymbolInput } from './StockSymbolInput';

interface EditSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  onSuccess: () => void;
}

export function EditSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: EditSubscriptionDialogProps) {
  const updateSubscription = useUpdateSubscription();
  const [symbols, setSymbols] = useState<string[]>(subscription.symbols);
  const [reportTypes, setReportTypes] = useState<('news' | 'technical' | 'comprehensive')[]>(
    subscription.report_types
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<UpdateSubscriptionRequest>({
      defaultValues: {
        email: subscription.email,
        frequency: subscription.frequency,
        send_time: subscription.send_time,
        timezone: subscription.timezone,
      },
    });

  useEffect(() => {
    setSymbols(subscription.symbols);
    setReportTypes(subscription.report_types);
    setValue('email', subscription.email);
    setValue('frequency', subscription.frequency);
    setValue('send_time', subscription.send_time);
    setValue('timezone', subscription.timezone);
  }, [subscription, setValue]);

  const onSubmit = async (data: UpdateSubscriptionRequest) => {
    if (symbols.length === 0) {
      alert('최소 1개 이상의 종목을 선택해주세요');
      return;
    }

    if (reportTypes.length === 0) {
      alert('최소 1개 이상의 리포트 유형을 선택해주세요');
      return;
    }

    // send_time을 HH:MM:SS 형식으로 변환
    const sendTime = data.send_time && data.send_time.includes(':') && data.send_time.split(':').length === 2
      ? `${data.send_time}:00`
      : data.send_time;

    await updateSubscription.mutateAsync({
      id: subscription.id,
      data: {
        ...data,
        send_time: sendTime,
        symbols,
        report_types: reportTypes,
      },
    });

    onSuccess();
  };

  const handleReportTypeChange = (
    type: 'news' | 'technical' | 'comprehensive',
    checked: boolean
  ) => {
    if (checked) {
      setReportTypes([...reportTypes, type]);
    } else {
      setReportTypes(reportTypes.filter((t) => t !== type));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>구독 수정</DialogTitle>
          <DialogDescription>구독 설정을 변경합니다</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소 *</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register('email', { required: '이메일을 입력해주세요' })}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* 구독 종목 */}
          <div className="space-y-2">
            <Label>구독 종목 *</Label>
            <StockSymbolInput
              symbols={symbols}
              onChange={setSymbols}
              placeholder="종목 코드를 입력하세요 (예: AAPL, TSLA)"
            />
            <p className="text-sm text-muted-foreground">
              {symbols.length}개 선택됨 (최소 1개)
            </p>
          </div>

          {/* 발송 주기 */}
          <div className="space-y-2">
            <Label htmlFor="frequency">발송 주기 *</Label>
            <Select
              value={watch('frequency')}
              onValueChange={(value) =>
                setValue('frequency', value as 'daily' | 'weekly' | 'monthly')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">매일</SelectItem>
                <SelectItem value="weekly">매주 (월요일)</SelectItem>
                <SelectItem value="monthly">매월 (1일)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 발송 시간 */}
          <div className="space-y-2">
            <Label htmlFor="send_time">발송 시간 *</Label>
            <Input
              id="send_time"
              type="time"
              {...register('send_time', { required: '발송 시간을 선택해주세요' })}
            />
            {errors.send_time && (
              <p className="text-sm text-red-600">{errors.send_time.message}</p>
            )}
          </div>

          {/* 타임존 */}
          <div className="space-y-2">
            <Label htmlFor="timezone">시간대 *</Label>
            <Select
              value={watch('timezone')}
              onValueChange={(value) => setValue('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Seoul">한국 (Asia/Seoul)</SelectItem>
                <SelectItem value="America/New_York">뉴욕 (America/New_York)</SelectItem>
                <SelectItem value="Europe/London">런던 (Europe/London)</SelectItem>
                <SelectItem value="Asia/Tokyo">도쿄 (Asia/Tokyo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 리포트 유형 */}
          <div className="space-y-3">
            <Label>리포트 유형 * (최소 1개 선택)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="news-edit"
                  checked={reportTypes.includes('news')}
                  onCheckedChange={(checked) =>
                    handleReportTypeChange('news', checked as boolean)
                  }
                />
                <Label htmlFor="news-edit" className="font-normal cursor-pointer">
                  뉴스 분석 리포트
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="technical-edit"
                  checked={reportTypes.includes('technical')}
                  onCheckedChange={(checked) =>
                    handleReportTypeChange('technical', checked as boolean)
                  }
                />
                <Label htmlFor="technical-edit" className="font-normal cursor-pointer">
                  기술적 분석 리포트
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comprehensive-edit"
                  checked={reportTypes.includes('comprehensive')}
                  onCheckedChange={(checked) =>
                    handleReportTypeChange('comprehensive', checked as boolean)
                  }
                />
                <Label htmlFor="comprehensive-edit" className="font-normal cursor-pointer">
                  종합 분석 리포트
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateSubscription.isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={updateSubscription.isPending}>
              {updateSubscription.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              수정 완료
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
