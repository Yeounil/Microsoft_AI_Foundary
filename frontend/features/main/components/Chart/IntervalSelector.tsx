import { Button } from "@/components/ui/button";
import {
  ChartInterval,
  TimeRange,
  getIntervalLabel,
} from "../../services/chartService";

interface IntervalSelectorProps {
  timeRange: TimeRange;
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}

const INTERVALS: ChartInterval[] = ["1m", "5m", "15m", "30m", "1h"];

/**
 * IntervalSelector Component
 * 1D 차트일 때만 표시되는 간격 선택 버튼 그룹입니다.
 */
export function IntervalSelector({
  timeRange,
  interval,
  onIntervalChange,
}: IntervalSelectorProps) {
  // 1D가 아니면 표시하지 않음
  if (timeRange !== "1D") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <span className="text-sm text-muted-foreground self-center">간격:</span>
      {INTERVALS.map((int) => (
        <Button
          key={int}
          variant={interval === int ? "default" : "outline"}
          size="sm"
          onClick={() => onIntervalChange(int)}
          className="text-xs"
        >
          {getIntervalLabel(int)}
        </Button>
      ))}
    </div>
  );
}
