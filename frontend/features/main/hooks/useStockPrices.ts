import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { createPricesMap, StockQuote } from "../services/stockListService";
import { StockBase } from "./useStockData";
import { logger } from "@/lib/logger";

/**
 * StockPrices Hook
 * 초기 배치 로딩 및 주기적인 가격 업데이트(polling)를 관리합니다.
 */
export function useStockPrices(allStocks: StockBase[]) {
  const [stockPrices, setStockPrices] = useState<
    Record<string, { price: number; change: number; changePercent: number }>
  >({});

  // 시가총액 상위 100개의 가격 로드 (배치 조회)
  useEffect(() => {
    if (allStocks.length === 0) return;

    const loadPrices = async () => {
      try {
        // 시가총액 상위 100개 (또는 전체)
        const topSymbols = allStocks.slice(0, 100).map((s) => s.symbol);

        logger.info(
          "[useStockPrices] Loading prices for top 100 stocks via backend..."
        );
        const response = await apiClient.getBatchQuotes(topSymbols);

        if (response.quotes && Array.isArray(response.quotes)) {
          const pricesMap = createPricesMap(
            response.quotes as StockQuote[]
          );

          setStockPrices(pricesMap);
          logger.info(
            `[useStockPrices] Loaded ${response.quotes.length} prices`
          );
        }
      } catch (error) {
        console.error("[useStockPrices] Failed to load prices:", error);
      }
    };

    loadPrices();
  }, [allStocks]);

  // 주기적으로 가격 업데이트 (WebSocket 대신 polling)
  useEffect(() => {
    if (allStocks.length === 0) return;

    const updatePrices = async () => {
      try {
        const topSymbols = allStocks.slice(0, 20).map((s) => s.symbol);
        const response = await apiClient.getBatchQuotes(topSymbols);

        if (response.quotes && Array.isArray(response.quotes)) {
          const pricesMap = createPricesMap(
            response.quotes as StockQuote[]
          );

          setStockPrices((prev) => ({ ...prev, ...pricesMap }));
        }
      } catch (error) {
        console.error("[useStockPrices] Failed to update prices:", error);
      }
    };

    // 30초마다 가격 업데이트
    const interval = setInterval(updatePrices, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [allStocks]);

  return { stockPrices };
}
