'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function BeforeLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();

  useEffect(() => {
    // hydration 완료 후, 로딩이 끝났고, 이미 인증된 경우 메인 페이지로 리다이렉트
    if (isHydrated && !isLoading && isAuthenticated) {
      router.replace('/main');
    }
  }, [isAuthenticated, isLoading, router, isHydrated]);

  return <>{children}</>;
}
