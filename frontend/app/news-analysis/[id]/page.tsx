"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { NewsAnalysis } from "@/features/news/components/NewsAnalysis";

export default function NewsAnalysisPageWrapper() {
  const params = useParams();
  const id = params.id as string;

  // API에서 뉴스 데이터 가져오기
  const {
    data: newsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["news", id],
    queryFn: async () => {
      const response = await apiClient.getNewsById(Number(id));
      return response;
    },
    enabled: !!id,
  });

  return (
    <NewsAnalysis newsData={newsData} isLoading={isLoading} error={error} />
  );
}
