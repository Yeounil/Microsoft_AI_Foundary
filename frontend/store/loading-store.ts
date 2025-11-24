import { create } from 'zustand';

interface LoadingState {
  isChartLoading: boolean;
  setChartLoading: (loading: boolean) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isChartLoading: false,
  setChartLoading: (loading: boolean) => set({ isChartLoading: loading }),
}));
