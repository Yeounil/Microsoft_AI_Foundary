'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export default function Layout({ children, showFooter = true }: LayoutProps) {
  const router = useRouter();
  const { fetchUser, showSessionExpiredDialog, setSessionExpired, logout } = useAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Listen for session expired event
    const handleSessionExpired = () => {
      logout(); // Clear auth state
      setSessionExpired(true);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [logout, setSessionExpired]);

  const handleGoToLogin = () => {
    setSessionExpired(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}

      {/* Session Expired Dialog */}
      <AlertDialog open={showSessionExpiredDialog} onOpenChange={setSessionExpired}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세션이 만료되었습니다</AlertDialogTitle>
            <AlertDialogDescription>
              로그인 세션이 만료되어 자동으로 로그아웃되었습니다.
              <br />
              다시 로그인해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleGoToLogin} className="cursor-pointer">
              로그인 페이지로 이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}