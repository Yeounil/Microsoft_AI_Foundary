import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { createMockAnalysis } from "../services/analysisService";

/**
 * StockAnalysis Hook
 * 주식 AI 분석 데이터를 fetching합니다.
 */
export function useStockAnalysis(symbol: string) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", symbol],
    queryFn: () => apiClient.analyzeStock(symbol, "1mo"),
  });

  const mockAnalysis = createMockAnalysis(symbol);
  const analysisData = analysis || mockAnalysis;

  return {
    analysisData,
    isLoading,
  };
}
