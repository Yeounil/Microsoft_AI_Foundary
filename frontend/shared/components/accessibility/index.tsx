'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 스크린 리더 전용 텍스트 (시각적으로 숨김)
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: 'rect(0, 0, 0, 0)' }}
    >
      {children}
    </span>
  );
}

// 스킵 네비게이션 링크
export function SkipToContent({ contentId = 'main-content' }: { contentId?: string }) {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      본문으로 건너뛰기
    </a>
  );
}

// 라이브 리전 (동적 콘텐츠 알림)
interface LiveRegionProps {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  className,
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// 로딩 상태 알림
export function LoadingAnnouncer({ isLoading, message = '로딩 중...' }: {
  isLoading: boolean;
  message?: string;
}) {
  return (
    <LiveRegion>
      {isLoading ? message : ''}
    </LiveRegion>
  );
}

// 에러 알림
export function ErrorAnnouncer({ error }: { error: string | null }) {
  return (
    <LiveRegion politeness="assertive">
      {error ? `오류: ${error}` : ''}
    </LiveRegion>
  );
}

// 포커스 트랩 (모달용)
export function FocusTrap({ children, active = true }: {
  children: ReactNode;
  active?: boolean;
}) {
  if (!active) return <>{children}</>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

// 키보드 네비게이션 힌트
export function KeyboardHint({ shortcut, action }: {
  shortcut: string;
  action: string;
}) {
  return (
    <span className="text-xs text-muted-foreground">
      <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs font-mono">
        {shortcut}
      </kbd>
      <span className="ml-1">{action}</span>
    </span>
  );
}

// 버튼 접근성 래퍼
interface AccessibleButtonProps {
  children: ReactNode;
  label?: string;
  description?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AccessibleButton({
  children,
  label,
  description,
  isLoading,
  isDisabled,
  className,
  onClick,
}: AccessibleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={description ? 'button-desc' : undefined}
      aria-busy={isLoading}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={cn(
        'focus-ring touch-target',
        className
      )}
    >
      {children}
      {description && (
        <VisuallyHidden>
          <span id="button-desc">{description}</span>
        </VisuallyHidden>
      )}
    </button>
  );
}
