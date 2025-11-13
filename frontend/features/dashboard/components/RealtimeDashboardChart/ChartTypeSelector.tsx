import { Button } from "@/components/ui/button";

export type ChartType = "area" | "line" | "candle";

interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

/**
 * ChartTypeSelector Component
 * 차트 타입 선택 (캔들/라인/영역)
 */
export function ChartTypeSelector({
  chartType,
  onChartTypeChange,
}: ChartTypeSelectorProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md">
      <Button
        variant={chartType === "candle" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChartTypeChange("candle")}
        className="h-9 px-3"
      >
        캔들
      </Button>
      <Button
        variant={chartType === "line" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChartTypeChange("line")}
        className="h-9 px-3"
      >
        라인
      </Button>
      <Button
        variant={chartType === "area" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChartTypeChange("area")}
        className="h-9 px-3"
      >
        영역
      </Button>
    </div>
  );
}
