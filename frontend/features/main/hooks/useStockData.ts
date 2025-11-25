import { useMemo, useEffect } from "react";
import { logger } from "@/lib/logger";

interface StockInfo {
  symbol: string;
  name: string;
}

interface StockBase {
  symbol: string;
  name: string;
  marketCap: number;
}

interface UseStockDataParams {
  supportedStocks: StockInfo[];
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
}

/**
 * StockData Hook
 * supportedStocks를 allStocks 포맷으로 변환하고 첫 번째 종목을 자동 선택합니다.
 */
export function useStockData({
  supportedStocks,
  onSelectStock,
  selectedSymbol,
}: UseStockDataParams) {
  // Convert supported stocks to allStocks format using useMemo
  const allStocks = useMemo(() => {
    if (supportedStocks.length > 0) {
      const stocks = supportedStocks.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        marketCap: 0,
      }));
      logger.info(
        `[useStockData] Received ${stocks.length} stocks from MainPage`
      );
      return stocks;
    }
    return [];
  }, [supportedStocks]);

  // Auto-select first stock (separate effect)
  useEffect(() => {
    if (allStocks.length > 0 && onSelectStock && !selectedSymbol) {
      onSelectStock(allStocks[0].symbol);
      logger.debug(`[useStockData] Auto-selected first stock: ${allStocks[0].symbol}`);
    }
  }, [allStocks, onSelectStock, selectedSymbol]);

  return {
    allStocks,
  };
}

export type { StockBase };
