import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartMode } from "@/features/dashboard/services/dashboardChartService";

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
      <TabsList className="h-9">
        <TabsTrigger value="enhanced" className="text-xs">
          Enhanced
        </TabsTrigger>
        <TabsTrigger value="basic" className="text-xs">
          Basic
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
