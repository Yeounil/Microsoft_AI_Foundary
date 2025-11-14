import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteReadNotifications: () => void;
  getUnreadNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        // Mock 데이터 (추후 API 연결 시 제거)
        {
          id: '1',
          title: '가격 알림',
          message: 'AAPL 주가가 목표가 $150에 도달했습니다.',
          type: 'success',
          isRead: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard/AAPL',
        },
        {
          id: '2',
          title: '뉴스 업데이트',
          message: 'TSLA 관련 새로운 뉴스가 5개 등록되었습니다.',
          type: 'info',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          title: '시장 알림',
          message: 'S&P 500 지수가 1% 이상 하락했습니다.',
          type: 'warning',
          isRead: true,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      unreadCount: 2,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.isRead) {
            return state;
          }

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: state.unreadCount - 1,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.isRead;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
          };
        });
      },

      deleteReadNotifications: () => {
        set((state) => ({
          notifications: state.notifications.filter((n) => !n.isRead),
        }));
      },

      getUnreadNotifications: () => {
        return get().notifications.filter((n) => !n.isRead);
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);
