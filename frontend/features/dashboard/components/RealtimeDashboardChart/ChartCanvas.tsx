import { RefObject } from "react";

interface ChartCanvasProps {
  chartContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * ChartCanvas Component
 * 차트가 렌더링될 div 컨테이너
 */
export function ChartCanvas({ chartContainerRef }: ChartCanvasProps) {
  return <div ref={chartContainerRef} className="relative w-full" />;
}
