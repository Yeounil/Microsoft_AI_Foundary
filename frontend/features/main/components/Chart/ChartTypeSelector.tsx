import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartType } from "../../services/chartService";

interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChartTypeChange: (chartType: ChartType) => void;
}

/**
 * ChartTypeSelector Component
 * 차트 타입(캔들/라인/영역)을 선택하는 탭 컴포넌트입니다.
 */
export function ChartTypeSelector({
  chartType,
  onChartTypeChange,
}: ChartTypeSelectorProps) {
  return (
    <Tabs
      value={chartType}
      onValueChange={(v) => onChartTypeChange(v as ChartType)}
    >
      <TabsList className="h-9">
        <TabsTrigger value="candle" className="text-xs">
          캔들
        </TabsTrigger>
        <TabsTrigger value="line" className="text-xs">
          라인
        </TabsTrigger>
        <TabsTrigger value="area" className="text-xs">
          영역
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
