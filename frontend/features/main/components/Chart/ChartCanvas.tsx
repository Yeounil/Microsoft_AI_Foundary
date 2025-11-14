import { RefObject } from "react";
import { Loader2 } from "lucide-react";

interface ChartCanvasProps {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
}

/**
 * ChartCanvas Component
 * lightweight-charts가 렌더링될 div 컨테이너를 제공합니다.
 */
export function ChartCanvas({ chartContainerRef, isLoading = false }: ChartCanvasProps) {
  return (
    <div className="relative w-full min-h-[450px]">
      <div ref={chartContainerRef} className="relative w-full min-h-[450px]" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 min-h-[450px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">차트 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
