import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * NewsAnalysis Service
 * 뉴스 분석 관련 타입 정의 및 유틸리티 함수
 */

export interface NewsData {
  id: number;
  title: string;
  source: string;
  published_at: string;
  url: string;
  body: string;
  kr_translate?: string;
  symbol?: string;
  ai_score?: number;
  positive_score?: number;
}

export interface RelatedNewsArticle {
  id: number;
  title: string;
  source?: string;
  published_at: string;
  positive_score?: number;
}

export interface ParsedTranslation {
  aiSummary: string;
  translatedContent: string;
}

export interface SentimentBadge {
  label: string;
  icon: typeof TrendingUp | typeof TrendingDown | typeof Minus;
  color: string;
}

export type SentimentType = "positive" | "negative" | "neutral";

/**
 * 한국어 번역 마크다운 파싱
 */
export function parseKoreanTranslation(krTranslate: string): ParsedTranslation {
  // <translation> 태그 제거
  const content = krTranslate.replace(/<\/?translation>/g, "").trim();

  // 마크다운 헤더 제거 및 섹션 분리
  const sections = content.split(/\n\n+/);
  const aiSummary = sections.find((s) => s.includes("#")) || "";
  const mainContent = sections.filter((s) => !s.includes("#")).join("\n\n");

  return {
    aiSummary: aiSummary.replace(/#+\s*/g, "").trim(),
    translatedContent: mainContent.trim(),
  };
}

/**
 * 감정 분석 타입 반환
 */
export function getSentiment(positiveScore?: number): SentimentType {
  if (positiveScore === undefined || positiveScore === null) return "neutral";
  if (positiveScore < 0.4) return "negative";
  if (positiveScore > 0.6) return "positive";
  return "neutral";
}

/**
 * 감정 분석 배지 정보 반환
 */
export function getSentimentBadge(positiveScore?: number): SentimentBadge {
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

/**
 * 주가 영향 메시지 반환
 */
export function getImpactMessage(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "긍정적 (주가 상승 예상)";
    case "negative":
      return "부정적 (주가 하락 예상)";
    default:
      return "중립적 (영향 미미)";
  }
}
