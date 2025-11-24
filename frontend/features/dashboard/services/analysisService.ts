import { StockAnalysis } from "@/types";

/**
 * Analysis Service
 * 분석 관련 타입 정의 및 유틸리티 함수
 */

export type RiskLevel = "low" | "medium" | "high";

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "bg-green-500";
    case "medium":
      return "bg-yellow-500";
    case "high":
      return "bg-red-500";
  }
}

export function getRiskText(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "낮음";
    case "medium":
      return "보통";
    case "high":
      return "높음";
  }
}

export function getRiskProgress(level: RiskLevel): number {
  switch (level) {
    case "low":
      return 33;
    case "medium":
      return 66;
    case "high":
      return 100;
  }
}

export function getRiskBadgeVariant(
  level: RiskLevel
): "default" | "secondary" | "destructive" {
  switch (level) {
    case "low":
      return "default";
    case "medium":
      return "secondary";
    case "high":
      return "destructive";
  }
}

/**
 * Mock 분석 데이터 생성
 */
export function createMockAnalysis(symbol: string): StockAnalysis {
  return {
    symbol,
    ai_score: 76,
    market_sentiment: 75,
    volatility_index: 42,
    liquidity_score: 83,
    recommendation: "현재 상승 모멘텀이 강하며, 단기 투자에 적합한 시점입니다.",
    technical_indicators: {
      rsi: 65,
      macd: 0.5,
      ma_50: 150.25,
      ma_200: 145.8,
    },
    financial_ratios: {
      pe_ratio: 28.5,
      pb_ratio: 7.2,
      debt_to_equity: 1.2,
      roe: 25.3,
    },
    risk_analysis: {
      market_risk: "low",
      volatility_risk: "medium",
      liquidity_risk: "low",
    },
  };
}
