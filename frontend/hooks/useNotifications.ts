'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';

export interface Notification {
  type: 'report_completed' | 'report_failed' | 'connected' | 'heartbeat';
  report_id?: number;
  symbol?: string;
  message?: string;
  error?: string;
  timestamp?: number;
  read?: boolean; // 읽음 상태
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        // SSE 연결 (Query Parameter로 토큰 전달)
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.warn('[SSE] No access token found');
          return;
        }

        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          console.log('[SSE] Connected');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data: Notification = JSON.parse(event.data);
            console.log('[SSE] Received:', data);

            // heartbeat는 무시
            if (data.type === 'heartbeat') {
              return;
            }

            // 알림 추가 (새 알림은 읽지 않음 상태)
            if (data.type === 'report_completed' || data.type === 'report_failed') {
              setNotifications((prev) => [{ ...data, read: false }, ...prev]);
            }
          } catch (error) {
            console.error('[SSE] Parse error:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          setIsConnected(false);

          // 자동 재연결 (5초 후)
          eventSource?.close();
          reconnectTimeout = setTimeout(() => {
            console.log('[SSE] Reconnecting...');
            connect();
          }, 5000);
        };
      } catch (error) {
        console.error('[SSE] Setup error:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      console.log('[SSE] Disconnecting');
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      setIsConnected(false);
    };
  }, [user, isAuthenticated]);

  const clearNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((index: number) => {
    setNotifications((prev) =>
      prev.map((notification, i) =>
        i === index ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  return {
    notifications,
    isConnected,
    clearNotification,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
  };
}
