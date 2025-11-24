import { Button } from "@/components/ui/button";
import {
  getTimeRangeLabel,
  TimeRange,
} from "../../services/dashboardChartService";

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "ALL",
];

/**
 * TimeRangeSelector Component
 * 시간 범위 선택 버튼들
 */
export function TimeRangeSelector({
  timeRange,
  onTimeRangeChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
      {TIME_RANGES.map((range) => (
        <Button
          key={range}
          variant={timeRange === range ? "default" : "outline"}
          size="sm"
          onClick={() => onTimeRangeChange(range)}
          className="text-xs h-9 sm:h-8 px-2.5 sm:px-3 min-w-11 transition-all duration-200 hover:shadow-sm whitespace-nowrap shrink-0"
        >
          {getTimeRangeLabel(range)}
        </Button>
      ))}
    </div>
  );
}
