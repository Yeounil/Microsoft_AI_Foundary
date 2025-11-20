import { renderHook, act } from '@testing-library/react';
import { useNotificationSettingsStore } from '../notification-settings-store';

describe('notification-settings-store', () => {
  beforeEach(() => {
    // 스토어 상태 초기화
    const { result } = renderHook(() => useNotificationSettingsStore());
    act(() => {
      result.current.setNotificationsEnabled(true);
      result.current.setPriceAlertsEnabled(true);
      result.current.setNewsAlertsEnabled(true);
      result.current.setMarketAlertsEnabled(true);
      result.current.setMarketAlertThreshold(1);
      // 모든 가격 알림 삭제
      result.current.priceAlerts.forEach((alert) => {
        result.current.deletePriceAlert(alert.id);
      });
    });
  });

  describe('전역 알림 설정', () => {
    it('알림을 활성화/비활성화할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      expect(result.current.notificationsEnabled).toBe(true);

      act(() => {
        result.current.setNotificationsEnabled(false);
      });

      expect(result.current.notificationsEnabled).toBe(false);
    });
  });

  describe('가격 알림 설정', () => {
    it('가격 알림을 추가할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      act(() => {
        result.current.addPriceAlert({
          symbol: 'AAPL',
          targetPrice: 150,
          condition: 'above',
          isEnabled: true,
        });
      });

      expect(result.current.priceAlerts).toHaveLength(1);
      expect(result.current.priceAlerts[0].symbol).toBe('AAPL');
      expect(result.current.priceAlerts[0].targetPrice).toBe(150);
    });

    it('가격 알림을 삭제할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      act(() => {
        result.current.addPriceAlert({
          symbol: 'AAPL',
          targetPrice: 150,
          condition: 'above',
          isEnabled: true,
        });
      });

      const alertId = result.current.priceAlerts[0].id;

      act(() => {
        result.current.deletePriceAlert(alertId);
      });

      expect(result.current.priceAlerts).toHaveLength(0);
    });

    it('가격 알림을 토글할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      act(() => {
        result.current.addPriceAlert({
          symbol: 'AAPL',
          targetPrice: 150,
          condition: 'above',
          isEnabled: true,
        });
      });

      const alertId = result.current.priceAlerts[0].id;
      expect(result.current.priceAlerts[0].isEnabled).toBe(true);

      act(() => {
        result.current.togglePriceAlert(alertId);
      });

      expect(result.current.priceAlerts[0].isEnabled).toBe(false);
    });
  });

  describe('뉴스 알림 설정', () => {
    it('뉴스 카테고리를 토글할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      const initialCategories = result.current.newsAlertCategories;

      act(() => {
        result.current.toggleNewsCategory('healthcare');
      });

      expect(result.current.newsAlertCategories).toContain('healthcare');

      act(() => {
        result.current.toggleNewsCategory('healthcare');
      });

      expect(result.current.newsAlertCategories).not.toContain('healthcare');
    });
  });

  describe('시장 알림 설정', () => {
    it('시장 알림 임계값을 설정할 수 있어야 함', () => {
      const { result } = renderHook(() => useNotificationSettingsStore());

      act(() => {
        result.current.setMarketAlertThreshold(2.5);
      });

      expect(result.current.marketAlertThreshold).toBe(2.5);
    });
  });
});
