import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isEnabled: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  // 전역 설정
  notificationsEnabled: boolean;

  // 가격 알림 설정
  priceAlertsEnabled: boolean;
  priceAlerts: PriceAlert[];

  // 뉴스 알림 설정
  newsAlertsEnabled: boolean;
  newsAlertCategories: string[];

  // 시장 알림 설정
  marketAlertsEnabled: boolean;
  marketAlertThreshold: number; // 퍼센트
}

interface NotificationSettingsState extends NotificationSettings {
  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;

  // 가격 알림 Actions
  setPriceAlertsEnabled: (enabled: boolean) => void;
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  updatePriceAlert: (id: string, updates: Partial<PriceAlert>) => void;
  deletePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;

  // 뉴스 알림 Actions
  setNewsAlertsEnabled: (enabled: boolean) => void;
  setNewsAlertCategories: (categories: string[]) => void;
  toggleNewsCategory: (category: string) => void;

  // 시장 알림 Actions
  setMarketAlertsEnabled: (enabled: boolean) => void;
  setMarketAlertThreshold: (threshold: number) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      // 초기 상태
      notificationsEnabled: true,

      priceAlertsEnabled: true,
      priceAlerts: [],

      newsAlertsEnabled: true,
      newsAlertCategories: ['tech', 'finance', 'energy'],

      marketAlertsEnabled: true,
      marketAlertThreshold: 1, // 1%

      // Actions
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setPriceAlertsEnabled: (enabled) => set({ priceAlertsEnabled: enabled }),

      addPriceAlert: (alert) => {
        const newAlert: PriceAlert = {
          ...alert,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          priceAlerts: [...state.priceAlerts, newAlert],
        }));
      },

      updatePriceAlert: (id, updates) => {
        set((state) => ({
          priceAlerts: state.priceAlerts.map((alert) =>
            alert.id === id ? { ...alert, ...updates } : alert
          ),
        }));
      },

      deletePriceAlert: (id) => {
        set((state) => ({
          priceAlerts: state.priceAlerts.filter((alert) => alert.id !== id),
        }));
      },

      togglePriceAlert: (id) => {
        set((state) => ({
          priceAlerts: state.priceAlerts.map((alert) =>
            alert.id === id ? { ...alert, isEnabled: !alert.isEnabled } : alert
          ),
        }));
      },

      setNewsAlertsEnabled: (enabled) => set({ newsAlertsEnabled: enabled }),

      setNewsAlertCategories: (categories) => set({ newsAlertCategories: categories }),

      toggleNewsCategory: (category) => {
        set((state) => {
          const categories = state.newsAlertCategories.includes(category)
            ? state.newsAlertCategories.filter((c) => c !== category)
            : [...state.newsAlertCategories, category];
          return { newsAlertCategories: categories };
        });
      },

      setMarketAlertsEnabled: (enabled) => set({ marketAlertsEnabled: enabled }),

      setMarketAlertThreshold: (threshold) => set({ marketAlertThreshold: threshold }),
    }),
    {
      name: 'notification-settings-storage',
    }
  )
);
