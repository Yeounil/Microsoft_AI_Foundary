"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewsList } from "./NewsList";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

interface SimpleNewsSectionProps {
  symbol: string;
}

/**
 * SimpleNewsSection
 * 상세페이지용 단순 뉴스 섹션 컴포넌트
 * - 탭 없음
 * - 검색창 없음
 * - 단일 종목 뉴스만 표시
 */
export function SimpleNewsSection({ symbol }: SimpleNewsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 단일 종목 뉴스 조회
  const { data: newsData, isLoading } = useQuery({
    queryKey: ["news", "simple", symbol, currentPage],
    queryFn: async () => {
      return await apiClient.getFinancialNewsV1({
        symbol: symbol,
        page: currentPage,
        limit: itemsPerPage,
        lang: "en",
      });
    },
    enabled: !!symbol,
  });

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>{symbol} 뉴스</CardTitle>
      </CardHeader>
      <CardContent>
        <NewsList
          news={newsData?.articles || []}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
          selectedStock={symbol}
          itemsPerPage={itemsPerPage}
        />
      </CardContent>
    </Card>
  );
}
