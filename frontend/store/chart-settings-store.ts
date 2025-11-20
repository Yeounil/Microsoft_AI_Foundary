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
  setChartType: (type: ChartType) => void;
  setChartMode: (mode: ChartMode) => void;
  setBasicTimeRange: (range: TimeRange) => void;
  setEnhancedChartType: (type: EnhancedChartType) => void;
  setEnhancedMinuteInterval: (interval: ChartInterval) => void;
  resetSettings: () => void;
}

const defaultSettings: ChartSettings = {
  chartType: 'candle',
  chartMode: 'enhanced',
  basicTimeRange: '1D',
  enhancedChartType: 'day',
  enhancedMinuteInterval: '5m',
};

export const useChartSettingsStore = create<ChartSettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      setChartType: (type) =>
        set((state) => ({
          settings: { ...state.settings, chartType: type },
        })),

      setChartMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, chartMode: mode },
        })),

      setBasicTimeRange: (range) =>
        set((state) => ({
          settings: { ...state.settings, basicTimeRange: range },
        })),

      setEnhancedChartType: (type) =>
        set((state) => ({
          settings: { ...state.settings, enhancedChartType: type },
        })),

      setEnhancedMinuteInterval: (interval) =>
        set((state) => ({
          settings: { ...state.settings, enhancedMinuteInterval: interval },
        })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'chart-settings-storage',
    }
  )
);
