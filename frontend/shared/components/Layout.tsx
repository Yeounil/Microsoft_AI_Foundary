'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import BottomNavigation from './BottomNavigation';
import SidebarNavigation from './SidebarNavigation';
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
  const pathname = usePathname();
  const { fetchUser, showSessionExpiredDialog, setSessionExpired, logout, isAuthenticated } = useAuthStore();
  const { loadWatchlist } = useStockStore();
  const { isChartLoading } = useLoadingStore();

  // Check if current page is login/register
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';

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
        <div className="fixed top-0 left-0 right-0 z-100 h-1 bg-transparent">
          <div className="h-full bg-primary animate-progress-indeterminate" />
        </div>
      )}

      {/* Desktop Sidebar - Hidden for now, kept for future use */}
      <aside className="hidden">
        <div className="sticky top-0 h-screen flex flex-col">
          <SidebarNavigation />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-4 md:px-6 lg:px-8">{children}</main>
        {showFooter && <Footer />}
      </div>

      {/* Bottom Navigation - Hidden for now, kept for future use */}
      <div className="hidden">
        <BottomNavigation />
      </div>

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