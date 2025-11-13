import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartInterval } from "../../services/dashboardChartService";

interface EnhancedIntervalSelectorProps {
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}

const INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "1m", label: "1분" },
  { value: "5m", label: "5분" },
  { value: "15m", label: "15분" },
  { value: "30m", label: "30분" },
  { value: "1h", label: "60분" },
];

/**
 * EnhancedIntervalSelector Component
 * Enhanced 모드에서 시간 간격 선택 (1분/5분/15분/30분/60분)
 */
export function EnhancedIntervalSelector({
  interval,
  onIntervalChange,
}: EnhancedIntervalSelectorProps) {
  return (
    <Select value={interval} onValueChange={onIntervalChange}>
      <SelectTrigger className="w-[100px] h-9 text-xs">
        <SelectValue placeholder="간격 선택" />
      </SelectTrigger>
      <SelectContent>
        {INTERVALS.map((item) => (
          <SelectItem key={item.value} value={item.value} className="text-xs">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
