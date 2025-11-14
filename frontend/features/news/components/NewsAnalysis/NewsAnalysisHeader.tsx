import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewsAnalysisHeaderProps {
  onBack: () => void;
  onViewReport: () => void;
  isGeneratingReport?: boolean;
}

/**
 * NewsAnalysisHeader Component
 * 뉴스 분석 페이지 헤더 (뒤로가기, AI 종합 분석 버튼)
 */
export function NewsAnalysisHeader({
  onBack,
  onViewReport,
  isGeneratingReport = false,
}: NewsAnalysisHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between border-b pb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="flex items-center gap-2"
        disabled={isGeneratingReport}
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로가기
      </Button>
      <div className="flex items-center gap-2">
        <Button onClick={onViewReport} disabled={isGeneratingReport}>
          {isGeneratingReport ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              레포트 생성 중...
            </>
          ) : (
            "관련 뉴스 AI 종합 분석"
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isGeneratingReport}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end">
            <p className="text-sm">
              AI가 관련 뉴스를 종합적으로 분석하여 투자 인사이트를 제공합니다.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
