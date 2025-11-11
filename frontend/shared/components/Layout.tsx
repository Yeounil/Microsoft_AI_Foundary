'use client';

import { ReactNode, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '@/store/auth-store';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export default function Layout({ children, showFooter = true }: LayoutProps) {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}