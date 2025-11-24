import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartMode } from "../../services/dashboardChartService";

interface ChartModeSelectorProps {
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
}

/**
 * ChartModeSelector Component
 * Enhanced/Basic 모드 선택
 */
export function ChartModeSelector({
  chartMode,
  onChartModeChange,
}: ChartModeSelectorProps) {
  return (
    <Tabs
      value={chartMode}
      onValueChange={(v) => onChartModeChange(v as ChartMode)}
    >
      <TabsList className="h-10 sm:h-9">
        <TabsTrigger
          value="basic"
          className="text-xs px-3 py-2 min-w-[70px] min-h-9"
        >
          기본
        </TabsTrigger>
        <TabsTrigger
          value="enhanced"
          className="text-xs px-3 py-2 min-w-[70px] min-h-9"
        >
          고급
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
