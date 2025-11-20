import { RefObject } from "react";
import { Loader2 } from "lucide-react";

interface ChartCanvasProps {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
}

/**
 * ChartCanvas Component
 * 차트가 렌더링될 div 컨테이너
 * 모바일 최적화: 뷰포트 기반 동적 높이, flex 레이아웃
 */
export function ChartCanvas({ chartContainerRef, isLoading = false }: ChartCanvasProps) {
  return (
    <div className="relative w-full min-h-[350px] h-[45vh] sm:h-[400px] md:h-[420px] lg:h-[450px] max-h-[500px]">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">차트 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
