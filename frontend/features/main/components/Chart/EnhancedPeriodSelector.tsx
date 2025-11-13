import { Button } from "@/components/ui/button";
import {
  EnhancedPeriod,
  getEnhancedPeriodLabel,
} from "@/features/dashboard/services/dashboardChartService";

interface EnhancedPeriodSelectorProps {
  period: EnhancedPeriod;
  onPeriodChange: (period: EnhancedPeriod) => void;
}

const PERIODS: EnhancedPeriod[] = ["day", "week", "month", "year"];

/**
 * EnhancedPeriodSelector Component
 * Enhanced 모드에서 기간 선택 (일/주/월/년)
 */
export function EnhancedPeriodSelector({
  period,
  onPeriodChange,
}: EnhancedPeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {PERIODS.map((p) => (
        <Button
          key={p}
          variant={period === p ? "default" : "outline"}
          size="sm"
          onClick={() => onPeriodChange(p)}
          className="text-xs transition-all duration-200 hover:shadow-sm"
        >
          {getEnhancedPeriodLabel(p)}
        </Button>
      ))}
    </div>
  );
}
