"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { authService } from '@/services/authService';
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

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        if (!token) {
          setShowAuthModal(true);
          setIsLoading(false);
          return;
        }

        const isValid = await authService.verifyToken();
        if (!isValid) {
          authService.logout();
          setShowAuthModal(true);
          setIsLoading(false);
          return;
        }

        // 토큰에서 사용자명 추출
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUsername(payload.sub || 'user');
        } catch {
          setUsername('user');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setShowAuthModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleLogout = () => {
    router.push('/main');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-secondary text-lg font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (showAuthModal) {
    return (
      <>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            로그인이 필요한 페이지입니다.
          </div>
        </div>
        <AlertDialog open={showAuthModal}>
          <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
            <AlertDialogHeader>
              <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
              <AlertDialogDescription>
                이 페이지를 이용하시려면 로그인이 필요합니다.
                로그인 페이지로 이동하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => router.push('/')}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleLoginRedirect}>
                로그인 페이지로 이동
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Dashboard
      username={username}
      onLogout={handleLogout}
    />
  );
}
