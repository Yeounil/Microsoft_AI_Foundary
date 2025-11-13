import { useState, useEffect } from "react";
import { convertToStockItems } from "../services/stockListService";

interface StockBase {
  symbol: string;
  name: string;
  marketCap: number;
}

interface UseStockDataParams {
  supportedStocks: string[];
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
  const [allStocks, setAllStocks] = useState<StockBase[]>([]);

  // Convert supported stocks to allStocks format
  useEffect(() => {
    if (supportedStocks.length > 0) {
      const stocks = convertToStockItems(supportedStocks);
      setAllStocks(stocks);
      console.log(
        `[useStockData] ✅ Received ${stocks.length} stocks from MainPage`
      );

      // 첫 번째 종목을 자동으로 선택
      if (stocks.length > 0 && onSelectStock && !selectedSymbol) {
        onSelectStock(stocks[0].symbol);
        console.log(`[useStockData] Auto-selected first stock: ${stocks[0].symbol}`);
      }
    }
  }, [supportedStocks, onSelectStock, selectedSymbol]);

  return {
    allStocks,
  };
}

export type { StockBase };
