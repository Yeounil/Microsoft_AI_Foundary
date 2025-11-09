"use client";

import { useState } from 'react';
import { TranslatedNewsContent } from './TranslatedNewsContent';
import { RelatedNewsList } from './RelatedNewsList';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, FileText, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewsAnalysisPageProps {
  newsId: string;
}

export function NewsAnalysisPage({ newsId }: NewsAnalysisPageProps) {
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    // TODO: AI 분석 레포트 생성 API 호출
    setTimeout(() => {
      setIsGeneratingReport(false);
      // 레포트 페이지로 이동
      router.push(`/news-report/${newsId}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="container mx-auto px-6 py-4 max-w-[1600px]">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로 가기
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4" />
                {isGeneratingReport ? 'AI 분석 중...' : '관련 뉴스 AI 분석'}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-white" align="end">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-900">관련 뉴스 AI 분석이란?</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      우측의 유사 뉴스 목록을 AI가 종합적으로 분석하여 상세 레포트를 생성합니다.
                      여러 뉴스 소스의 정보를 통합하여 더 폭넓은 인사이트를 제공합니다.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-6 py-6 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* 왼쪽: AI 번역된 뉴스 */}
          <TranslatedNewsContent newsId={newsId} />

          {/* 오른쪽: 유사 뉴스 */}
          <RelatedNewsList newsId={newsId} />
        </div>
      </div>
    </div>
  );
}
