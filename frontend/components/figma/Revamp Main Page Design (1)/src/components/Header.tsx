import { useState } from 'react';
import { Bell, User, LogIn, LogOut, Search, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  timestamp: string;
}

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
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
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <header className="w-full border-b border-border bg-card sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1600px]">
        {/* 좌측: 로고 + 메뉴 */}
        <div className="flex items-center gap-8">
          {/* 로고 */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-foreground font-semibold">AI 증권분석</span>
          </div>

          {/* 메뉴 */}
          <nav className="flex items-center gap-1">
            {['홈', '관심', '발견'].map((menu) => (
              <button
                key={menu}
                onClick={() => setActiveMenu(menu)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeMenu === menu
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {menu}
              </button>
            ))}
          </nav>
        </div>

        {/* 중앙: 종목 검색 */}
        <div className="flex-1 max-w-[600px] mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="종목명 또는 종목코드 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 border-border focus:border-primary bg-background"
            />
          </div>
        </div>

        {/* 우측: 알림 + 로그인/로그아웃 + 프로필 */}
        <div className="flex items-center gap-2">
          {/* 알림 버튼 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full"></span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="text-foreground">알림</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      모두 읽음
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deleteReadNotifications}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      읽은 알림 삭제
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">알림이 없습니다</p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border border-border ${
                          notification.isRead ? 'bg-card' : 'bg-accent'
                        } hover:shadow-sm transition-shadow cursor-pointer`}
                      >
                        <p className="text-sm text-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
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
            onClick={handleLogin} 
            className="gap-2 h-10 text-muted-foreground hover:text-foreground"
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
            className="h-10 w-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <User className="h-5 w-5" />
          </Button>

          {/* 언어 선택 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-10">
                <span className="text-xl">{language === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                <span>{language}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => setLanguage('KR')}
                className="gap-2 cursor-pointer"
              >
                <span className="text-xl">🇰🇷</span>
                <span>한국어</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('US')}
                className="gap-2 cursor-pointer"
              >
                <span className="text-xl">🇺🇸</span>
                <span>English</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
