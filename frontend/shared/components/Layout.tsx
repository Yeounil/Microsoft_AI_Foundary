'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '@/store/auth-store';
import { useStockStore } from '@/store/stock-store';
import { useLoadingStore } from '@/store/loading-store';
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
  const { fetchUser, showSessionExpiredDialog, setSessionExpired, logout, isAuthenticated } = useAuthStore();
  const { loadWatchlist } = useStockStore();
  const { isChartLoading } = useLoadingStore();

  useEffect(() => {
    // Check authentication status on mount
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Load watchlist when user is authenticated
    if (isAuthenticated) {
      loadWatchlist();
    }
  }, [isAuthenticated, loadWatchlist]);

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
      {/* Global Loading Progress Bar */}
      {isChartLoading && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
          <div className="h-full bg-primary animate-progress-indeterminate" />
        </div>
      )}

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