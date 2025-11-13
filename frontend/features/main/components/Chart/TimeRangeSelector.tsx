import { Button } from "@/components/ui/button";
import { TimeRange, getTimeRangeLabel } from "../../services/chartService";

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
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
 * 차트의 시간 범위를 선택하는 버튼 그룹입니다.
 */
export function TimeRangeSelector({
  timeRange,
  onTimeRangeChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-4">
      {TIME_RANGES.map((range) => (
        <Button
          key={range}
          variant={timeRange === range ? "default" : "outline"}
          size="sm"
          onClick={() => onTimeRangeChange(range)}
          className="text-xs"
        >
          {getTimeRangeLabel(range)}
        </Button>
      ))}
    </div>
  );
}
