'use client';

import { useState } from 'react';
import { useSubscriptions } from '@/features/subscriptions/hooks/useSubscriptions';
import { SubscriptionList } from '@/features/subscriptions/components/SubscriptionList';
import { CreateSubscriptionDialog } from '@/features/subscriptions/components/CreateSubscriptionDialog';
import { PageLoading } from '@/shared/components/LoadingSpinner';
import { AlertCircle, Bell, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SubscriptionsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: subscriptions, isLoading, error, refetch } = useSubscriptions();

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  return (
    <div className="container mx-auto py-6 px-3 md:py-8 md:px-4 max-w-7xl">
      {/* 헤더 - 반응형 */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">내 구독 종목</h1>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full sm:w-auto min-h-[44px] gap-2"
            disabled={subscriptions && subscriptions.length >= 5}
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">추가</span>
            <span className="hidden sm:inline">새 구독 추가</span>
          </Button>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          관심 종목의 뉴스와 분석 레포트를 이메일로 받아보세요
        </p>
        {subscriptions && subscriptions.length >= 5 && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
            최대 5개까지 구독할 수 있습니다
          </p>
        )}
      </div>

      {/* 로딩 상태 */}
      {isLoading && <PageLoading message="구독 목록을 불러오는 중..." />}

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
              구독 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 데이터 표시 */}
      {!isLoading && !error && subscriptions && (
        <>
          {/* 통계 정보 */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              전체 <span className="font-semibold text-foreground">{subscriptions.length}개</span>의
              구독 (최대 5개)
            </p>
          </div>

          {/* 구독 리스트 */}
          {subscriptions.length > 0 ? (
            <SubscriptionList subscriptions={subscriptions} onUpdate={refetch} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">구독 중인 종목이 없습니다</p>
                <p className="text-sm text-muted-foreground mb-4">
                  관심 종목을 구독하고 정기적으로 리포트를 받아보세요
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  첫 구독 추가하기
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 구독 생성 다이얼로그 */}
      <CreateSubscriptionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
