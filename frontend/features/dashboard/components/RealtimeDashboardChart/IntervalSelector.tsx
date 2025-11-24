import { Button } from "@/components/ui/button";
import {
  ChartInterval,
  getIntervalLabel,
} from "@/features/main/services/chartService";

interface IntervalSelectorProps {
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
  show: boolean;
}

const INTERVALS: ChartInterval[] = ["1m", "5m", "15m", "30m", "1h"];

/**
 * IntervalSelector Component
 * 차트 간격 선택 (1D일 때만 표시)
 */
export function IntervalSelector({
  interval,
  onIntervalChange,
  show,
}: IntervalSelectorProps) {
  if (!show) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
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
