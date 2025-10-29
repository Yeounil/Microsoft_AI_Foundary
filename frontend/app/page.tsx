"use client";

import { useState } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { LoginPage } from '@/components/LoginPage';
import { RegisterPage } from '@/components/RegisterPage';
import { Dashboard } from '@/components/Dashboard';

type Page = 'landing' | 'login' | 'register' | 'dashboard';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [username, setUsername] = useState<string>('');
  const [token, setToken] = useState<string>('');

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
    setCurrentPage('dashboard');
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
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUsername('');
    setCurrentPage('landing');
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentPage('register');
  };

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
      {currentPage === 'dashboard' && (
        <Dashboard
          username={username}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
