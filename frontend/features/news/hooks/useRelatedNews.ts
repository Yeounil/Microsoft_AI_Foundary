import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { RelatedNewsArticle } from "../services/newsAnalysisService";

interface UseRelatedNewsParams {
  symbol?: string;
  currentNewsId: number;
  isEnabled: boolean;
}

/**
 * RelatedNews Hook
 * 관련 뉴스를 fetching하고 페이지네이션을 관리합니다.
 */
export function useRelatedNews({
  symbol,
  currentNewsId,
  isEnabled,
}: UseRelatedNewsParams) {
  const [page, setPage] = useState(1);

  // 관련 뉴스 가져오기 (같은 종목)
  const { data: relatedNewsData } = useQuery({
    queryKey: ["related-news", symbol, page],
    queryFn: async () => {
      if (!symbol) return { articles: [] };
      return await apiClient.getFinancialNewsV1({
        symbol,
        page,
        limit: 6, // 현재 뉴스 필터링을 고려해서 6개 요청
        lang: "en",
      });
    },
    enabled: !!symbol && isEnabled,
  });

  // 현재 뉴스 제외한 관련 뉴스 (최대 5개만 표시)
  const relatedNews = (relatedNewsData?.articles
    ?.filter((article: RelatedNewsArticle) => article.id !== currentNewsId)
    .slice(0, 5) || []) as RelatedNewsArticle[];

  // 다음 페이지 존재 여부 (현재 페이지 데이터가 5개면 다음 페이지 존재 가능)
  const hasNextPage = relatedNews.length >= 5;

  return {
    relatedNews,
    page,
    setPage,
    hasNextPage,
  };
}
