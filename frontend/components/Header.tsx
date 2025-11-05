"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Bell, Menu, X, Moon, Sun, LogOut } from 'lucide-react';
import { authService } from '@/services/authService';
import Image from 'next/image';
import myLogo from '@/assets/myLogo.png';

interface HeaderProps {
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function Header({ isDarkMode = false, onToggleDarkMode }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUsername(payload.sub || 'user');
          setIsLoggedIn(true);
        } catch {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/');
  };

  const handleNavigateToAnalysis = () => {
    router.push('/dashboard');
  };

  const handleNavigateToWatchlist = () => {
    router.push('/dashboard');
  };

  const handleNavigateToMain = () => {
    router.push('/main');
  };

  // 로그인 페이지나 회원가입 페이지에서는 헤더를 보이지 않게
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return null;
  }

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${isDarkMode ? 'bg-kakao-bg-dark-secondary border-kakao-bg-dark-tertiary' : 'bg-white border-kakao-border-light'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Image
              src={myLogo}
              alt="Logo"
              width={100}
              height={32}
              priority
              className="cursor-pointer"
              onClick={() => router.push('/main')}
            />

            {/* Desktop Navigation */}
            {isLoggedIn && (
              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={handleNavigateToMain}
                  className={`font-semibold ${isDarkMode ? 'text-kakao-yellow-light hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown-dark hover:bg-kakao-yellow/10'}`}
                >
                  홈
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleNavigateToAnalysis}
                  className={`font-medium ${isDarkMode ? 'text-gray-300 hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown hover:bg-gray-100'}`}
                >
                  종목분석
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleNavigateToWatchlist}
                  className={`font-medium ${isDarkMode ? 'text-gray-300 hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown hover:bg-gray-100'}`}
                >
                  관심종목
                </Button>
              </nav>
            )}
          </div>

          {/* Right Actions */}
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              {onToggleDarkMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleDarkMode}
                  className={`hidden sm:flex ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className={`hidden sm:flex relative ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
              </Button>

              {/* User Menu */}
              <div className="hidden sm:flex items-center gap-3 ml-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className={`gap-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isLoggedIn && showMobileMenu && (
        <div className={`md:hidden border-t ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
          <div className="px-4 py-3 space-y-1">
            <Button
              variant="ghost"
              onClick={handleNavigateToMain}
              className={`w-full justify-start ${isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-900 hover:bg-slate-100'}`}
            >
              홈
            </Button>
            <Button
              variant="ghost"
              onClick={handleNavigateToAnalysis}
              className={`w-full justify-start ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              종목분석
            </Button>
            <Button
              variant="ghost"
              onClick={handleNavigateToWatchlist}
              className={`w-full justify-start ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              관심종목
            </Button>
            <div className={`flex items-center justify-between pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{username}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={`gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
