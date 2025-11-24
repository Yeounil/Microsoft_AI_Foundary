import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

/**
 * 뉴스 데이터 Fetching Hook
 * Hot news, Watchlist news, Category news를 가져옵니다.
 */
export function useNewsQuery(
  selectedStock: string | null,
  currentPage: number,
  activeTab: string,
  watchlist: string[],
  isLoadingStocks: boolean,
  itemsPerPage: number,
  categorySymbols?: string[], // 선택된 카테고리의 종목 리스트
  mainTab: "hot" | "favorites" = "hot", // 메인 탭 상태
  categoryTab: string | null = null // 카테고리 탭 상태
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
    enabled: !isLoadingStocks && mainTab === "hot" && !categoryTab,
    staleTime: 5 * 60 * 1000,
  });

  // 관심종목 탭에서 검색 시 관심종목 검증
  const isStockNotInWatchlist =
    mainTab === "favorites" &&
    selectedStock !== null &&
    !watchlist.includes(selectedStock);

  // Fetch watchlist news (news for user's watchlist stocks)
  const watchlistNewsQuery = useQuery({
    queryKey: ["financial-news", "watchlist", watchlist, selectedStock, currentPage],
    queryFn: async () => {
      // 관심종목에 없는 종목을 검색한 경우
      if (selectedStock && !watchlist.includes(selectedStock)) {
        throw new Error("해당 종목이 관심 종목에 없습니다");
      }

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
    enabled: !isLoadingStocks && mainTab === "favorites" && !categoryTab,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch category news (news for selected category stocks)
  const categoryNewsQuery = useQuery({
    queryKey: ["financial-news", "category", mainTab, categorySymbols, watchlist, currentPage],
    queryFn: async () => {
      if (!categorySymbols || categorySymbols.length === 0) {
        return { articles: [], total_count: 0 };
      }

      // mainTab이 "favorites"인 경우, 관심종목과 카테고리의 교집합 사용
      let targetSymbols = categorySymbols;
      if (mainTab === "favorites") {
        targetSymbols = categorySymbols.filter(symbol => watchlist.includes(symbol));
        if (targetSymbols.length === 0) {
          return { articles: [], total_count: 0 };
        }
      }

      // 여러 종목의 뉴스를 한번에 가져옴 (쉼표로 구분)
      return await apiClient.getFinancialNewsV1({
        symbols: targetSymbols.join(","),
        page: currentPage,
        limit: itemsPerPage,
        lang: "en",
      });
    },
    enabled:
      !isLoadingStocks &&
      !!categoryTab &&
      !!categorySymbols &&
      categorySymbols.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    hotNewsData: hotNewsQuery.data,
    isLoadingHot: hotNewsQuery.isLoading,
    watchlistNewsData: watchlistNewsQuery.data,
    isLoadingWatchlist: watchlistNewsQuery.isLoading,
    watchlistError: watchlistNewsQuery.error,
    isStockNotInWatchlist,
    categoryNewsData: categoryNewsQuery.data,
    isLoadingCategory: categoryNewsQuery.isLoading,
  };
}
