import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartInterval } from "../../services/chartService";

export type EnhancedChartType = "minute" | "day" | "week" | "month" | "year";

interface EnhancedChartSelectorProps {
  chartType: EnhancedChartType;
  onChartTypeChange: (type: EnhancedChartType) => void;
  minuteInterval?: ChartInterval;
  onMinuteIntervalChange?: (interval: ChartInterval) => void;
}

const MINUTE_INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: "1m", label: "1분" },
  { value: "5m", label: "5분" },
  { value: "15m", label: "15분" },
  { value: "30m", label: "30분" },
  { value: "1h", label: "60분" },
];

const PERIOD_TYPES: { value: Exclude<EnhancedChartType, "minute">; label: string }[] = [
  { value: "day", label: "일" },
  { value: "week", label: "주" },
  { value: "month", label: "월" },
  { value: "year", label: "년" },
];

/**
 * EnhancedChartSelector Component
 * Enhanced 모드의 차트 타입 선택 (분단위/일/주/월/년)
 */
export function EnhancedChartSelector({
  chartType,
  onChartTypeChange,
  minuteInterval = "5m",
  onMinuteIntervalChange,
}: EnhancedChartSelectorProps) {
  const handleMinuteTabClick = () => {
    if (chartType !== "minute") {
      onChartTypeChange("minute");
    }
  };

  const handlePeriodClick = (type: Exclude<EnhancedChartType, "minute">) => {
    onChartTypeChange(type);
  };

  // 현재 선택된 분단위 간격의 레이블 찾기
  const currentMinuteLabel = MINUTE_INTERVALS.find(
    (item) => item.value === minuteInterval
  )?.label || "분단위";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 분단위 탭 - 클릭 시 셀렉트박스로 변환 */}
      {chartType === "minute" ? (
        <Select value={minuteInterval} onValueChange={onMinuteIntervalChange}>
          <SelectTrigger className="w-[85px] h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
            <SelectValue>
              {currentMinuteLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-[85px] min-w-[85px]">
            {MINUTE_INTERVALS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMinuteTabClick}
          className="w-[85px] h-9 text-xs"
        >
          분단위
        </Button>
      )}

      {/* 일/주/월/년 탭 */}
      {PERIOD_TYPES.map((type) => (
        <Button
          key={type.value}
          variant={chartType === type.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePeriodClick(type.value)}
          className="text-xs"
        >
          {type.label}
        </Button>
      ))}
    </div>
  );
}
