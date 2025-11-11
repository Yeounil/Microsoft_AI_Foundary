import { create } from 'zustand';
import { Stock, StockPriceData, PriceUpdate } from '@/types';
import apiClient from '@/lib/api-client';
import wsClient from '@/lib/websocket-client';

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
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
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
    } catch (error: any) {
      set({
        isLoadingStock: false,
        error: error.response?.data?.detail || 'Failed to load stock data',
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
    } catch (error: any) {
      set({
        isLoadingChart: false,
        error: error.response?.data?.detail || 'Failed to load chart data',
      });
    }
  },

  addToWatchlist: (symbol) => {
    set((state) => ({
      watchlist: [...new Set([...state.watchlist, symbol.toUpperCase()])],
    }));

    // Subscribe to real-time updates
    get().subscribeToRealtime([symbol]);
  },

  removeFromWatchlist: (symbol) => {
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol.toUpperCase()),
    }));

    // Unsubscribe from real-time updates
    get().unsubscribeFromRealtime([symbol]);
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
    if (currentStock && currentStock.symbol === priceUpdate.symbol && priceUpdate.last_price) {
      set((state) => ({
        selectedStock: state.selectedStock ? {
          ...state.selectedStock,
          current_price: priceUpdate.last_price!,
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