/**
 * News Service
 * 뉴스 관련 유틸리티 함수들을 제공합니다.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface FinancialNewsArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  sentiment?: string;
  symbol?: string;
  text?: string;
  kr_translate?: string;
  positive_score?: number;
}

export interface SentimentBadge {
  label: string;
  icon: typeof TrendingUp | typeof TrendingDown | typeof Minus;
  color: string;
}

/**
 * positive_score를 기반으로 감정 분석 결과를 반환합니다.
 */
export function getSentiment(positiveScore?: number): SentimentBadge {
  if (positiveScore === undefined || positiveScore === null) {
    return { label: "중립", icon: Minus, color: "bg-gray-50 text-gray-600" };
  }
  if (positiveScore < 0.4) {
    return {
      label: "부정",
      icon: TrendingDown,
      color: "bg-red-50 text-red-600",
    };
  }
  if (positiveScore > 0.6) {
    return {
      label: "긍정",
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    };
  }
  return { label: "중립", icon: Minus, color: "bg-gray-50 text-gray-600" };
}
