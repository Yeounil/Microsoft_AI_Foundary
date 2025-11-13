import { RefObject } from "react";

interface ChartCanvasProps {
  chartContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * ChartCanvas Component
 * lightweight-charts가 렌더링될 div 컨테이너를 제공합니다.
 */
export function ChartCanvas({ chartContainerRef }: ChartCanvasProps) {
  return <div ref={chartContainerRef} className="relative w-full" />;
}
