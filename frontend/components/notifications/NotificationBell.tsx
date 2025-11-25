'use client';

import { Bell, FileCheck, FileX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function NotificationBell() {
  const { notifications, clearNotification, clearAllNotifications, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 새 알림이 오면 브라우저 알림 표시 (선택적)
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];

      // 브라우저 알림 권한 요청 및 표시
      if ('Notification' in window && Notification.permission === 'granted') {
        if (latestNotification.type === 'report_completed') {
          new Notification('레포트 생성 완료', {
            body: latestNotification.message || `${latestNotification.symbol} 레포트가 준비되었습니다`,
            icon: '/favicon.ico',
          });
        } else if (latestNotification.type === 'report_failed') {
          new Notification('레포트 생성 실패', {
            body: latestNotification.error || latestNotification.message,
            icon: '/favicon.ico',
          });
        }
      } else if ('Notification' in window && Notification.permission === 'default') {
        // 알림 권한 요청
        Notification.requestPermission();
      }
    }
  }, [notifications]);

  const handleNotificationClick = (notification: typeof notifications[0], index: number) => {
    // 읽음 처리
    markAsRead(index);

    if (notification.type === 'report_completed' && notification.report_id) {
      // 레포트 페이지로 이동
      router.push(`/reports/${notification.report_id}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold text-sm">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="h-auto p-1 text-xs"
            >
              모두 지우기
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {unreadCount === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            새로운 알림이 없습니다
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={index} className="relative">
                <DropdownMenuItem
                  className={`flex items-start gap-3 p-3 cursor-pointer pr-10 ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification, index)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.type === 'report_completed' ? (
                      <FileCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileX className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {notification.type === 'report_completed'
                        ? '레포트 생성 완료'
                        : '레포트 생성 실패'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    {notification.symbol && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {notification.symbol}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
