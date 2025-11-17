/**
 * Stock Categories
 * 주식 카테고리 한글 매핑 및 관련 유틸리티
 */

export const CATEGORY_LABELS: Record<string, string> = {
  tech: "기술",
  finance: "금융",
  healthcare: "헬스케어",
  retail_consumer: "소비재",
  industrials: "산업",
  energy: "에너지",
  communications: "통신",
  etfs: "ETF",
};

export const CATEGORY_ORDER = [
  "tech",
  "finance",
  "healthcare",
  "retail_consumer",
  "industrials",
  "energy",
  "communications",
  "etfs",
];

export type CategoryKey = keyof typeof CATEGORY_LABELS;
