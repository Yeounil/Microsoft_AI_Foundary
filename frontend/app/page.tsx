"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';
import { authService } from '@/services/authService';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const isValid = await authService.verifyToken();
          if (isValid) {
            router.push('/main');
            return;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleGetStarted = () => {
    router.push('/login');
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

  return <LandingPage onGetStarted={handleGetStarted} />;
}
