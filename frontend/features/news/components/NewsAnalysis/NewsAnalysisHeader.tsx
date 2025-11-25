import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsAnalysisHeaderProps {
  onBack: () => void;
  isGeneratingReport?: boolean;
}

/**
 * NewsAnalysisHeader Component
 * 뉴스 분석 페이지 헤더 (뒤로가기, AI 종합 분석 버튼)
 */
export function NewsAnalysisHeader({
  onBack,
  isGeneratingReport = false,
}: NewsAnalysisHeaderProps) {
  return (
    <div className="mb-4 md:mb-6 flex items-center border-b pb-3 md:pb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm -ml-2"
        disabled={isGeneratingReport}
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로가기
      </Button>
    </div>
  );
}
