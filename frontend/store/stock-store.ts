import { create } from 'zustand';
import { Stock, StockPriceData, PriceUpdate } from '@/types';
import apiClient from '@/lib/api-client';
import wsClient from '@/lib/websocket-client';
import { extractErrorMessage } from '@/types/api';

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
  loadChartData: (symbol: string, period?: string, interval?: string) => Promise<void>;
  loadWatchlist: () => Promise<void>;
  addToWatchlist: (symbol: string, companyName?: string) => Promise<void>;
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

  selectStock: async (symbol) => {
    set({ isLoadingStock: true, error: null });
    try {
      const stockData = await apiClient.getStockData(symbol);
      set({
        selectedStock: {
          symbol: stockData.symbol,
          company_name: stockData.company_name,
          current_price: stockData.current_price,
          pe_ratio: stockData.pe_ratio,
          eps: stockData.eps,
          dividend_yield: stockData.dividend_yield,
          fifty_two_week_high: stockData.fifty_two_week_high,
          fifty_two_week_low: stockData.fifty_two_week_low,
          exchange: stockData.exchange,
          industry: stockData.industry,
          sector: stockData.sector,
          currency: stockData.currency,
        },
        chartData: stockData.price_data || null,
        isLoadingStock: false,
      });
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      set({
        isLoadingStock: false,
        error: errorMessage,
      });
    }
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
      const favorites = await apiClient.getFavorites();
      // favorites는 배열 형태: [{ symbol: "AAPL", company_name: "Apple Inc.", ... }]
      const symbols = favorites.map((fav: { symbol: string }) => fav.symbol.toUpperCase());
      set({ watchlist: symbols });

      // Subscribe to real-time updates
      if (symbols.length > 0) {
        get().subscribeToRealtime(symbols);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
      // 로그인 안되어있으면 빈 배열로 설정
      set({ watchlist: [] });
    }
  },

  addToWatchlist: async (symbol, companyName) => {
    const upperSymbol = symbol.toUpperCase();

    // 낙관적 업데이트 (UI 먼저 업데이트)
    set((state) => ({
      watchlist: [...new Set([...state.watchlist, upperSymbol])],
    }));

    try {
      await apiClient.addFavorite(upperSymbol, companyName);
      // Subscribe to real-time updates
      get().subscribeToRealtime([upperSymbol]);
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
      // Unsubscribe from real-time updates
      get().unsubscribeFromRealtime([upperSymbol]);
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
        set({ error: 'Failed to connect to real-time updates' });
      });
    } else {
      wsClient.subscribe(symbols);
    }
  },

  unsubscribeFromRealtime: (symbols) => {
    if (wsClient.isConnected()) {
      wsClient.unsubscribe(symbols);
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