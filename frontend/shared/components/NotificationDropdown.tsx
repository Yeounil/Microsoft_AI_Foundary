"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  useNotificationStore,
  type Notification,
} from "@/store/notification-store";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/useDevice";

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile, isTablet } = useDevice();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteReadNotifications,
  } = useNotificationStore();

  const isMobileOrTablet = isMobile || isTablet;

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  // 공통 벨 아이콘 트리거 버튼
  const triggerButton = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  // 공통 알림 헤더
  const notificationHeader = (
    <div className="flex items-center justify-between px-4 py-3">
      <h3 className="font-semibold text-sm">
        알람 {unreadCount > 0 && `(${unreadCount})`}
      </h3>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-7 text-xs px-2"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            모두 읽기
          </Button>
        )}
        {notifications.some((n) => n.isRead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteReadNotifications}
            className="h-7 text-xs px-2"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            읽은 알람 삭제
          </Button>
        )}
      </div>
    </div>
  );

  // 공통 알림 리스트
  const notificationList = (
    <ScrollArea className="h-[300px] sm:h-[400px]">
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">알람이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors",
                !notification.isRead && "bg-primary/5",
                "hover:bg-muted"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Notification Type Indicator */}
                <div
                  className={cn(
                    "mt-1 h-2 w-2 rounded-full shrink-0",
                    notification.type === "success" && "bg-green-500",
                    notification.type === "warning" && "bg-yellow-500",
                    notification.type === "error" && "bg-red-500",
                    notification.type === "info" && "bg-blue-500"
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  // 모바일/태블릿: Sheet (오른쪽에서 슬라이드)
  if (isMobileOrTablet) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-left">
              알람 {unreadCount > 0 && `(${unreadCount})`}
            </SheetTitle>
            <div className="flex items-center gap-2 pt-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs px-2"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  모두 읽기
                </Button>
              )}
              {notifications.some((n) => n.isRead) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteReadNotifications}
                  className="h-7 text-xs px-2"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  읽은 알람 삭제
                </Button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">알람이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "px-4 py-3 cursor-pointer transition-colors",
                      !notification.isRead && "bg-primary/5",
                      "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 rounded-full shrink-0",
                          notification.type === "success" && "bg-green-500",
                          notification.type === "warning" && "bg-yellow-500",
                          notification.type === "error" && "bg-red-500",
                          notification.type === "info" && "bg-blue-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // 데스크탑: 기존 Popover 유지
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-[380px] sm:w-[380px] p-0 translate-x-4"
      >
        {notificationHeader}
        <Separator />
        {notificationList}
      </PopoverContent>
    </Popover>
  );
}
