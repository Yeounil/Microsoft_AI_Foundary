"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  NewsData,
  parseKoreanTranslation,
  getSentiment,
  getImpactMessage,
} from "../services/newsAnalysisService";
import { useRelatedNews } from "../hooks/useRelatedNews";
import { NewsAnalysisHeader } from "../components/NewsAnalysis/NewsAnalysisHeader";
import { ArticleHeader } from "../components/NewsAnalysis/ArticleHeader";
import { ImpactAnalysis } from "../components/NewsAnalysis/ImpactAnalysis";
import { ContentTabs } from "../components/NewsAnalysis/ContentTabs";
import { RelatedNewsList } from "../components/NewsAnalysis/RelatedNewsList";
import apiClient from "@/lib/api-client";
import { ReportGeneratingModal } from "@/components/reports/ReportGeneratingModal";

interface NewsAnalysisContainerProps {
  newsData: NewsData;
  isLoading: boolean;
  error: Error | null;
}

/**
 * NewsAnalysisContainer
 * 뉴스 분석 페이지의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function NewsAnalysisContainer({
  newsData,
  isLoading,
  error,
}: NewsAnalysisContainerProps) {
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // 관련 뉴스 hook
  const { relatedNews, page, setPage, hasNextPage } = useRelatedNews({
    symbol: newsData?.symbol,
    currentNewsId: newsData?.id || 0,
    isEnabled: !isLoading && !error,
  });

  // 레포트 생성 핸들러
  const handleGenerateReport = async () => {
    if (!newsData?.symbol) {
      alert("종목 정보를 찾을 수 없습니다.");
      return;
    }

    setIsGeneratingReport(true);
    setShowModal(true);

    try {
      // POST 요청으로 레포트 생성 (백그라운드 처리)
      const response = await apiClient.createNewsReport(newsData.symbol, 20);

      // 백그라운드 처리 시작 메시지 확인
      console.log("Report generation started:", response);

      // 모달은 사용자가 닫을 때까지 유지
      // SSE를 통해 완료 알림을 받으면 자동으로 페이지 이동
    } catch (err: unknown) {
      console.error("Failed to generate report:", err);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      alert(axiosError.response?.data?.detail || "레포트 생성 요청 중 오류가 발생했습니다.");
      setShowModal(false);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Early returns
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex h-[600px] items-center justify-center">
          <div className="text-sm text-muted-foreground">
            뉴스를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  if (error || !newsData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex h-[600px] items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              뉴스를 찾을 수 없습니다.
            </div>
            <Button onClick={() => router.back()}>뒤로가기</Button>
          </div>
        </div>
      </div>
    );
  }

  // 한국어 번역 파싱
  const { aiSummary, translatedContent } = newsData.kr_translate
    ? parseKoreanTranslation(newsData.kr_translate)
    : { aiSummary: "", translatedContent: "" };

  // 감정 분석
  const sentiment = getSentiment(newsData.positive_score);
  const impact = getImpactMessage(sentiment);

  // 관련 종목 (symbol만 있으면 배열로 변환)
  const relatedStocks = newsData.symbol ? [newsData.symbol] : [];

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
      {/* Report Generating Modal */}
      <ReportGeneratingModal
        open={showModal}
        onClose={() => setShowModal(false)}
        symbol={newsData?.symbol || ''}
      />

      {/* Header */}
      <NewsAnalysisHeader
        onBack={() => router.back()}
        isGeneratingReport={isGeneratingReport}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Side - Main Content */}
        <div className="space-y-4 md:space-y-6">
          {/* Article Header */}
          <ArticleHeader
            title={newsData.title}
            source={newsData.source}
            publishedAt={newsData.published_at}
            sentiment={sentiment}
          />

          {/* Impact Analysis */}
          <ImpactAnalysis
            sentiment={sentiment}
            impact={impact}
            aiScore={newsData.ai_score}
            relatedStocks={relatedStocks}
          />

          {/* Content Tabs */}
          <ContentTabs
            body={newsData.body}
            aiSummary={aiSummary}
            translatedContent={translatedContent}
            onViewReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
          />
        </div>

        {/* Right Side - Related News */}
        <div>
          <RelatedNewsList
            symbol={newsData.symbol}
            relatedNews={relatedNews}
            currentPage={page}
            onPageChange={setPage}
            hasNextPage={hasNextPage}
          />
        </div>
      </div>
    </div>
  );
}
