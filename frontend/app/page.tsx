"use client";

import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { LoginPage } from '@/components/LoginPage';
import { RegisterPage } from '@/components/RegisterPage';
import { MainPage } from '@/components/MainPage';
import { Dashboard } from '@/components/Dashboard';
import { authService } from '@/services/authService';

type Page = 'landing' | 'login' | 'register' | 'main' | 'dashboard';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [username, setUsername] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 실행되도록 보장
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 페이지 로드 시 JWT 토큰 확인 및 자동 로그인
  useEffect(() => {
    if (!isMounted) return;

    const checkAuthStatus = async () => {
      try {
        const savedToken = authService.getToken();

        if (savedToken) {
          // 토큰이 있으면 유효성 검증
          const isValid = await authService.verifyToken();

          if (isValid) {
            // 토큰이 유효하면 사용자 정보 추출
            try {
              const payload = JSON.parse(atob(savedToken.split('.')[1]));
              setUsername(payload.sub || 'user');
              setToken(savedToken);
              setCurrentPage('main');
            } catch (error) {
              console.error('Failed to parse token:', error);
              authService.logout();
            }
          } else {
            // 토큰이 유효하지 않으면 로그아웃 처리
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [isMounted]);

  const handleGetStarted = () => {
    setCurrentPage('login');
  };

  const handleLogin = (accessToken: string) => {
    setToken(accessToken);
    // 토큰에서 사용자명 추출 (선택적)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setUsername(payload.sub || 'user');
    } catch {
      setUsername('user');
    }
    setCurrentPage('main'); // 메인 페이지로 이동
  };

  const handleRegister = (accessToken: string) => {
    setToken(accessToken);
    // 토큰에서 사용자명 추출
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setUsername(payload.sub || 'user');
    } catch {
      setUsername('user');
    }
    setCurrentPage('main'); // 메인 페이지로 이동
  };

  const handleLogout = () => {
    setUsername('');
    setToken('');
    setCurrentPage('landing');
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentPage('register');
  };

  const handleNavigateToAnalysis = () => {
    setCurrentPage('dashboard');
  };

  const handleNavigateToWatchlist = () => {
    setCurrentPage('dashboard');
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
  };

  // 클라이언트 마운트 전에는 기본 화면 표시
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-secondary text-lg font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}
      {currentPage === 'login' && (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}
      {currentPage === 'register' && (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
      {currentPage === 'main' && (
        <MainPage
          username={username}
          onLogout={handleLogout}
          onNavigateToAnalysis={handleNavigateToAnalysis}
          onNavigateToWatchlist={handleNavigateToWatchlist}
        />
      )}
      {currentPage === 'dashboard' && (
        <Dashboard
          username={username}
          onLogout={handleBackToMain}
        />
      )}
    </>
  );
}
