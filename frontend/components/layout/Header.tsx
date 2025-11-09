'use client';

import { useState } from 'react';
import { Bell, User, LogIn, LogOut, Search, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  timestamp: string;
}

export function Header() {
  const router = useRouter();
  const { isLoggedIn, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', message: '삼성전자 주가가 5% 상승했습니다.', isRead: false, timestamp: '5분 전' },
    { id: '2', message: '새로운 AI 분석 결과가 도착했습니다.', isRead: false, timestamp: '1시간 전' },
    { id: '3', message: 'KOSPI 지수 주요 뉴스가 업데이트되었습니다.', isRead: true, timestamp: '2시간 전' },
  ]);
  const [activeMenu, setActiveMenu] = useState('홈');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'KR' | 'US'>('KR');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteReadNotifications = () => {
    setNotifications(notifications.filter(n => !n.isRead));
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-[1600px]">
        {/* 좌측: 로고 + 메뉴 */}
        <div className="flex items-center gap-8">
          {/* 로고 */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 font-bold text-base">AI 증권분석</span>
          </div>

          {/* 메뉴 */}
          <nav className="flex items-center gap-1">
            {['홈', '관심', '발견'].map((menu) => (
              <button
                key={menu}
                onClick={() => setActiveMenu(menu)}
                className={`px-4 py-2 text-sm transition-colors cursor-pointer ${
                  activeMenu === menu
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 font-medium'
                }`}
              >
                {menu}
              </button>
            ))}
          </nav>
        </div>

        {/* 중앙: 종목 검색 */}
        <div className="flex-1 max-w-[480px] mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="종목명 또는 종목코드 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 bg-white rounded-lg text-sm"
            />
          </div>
        </div>

        {/* 우측: 알림 + 로그인/로그아웃 + 프로필 */}
        <div className="flex items-center gap-1">
          {/* 알림 버튼 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 bg-white border border-gray-200 shadow-lg rounded-lg p-0" align="end">
              <div className="space-y-0">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h4 className="text-gray-900 font-semibold text-sm">알림</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      모두 읽음
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deleteReadNotifications}
                      className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      읽은 알림 삭제
                    </Button>
                  </div>
                </div>
                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">알림이 없습니다</p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 ${
                          notification.isRead
                            ? 'bg-white'
                            : 'bg-blue-50'
                        } hover:bg-gray-50 transition-colors cursor-pointer`}
                      >
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 로그인/로그아웃 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isLoggedIn ? handleLogout : handleLogin}
            className="gap-1.5 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium text-sm px-3"
          >
            {isLoggedIn ? (
              <>
                <LogOut className="h-4 w-4" />
                로그아웃
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                로그인
              </>
            )}
          </Button>

          {/* 프로필 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <User className="h-5 w-5" />
          </Button>

          {/* 언어 선택 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-10 text-sm px-3">
                <span className="font-medium">{language}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-28 bg-white border border-gray-200 shadow-lg rounded-lg p-1">
              <DropdownMenuItem
                onClick={() => setLanguage('KR')}
                className={`cursor-pointer rounded text-sm transition-colors ${
                  language === 'KR'
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
              >
                한국어
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('US')}
                className={`cursor-pointer rounded text-sm transition-colors ${
                  language === 'US'
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
