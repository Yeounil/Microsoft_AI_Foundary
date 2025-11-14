'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute
 * 로그인한 사용자만 접근할 수 있는 페이지를 보호하는 컴포넌트
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();

  useEffect(() => {
    // hydration 완료 후, 로딩이 끝났고, 인증되지 않은 경우 로그인 페이지로 리다이렉트
    if (isHydrated && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, isHydrated]);

  // hydration 전이거나 로딩 중이거나 인증되지 않은 경우 아무것도 렌더링하지 않음
  if (!isHydrated || isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
