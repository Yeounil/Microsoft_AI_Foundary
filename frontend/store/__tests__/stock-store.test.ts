import { act } from "@testing-library/react";
import { useStockStore } from "../stock-store";
import { useAuthStore } from "../auth-store";
import apiClient from "@/lib/api-client";

// Mock dependencies
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    getChartData: jest.fn(),
    getFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  },
}));

jest.mock("@/lib/websocket-client", () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    onMessage: jest.fn(),
    onConnectionChange: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("stock-store", () => {
  beforeEach(() => {
    // Reset stock store state
    const { setState } = useStockStore;
    setState({
      selectedStock: null,
      chartData: null,
      watchlist: [],
      realtimePrices: {},
      isWebSocketConnected: false,
      isLoadingStock: false,
      isLoadingChart: false,
      error: null,
    });

    // Reset auth store with a logged-in user
    useAuthStore.setState({
      user: { id: 1, username: "testuser", email: "test@example.com" },
      isAuthenticated: true,
    });

    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useStockStore.getState();

      expect(state.selectedStock).toBeNull();
      expect(state.chartData).toBeNull();
      expect(state.watchlist).toEqual([]);
      expect(state.realtimePrices).toEqual({});
      expect(state.isWebSocketConnected).toBe(false);
      expect(state.isLoadingStock).toBe(false);
      expect(state.isLoadingChart).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("selectStock", () => {
    it("should select a stock", async () => {
      await act(async () => {
        await useStockStore.getState().selectStock("aapl");
      });

      const state = useStockStore.getState();
      expect(state.selectedStock).not.toBeNull();
      expect(state.selectedStock?.symbol).toBe("AAPL");
      expect(state.selectedStock?.company_name).toBe("AAPL");
      expect(state.selectedStock?.currency).toBe("USD");
    });

    it("should convert symbol to uppercase", async () => {
      await act(async () => {
        await useStockStore.getState().selectStock("msft");
      });

      expect(useStockStore.getState().selectedStock?.symbol).toBe("MSFT");
    });

    it("should clear previous error", async () => {
      useStockStore.setState({ error: "Previous error" });

      await act(async () => {
        await useStockStore.getState().selectStock("GOOGL");
      });

      expect(useStockStore.getState().error).toBeNull();
    });
  });

  describe("updateStockInfo", () => {
    it("should update stock info", async () => {
      await act(async () => {
        await useStockStore.getState().selectStock("AAPL");
      });

      act(() => {
        useStockStore.getState().updateStockInfo({
          company_name: "Apple Inc.",
          current_price: 150.5,
        });
      });

      const state = useStockStore.getState();
      expect(state.selectedStock?.company_name).toBe("Apple Inc.");
      expect(state.selectedStock?.current_price).toBe(150.5);
    });

    it("should not update if no stock selected", () => {
      act(() => {
        useStockStore.getState().updateStockInfo({
          company_name: "Test",
        });
      });

      expect(useStockStore.getState().selectedStock).toBeNull();
    });
  });

  describe("loadChartData", () => {
    const mockChartData = {
      chart_data: [
        { date: "2024-01-01", open: 100, high: 105, low: 99, close: 104, volume: 1000 },
        { date: "2024-01-02", open: 104, high: 108, low: 103, close: 107, volume: 1200 },
      ],
    };

    it("should load chart data successfully", async () => {
      mockApiClient.getChartData.mockResolvedValueOnce(mockChartData);

      await act(async () => {
        await useStockStore.getState().loadChartData("AAPL", "1M", "1d");
      });

      const state = useStockStore.getState();
      expect(state.chartData).toEqual(mockChartData.chart_data);
      expect(state.isLoadingChart).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockApiClient.getChartData.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockChartData), 100);
          })
      );

      const loadPromise = useStockStore.getState().loadChartData("AAPL");

      expect(useStockStore.getState().isLoadingChart).toBe(true);

      await act(async () => {
        await loadPromise;
      });

      expect(useStockStore.getState().isLoadingChart).toBe(false);
    });

    it("should handle load error", async () => {
      mockApiClient.getChartData.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useStockStore.getState().loadChartData("INVALID");
      });

      const state = useStockStore.getState();
      expect(state.isLoadingChart).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("watchlist operations", () => {
    describe("loadWatchlist", () => {
      it("should load watchlist successfully", async () => {
        mockApiClient.getFavorites.mockResolvedValueOnce({
          user_id: 1,
          total_count: 2,
          interests: [
            { id: 1, user_id: 1, interest: "AAPL", created_at: "2024-01-01" },
            { id: 2, user_id: 1, interest: "MSFT", created_at: "2024-01-02" },
          ],
        });

        await act(async () => {
          await useStockStore.getState().loadWatchlist();
        });

        expect(useStockStore.getState().watchlist).toEqual(["AAPL", "MSFT"]);
      });

      it("should convert symbols to uppercase", async () => {
        mockApiClient.getFavorites.mockResolvedValueOnce({
          user_id: 1,
          total_count: 1,
          interests: [{ id: 1, user_id: 1, interest: "aapl", created_at: "2024-01-01" }],
        });

        await act(async () => {
          await useStockStore.getState().loadWatchlist();
        });

        expect(useStockStore.getState().watchlist).toEqual(["AAPL"]);
      });

      it("should set empty watchlist on error", async () => {
        mockApiClient.getFavorites.mockRejectedValueOnce(new Error("Unauthorized"));

        await act(async () => {
          await useStockStore.getState().loadWatchlist();
        });

        expect(useStockStore.getState().watchlist).toEqual([]);
      });
    });

    describe("addToWatchlist", () => {
      it("should add symbol to watchlist optimistically", async () => {
        mockApiClient.addFavorite.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useStockStore.getState().addToWatchlist("AAPL");
        });

        expect(useStockStore.getState().watchlist).toContain("AAPL");
        expect(mockApiClient.addFavorite).toHaveBeenCalledWith("AAPL", 1);
      });

      it("should convert symbol to uppercase", async () => {
        mockApiClient.addFavorite.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useStockStore.getState().addToWatchlist("msft");
        });

        expect(useStockStore.getState().watchlist).toContain("MSFT");
      });

      it("should rollback on error", async () => {
        mockApiClient.addFavorite.mockRejectedValueOnce(new Error("Failed"));

        await expect(
          act(async () => {
            await useStockStore.getState().addToWatchlist("AAPL");
          })
        ).rejects.toThrow();

        expect(useStockStore.getState().watchlist).not.toContain("AAPL");
      });

      it("should throw error if user not logged in", async () => {
        useAuthStore.setState({ user: null, isAuthenticated: false });

        await expect(
          act(async () => {
            await useStockStore.getState().addToWatchlist("AAPL");
          })
        ).rejects.toThrow("User not logged in");
      });

      it("should not duplicate symbols", async () => {
        useStockStore.setState({ watchlist: ["AAPL"] });
        mockApiClient.addFavorite.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useStockStore.getState().addToWatchlist("AAPL");
        });

        const watchlist = useStockStore.getState().watchlist;
        expect(watchlist.filter((s) => s === "AAPL")).toHaveLength(1);
      });
    });

    describe("removeFromWatchlist", () => {
      it("should remove symbol from watchlist optimistically", async () => {
        useStockStore.setState({ watchlist: ["AAPL", "MSFT"] });
        mockApiClient.removeFavorite.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useStockStore.getState().removeFromWatchlist("AAPL");
        });

        expect(useStockStore.getState().watchlist).toEqual(["MSFT"]);
      });

      it("should rollback on error", async () => {
        useStockStore.setState({ watchlist: ["AAPL", "MSFT"] });
        mockApiClient.removeFavorite.mockRejectedValueOnce(new Error("Failed"));

        await expect(
          act(async () => {
            await useStockStore.getState().removeFromWatchlist("AAPL");
          })
        ).rejects.toThrow();

        expect(useStockStore.getState().watchlist).toContain("AAPL");
      });
    });
  });

  describe("realtime price updates", () => {
    describe("updateRealtimePrice", () => {
      it("should update realtime prices", () => {
        act(() => {
          useStockStore.getState().updateRealtimePrice({
            symbol: "AAPL",
            price: 150.5,
            change: 2.5,
            changePercent: 1.69,
            timestamp: Date.now(),
          });
        });

        const prices = useStockStore.getState().realtimePrices;
        expect(prices["AAPL"]).toBeDefined();
        expect(prices["AAPL"].price).toBe(150.5);
      });

      it("should update selected stock price if matching", async () => {
        await act(async () => {
          await useStockStore.getState().selectStock("AAPL");
        });

        act(() => {
          useStockStore.getState().updateRealtimePrice({
            symbol: "AAPL",
            price: 155.0,
            change: 5.0,
            changePercent: 3.33,
            timestamp: Date.now(),
          });
        });

        expect(useStockStore.getState().selectedStock?.current_price).toBe(155.0);
      });

      it("should not update selected stock if different symbol", async () => {
        await act(async () => {
          await useStockStore.getState().selectStock("AAPL");
        });

        const initialPrice = useStockStore.getState().selectedStock?.current_price;

        act(() => {
          useStockStore.getState().updateRealtimePrice({
            symbol: "MSFT",
            price: 300.0,
            change: 10.0,
            changePercent: 3.45,
            timestamp: Date.now(),
          });
        });

        expect(useStockStore.getState().selectedStock?.current_price).toBe(initialPrice);
      });
    });

    describe("setWebSocketConnected", () => {
      it("should set WebSocket connection state", () => {
        act(() => {
          useStockStore.getState().setWebSocketConnected(true);
        });

        expect(useStockStore.getState().isWebSocketConnected).toBe(true);

        act(() => {
          useStockStore.getState().setWebSocketConnected(false);
        });

        expect(useStockStore.getState().isWebSocketConnected).toBe(false);
      });
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useStockStore.setState({ error: "Some error" });

      act(() => {
        useStockStore.getState().clearError();
      });

      expect(useStockStore.getState().error).toBeNull();
    });
  });
});
