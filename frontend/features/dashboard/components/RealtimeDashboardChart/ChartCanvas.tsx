"use client";

import { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCanvasProps {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  isMobile?: boolean;
}

/**
 * ChartCanvas Component
 * 차트가 렌더링될 div 컨테이너
 * 모바일 최적화: 뷰포트 기반 동적 높이, 패딩 제거로 전체 너비 활용
 */
export function ChartCanvas({ chartContainerRef, isLoading = false, isMobile = false }: ChartCanvasProps) {
  return (
    <div
      className={cn(
        "relative w-full",
        // 모바일: 35vh, 태블릿: 40vh, 데스크탑: 450px
        "min-h-[300px] h-[35vh] sm:h-[380px] md:h-[40vh] lg:h-[450px] max-h-[500px]",
        // 모바일에서 네거티브 마진으로 전체 너비 활용
        isMobile && "-mx-3 pl-5"
      )}
    >
      <div
        ref={chartContainerRef}
        className={cn(
          "w-full h-full",
          // 모바일에서 패딩 제거
          isMobile ? "px-0" : "",
          // 차트 테이블 커스터마이징 예시
          "[&_td:last-child]:cursor-none",     
          "[&_td:last-child]:pointer-events-none"
        )}
      />

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
