import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewsAnalysisHeaderProps {
  onBack: () => void;
  onViewReport: () => void;
}

/**
 * NewsAnalysisHeader Component
 * 뉴스 분석 페이지 헤더 (뒤로가기, AI 종합 분석 버튼)
 */
export function NewsAnalysisHeader({
  onBack,
  onViewReport,
}: NewsAnalysisHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between border-b pb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로가기
      </Button>
      <div className="flex items-center gap-2">
        <Button onClick={onViewReport}>관련 뉴스 AI 종합 분석</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
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
