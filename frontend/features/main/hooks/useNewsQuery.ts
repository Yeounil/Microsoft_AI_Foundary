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
      // If user selected a specific stock, use that; otherwise use first watchlist item
      const symbol =
        selectedStock || (watchlist.length > 0 ? watchlist[0] : undefined);
      return await apiClient.getFinancialNewsV1({
        symbol,
        page: currentPage,
        limit: itemsPerPage,
        lang: "en",
      });
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
