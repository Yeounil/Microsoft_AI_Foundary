import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartInterval } from "../../services/dashboardChartService";

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
    <div className="w-full">
      {/* 모바일 S (320px): gap 없는 컴팩트 레이아웃 */}
      <div className="flex items-center justify-between min-[360px]:hidden">
        {/* 분단위 탭 */}
        {chartType === "minute" ? (
          <Select value={minuteInterval} onValueChange={onMinuteIntervalChange}>
            <SelectTrigger className="flex-1 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-none border-r-0">
              <SelectValue>{currentMinuteLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-20">
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
            className="flex-1 h-9 text-xs rounded-r-none border-r-0"
          >
            분단위
          </Button>
        )}

        {/* 일/주/월/년 탭 - 간격 없이 연결 */}
        {PERIOD_TYPES.map((type, index) => {
          const isFirst = index === 0;
          const isLast = index === PERIOD_TYPES.length - 1;
          const isActive = chartType === type.value;

          return (
            <Button
              key={type.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodClick(type.value)}
              className={`flex-1 h-9 text-xs ${
                !isFirst && !isLast ? 'rounded-none border-r-0' : ''
              } ${
                isFirst ? 'rounded-l-none rounded-r-none border-r-0' : ''
              } ${
                isLast ? 'rounded-l-none' : ''
              }`}
            >
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* 모바일 M (360px-450px): space-between 레이아웃 */}
      <div className="hidden min-[360px]:flex min-[450px]:hidden items-center justify-between gap-1">
        {/* 분단위 탭 */}
        {chartType === "minute" ? (
          <Select value={minuteInterval} onValueChange={onMinuteIntervalChange}>
            <SelectTrigger className="w-[70px] h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <SelectValue>{currentMinuteLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-20">
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
            className="w-[70px] h-9 text-xs"
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
            className="h-9 text-xs px-3 min-w-[50px]"
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* 모바일 L (450px+) 및 태블릿/데스크탑: 기본 정렬 */}
      <div className="hidden min-[450px]:flex items-center gap-2">
        {/* 분단위 탭 */}
        {chartType === "minute" ? (
          <Select value={minuteInterval} onValueChange={onMinuteIntervalChange}>
            <SelectTrigger className="w-[85px] h-9 sm:h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <SelectValue>{currentMinuteLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[85px]">
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
            className="w-[85px] h-9 sm:h-8 text-xs"
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
            className="h-9 sm:h-8 text-xs px-3 sm:px-4 min-w-[50px] sm:min-w-[60px]"
          >
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
