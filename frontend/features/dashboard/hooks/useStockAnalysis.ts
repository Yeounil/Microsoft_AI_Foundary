import { createMockAnalysis } from "../services/analysisService";

/**
 * StockAnalysis Hook
 * 주식 AI 분석 데이터를 fetching합니다.
 * Note: analyzeStock API is removed, using mock data only
 */
export function useStockAnalysis(symbol: string) {
  // Removed API call, using mock data only
  const mockAnalysis = createMockAnalysis(symbol);

  return {
    analysisData: mockAnalysis,
    isLoading: false,
  };
}
