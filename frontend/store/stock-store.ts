import { create } from 'zustand';
import { Stock, StockPriceData, PriceUpdate } from '@/types';
import apiClient from '@/lib/api-client';
import wsClient from '@/lib/websocket-client';
import { extractErrorMessage } from '@/types/api';
import { useAuthStore } from './auth-store';

interface StockState {
  // Current stock data
  selectedStock: Stock | null;
  chartData: StockPriceData[] | null;

  // Watchlist
  watchlist: string[];

  // Real-time prices
  realtimePrices: Record<string, PriceUpdate>;
  isWebSocketConnected: boolean;

  // Loading states
  isLoadingStock: boolean;
  isLoadingChart: boolean;
  error: string | null;

  // Actions
  selectStock: (symbol: string) => Promise<void>;
  updateStockInfo: (info: { company_name?: string; current_price?: number }) => void;
  loadChartData: (symbol: string, period?: string, interval?: string) => Promise<void>;
  loadWatchlist: () => Promise<void>;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  subscribeToRealtime: (symbols: string[]) => void;
  unsubscribeFromRealtime: (symbols: string[]) => void;
  updateRealtimePrice: (priceUpdate: PriceUpdate) => void;
  setWebSocketConnected: (connected: boolean) => void;
  clearError: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  selectedStock: null,
  chartData: null,
  watchlist: [],
  realtimePrices: {},
  isWebSocketConnected: false,
  isLoadingStock: false,
  isLoadingChart: false,
  error: null,

  // Select stock (company_name will be updated by chart data)
  selectStock: async (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    set({
      selectedStock: {
        symbol: upperSymbol,
        company_name: upperSymbol,
        current_price: 0,
        pe_ratio: undefined,
        eps: undefined,
        dividend_yield: undefined,
        fifty_two_week_high: undefined,
        fifty_two_week_low: undefined,
        exchange: undefined,
        industry: undefined,
        sector: undefined,
        currency: 'USD',
      },
      isLoadingStock: false,
      error: null,
    });
  },

  // Update stock info (called from chart data loader)
  updateStockInfo: (info: { company_name?: string; current_price?: number }) => {
    set((state) => ({
      selectedStock: state.selectedStock ? {
        ...state.selectedStock,
        ...info,
      } : null,
    }));
  },

  loadChartData: async (symbol, period, interval) => {
    set({ isLoadingChart: true, error: null });
    try {
      const data = await apiClient.getChartData(symbol, period, interval);
      set({
        chartData: data.chart_data,
        isLoadingChart: false,
      });
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      set({
        isLoadingChart: false,
        error: errorMessage,
      });
    }
  },

  loadWatchlist: async () => {
    try {
      const response = await apiClient.getFavorites();
      // response: { user_id, total_count, interests: [{id, user_id, interest, created_at}, ...] }
      const symbols = response.interests.map((item: { interest: string }) => item.interest.toUpperCase());
      set({ watchlist: symbols });

      // Note: WebSocket 구독은 실제로 차트를 볼 때 수행됨
      // 관심 종목 로딩 시에는 구독하지 않음
    } catch (error) {
      console.error('Failed to load watchlist:', error);
      // 로그인 안되어있으면 빈 배열로 설정
      set({ watchlist: [] });
    }
  },

  addToWatchlist: async (symbol) => {
    const upperSymbol = symbol.toUpperCase();

    // Get user ID from auth store
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      const errorMessage = 'User not logged in';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }

    // 낙관적 업데이트 (UI 먼저 업데이트)
    set((state) => ({
      watchlist: [...new Set([...state.watchlist, upperSymbol])],
    }));

    try {
      await apiClient.addFavorite(upperSymbol, user.id);

      // Note: WebSocket 구독은 실제로 차트를 볼 때 수행됨
      // 관심 종목 추가 시에는 구독하지 않음
    } catch (error) {
      // 실패하면 롤백
      set((state) => ({
        watchlist: state.watchlist.filter((s) => s !== upperSymbol),
      }));
      const errorMessage = extractErrorMessage(error);
      set({ error: errorMessage });
      throw error;
    }
  },

  removeFromWatchlist: async (symbol) => {
    const upperSymbol = symbol.toUpperCase();

    // 낙관적 업데이트 (UI 먼저 업데이트)
    const previousWatchlist = get().watchlist;
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== upperSymbol),
    }));

    try {
      await apiClient.removeFavorite(upperSymbol);

      // Note: WebSocket 구독 해제는 차트가 언마운트될 때 수행됨
      // 관심 종목 제거 시에는 구독 해제하지 않음
    } catch (error) {
      // 실패하면 롤백
      set({ watchlist: previousWatchlist });
      const errorMessage = extractErrorMessage(error);
      set({ error: errorMessage });
      throw error;
    }
  },

  subscribeToRealtime: (symbols) => {
    // Connect if not connected
    if (!wsClient.isConnected()) {
      wsClient.connect().then(() => {
        wsClient.subscribe(symbols);
      }).catch((error) => {
        console.error('Failed to connect WebSocket:', error);
        // Don't set error - WebSocket is optional feature
      });
    } else {
      try {
        wsClient.subscribe(symbols);
      } catch (error) {
        console.error('Failed to subscribe to real-time updates:', error);
        // Don't set error - WebSocket is optional feature
      }
    }
  },

  unsubscribeFromRealtime: (symbols) => {
    if (wsClient.isConnected()) {
      try {
        wsClient.unsubscribe(symbols);
      } catch (error) {
        console.error('Failed to unsubscribe from real-time updates:', error);
        // Don't set error - WebSocket is optional feature
      }
    }
  },

  updateRealtimePrice: (priceUpdate) => {
    set((state) => ({
      realtimePrices: {
        ...state.realtimePrices,
        [priceUpdate.symbol]: priceUpdate,
      },
    }));

    // Update selected stock price if it matches
    const currentStock = get().selectedStock;
    if (currentStock && currentStock.symbol === priceUpdate.symbol && priceUpdate.price) {
      set((state) => ({
        selectedStock: state.selectedStock ? {
          ...state.selectedStock,
          current_price: priceUpdate.price,
        } : null,
      }));
    }
  },

  setWebSocketConnected: (connected) => {
    set({ isWebSocketConnected: connected });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Initialize WebSocket handlers
if (typeof window !== 'undefined') {
  wsClient.onMessage((priceUpdate) => {
    useStockStore.getState().updateRealtimePrice(priceUpdate);
  });

  wsClient.onConnectionChange((connected) => {
    useStockStore.getState().setWebSocketConnected(connected);
  });
}