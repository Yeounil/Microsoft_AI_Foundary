import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimeRange, ChartInterval } from '@/features/main/services/chartService';
import { ChartMode } from '@/features/dashboard/services/dashboardChartService';
import { ChartType } from '@/features/dashboard/components/RealtimeDashboardChart/ChartTypeSelector';
import { EnhancedChartType } from '@/features/dashboard/components/RealtimeDashboardChart/EnhancedChartSelector';

interface ChartSettings {
  chartType: ChartType;
  chartMode: ChartMode;
  basicTimeRange: TimeRange;
  enhancedChartType: EnhancedChartType;
  enhancedMinuteInterval: ChartInterval;
}

interface ChartSettingsState {
  settings: ChartSettings;
  mobileSettings: ChartSettings; // 모바일 전용 설정
  desktopSettings: ChartSettings; // 데스크탑 전용 설정
  setChartType: (type: ChartType, isMobile?: boolean) => void;
  setChartMode: (mode: ChartMode, isMobile?: boolean) => void;
  setBasicTimeRange: (range: TimeRange, isMobile?: boolean) => void;
  setEnhancedChartType: (type: EnhancedChartType, isMobile?: boolean) => void;
  setEnhancedMinuteInterval: (interval: ChartInterval, isMobile?: boolean) => void;
  resetSettings: () => void;
  getSettings: (isMobile: boolean) => ChartSettings;
}

const defaultSettings: ChartSettings = {
  chartType: 'candle',
  chartMode: 'basic',  // 기본 차트 모드로 변경
  basicTimeRange: '1D',
  enhancedChartType: 'day',
  enhancedMinuteInterval: '5m',
};

const defaultMobileSettings: ChartSettings = {
  chartType: 'area', // 모바일에서는 area 차트를 기본으로
  chartMode: 'basic', // 모바일에서는 basic 모드를 기본으로
  basicTimeRange: '1D',
  enhancedChartType: 'day',
  enhancedMinuteInterval: '5m',
};

export const useChartSettingsStore = create<ChartSettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      mobileSettings: defaultMobileSettings,
      desktopSettings: defaultSettings,

      getSettings: (isMobile) => {
        return isMobile ? get().mobileSettings : get().desktopSettings;
      },

      setChartType: (type, isMobile = false) =>
        set((state) => {
          if (isMobile) {
            return {
              mobileSettings: { ...state.mobileSettings, chartType: type },
              settings: { ...state.mobileSettings, chartType: type },
            };
          } else {
            return {
              desktopSettings: { ...state.desktopSettings, chartType: type },
              settings: { ...state.desktopSettings, chartType: type },
            };
          }
        }),

      setChartMode: (mode, isMobile = false) =>
        set((state) => {
          if (isMobile) {
            return {
              mobileSettings: { ...state.mobileSettings, chartMode: mode },
              settings: { ...state.mobileSettings, chartMode: mode },
            };
          } else {
            return {
              desktopSettings: { ...state.desktopSettings, chartMode: mode },
              settings: { ...state.desktopSettings, chartMode: mode },
            };
          }
        }),

      setBasicTimeRange: (range, isMobile = false) =>
        set((state) => {
          if (isMobile) {
            return {
              mobileSettings: { ...state.mobileSettings, basicTimeRange: range },
              settings: { ...state.mobileSettings, basicTimeRange: range },
            };
          } else {
            return {
              desktopSettings: { ...state.desktopSettings, basicTimeRange: range },
              settings: { ...state.desktopSettings, basicTimeRange: range },
            };
          }
        }),

      setEnhancedChartType: (type, isMobile = false) =>
        set((state) => {
          if (isMobile) {
            return {
              mobileSettings: { ...state.mobileSettings, enhancedChartType: type },
              settings: { ...state.mobileSettings, enhancedChartType: type },
            };
          } else {
            return {
              desktopSettings: { ...state.desktopSettings, enhancedChartType: type },
              settings: { ...state.desktopSettings, enhancedChartType: type },
            };
          }
        }),

      setEnhancedMinuteInterval: (interval, isMobile = false) =>
        set((state) => {
          if (isMobile) {
            return {
              mobileSettings: { ...state.mobileSettings, enhancedMinuteInterval: interval },
              settings: { ...state.mobileSettings, enhancedMinuteInterval: interval },
            };
          } else {
            return {
              desktopSettings: { ...state.desktopSettings, enhancedMinuteInterval: interval },
              settings: { ...state.desktopSettings, enhancedMinuteInterval: interval },
            };
          }
        }),

      resetSettings: () => set({
        settings: defaultSettings,
        mobileSettings: defaultMobileSettings,
        desktopSettings: defaultSettings,
      }),
    }),
    {
      name: 'chart-settings-storage',
    }
  )
);
