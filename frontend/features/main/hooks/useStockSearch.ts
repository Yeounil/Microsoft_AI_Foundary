import { useMemo } from "react";
import { StockItem } from "../services/stockListService";

/**
 * StockSearch Hook
 * 종목 검색 필터링 로직을 관리합니다.
 */
export function useStockSearch(stocks: StockItem[], searchQuery: string) {
  // 검색 필터링
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;

    const query = searchQuery.toLowerCase();
    return stocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);

  return { filteredStocks };
}
