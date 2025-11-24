'use client';

import { cn } from '@/lib/utils';

// 기본 스켈레톤 컴포넌트
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
}

// 종목 카드 스켈레톤
export function StockCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

// 뉴스 카드 스켈레톤
export function NewsCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// 차트 영역 스켈레톤
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      {/* 차트 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      {/* 차트 영역 */}
      <Skeleton className="h-[300px] w-full" />
      {/* 기간 선택 */}
      <div className="flex gap-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-12" />
        ))}
      </div>
    </div>
  );
}

// 뉴스 리스트 스켈레톤
export function NewsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// 종목 리스트 스켈레톤
export function StockListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <StockCardSkeleton key={i} />
      ))}
    </div>
  );
}

// 분석 섹션 스켈레톤
export function AnalysisSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <Skeleton className="h-[120px] w-full" />
    </div>
  );
}

// 프로필/유저 스켈레톤
export function UserProfileSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// 테이블 행 스켈레톤
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

// 페이지 전체 스켈레톤
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* 콘텐츠 그리드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ChartSkeleton />
        <div className="space-y-4">
          <AnalysisSkeleton />
          <NewsListSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
