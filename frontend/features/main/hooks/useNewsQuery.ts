import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

/**
 * 뉴스 데이터 Fetching Hook
 * Hot news와 Watchlist news를 가져옵니다.
 */
export function useNewsQuery(
  selectedStock: string | null,
  currentPage: number,
  activeTab: string,
  watchlist: string[],
  isLoadingStocks: boolean,
  itemsPerPage: number
) {
  // Fetch hot news (general financial news)
  const hotNewsQuery = useQuery({
    queryKey: ["financial-news", "hot", selectedStock, currentPage],
    queryFn: async () => {
      return await apiClient.getFinancialNewsV1({
        symbol: selectedStock || undefined,
        page: currentPage,
        limit: itemsPerPage,
        lang: "en",
      });
    },
    enabled: !isLoadingStocks && activeTab === "hot",
    staleTime: 5 * 60 * 1000,
  });

  // Fetch watchlist news (news for user's watchlist stocks)
  const watchlistNewsQuery = useQuery({
    queryKey: ["financial-news", "watchlist", watchlist, selectedStock, currentPage],
    queryFn: async () => {
      // If user selected a specific stock, use that; otherwise use all watchlist
      if (selectedStock) {
        return await apiClient.getFinancialNewsV1({
          symbol: selectedStock,
          page: currentPage,
          limit: itemsPerPage,
          lang: "en",
        });
      } else if (watchlist.length > 0) {
        // 여러 종목의 뉴스를 한번에 가져옴 (쉼표로 구분)
        return await apiClient.getFinancialNewsV1({
          symbols: watchlist.join(","),
          page: currentPage,
          limit: itemsPerPage,
          lang: "en",
        });
      }
      return { articles: [], total_count: 0 };
    },
    enabled: !isLoadingStocks && activeTab === "favorites",
    staleTime: 5 * 60 * 1000,
  });

  return {
    hotNewsData: hotNewsQuery.data,
    isLoadingHot: hotNewsQuery.isLoading,
    watchlistNewsData: watchlistNewsQuery.data,
    isLoadingWatchlist: watchlistNewsQuery.isLoading,
  };
}
