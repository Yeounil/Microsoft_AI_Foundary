"use client";

import { BarChart3, LineChart, AreaChart, Sparkles, Settings2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartMode } from "../../services/dashboardChartService";
import { type ChartType } from "./ChartTypeSelector";
import { type TimeRange } from "@/features/main/services/chartService";

interface MobileChartControlsProps {
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  timeRange?: TimeRange; // Optional로 변경
  onTimeRangeChange?: (range: TimeRange) => void; // Optional로 변경
  hideTimeRange?: boolean; // 시간 필터 숨김 옵션 추가
}

const chartTypeIcons = {
  candle: BarChart3,
  line: LineChart,
  area: AreaChart,
};

const chartTypeLabels = {
  candle: "캔들",
  line: "라인",
  area: "영역",
};

const timeRanges: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "ALL"];

const timeRangeLabels: Record<TimeRange, string> = {
  "1D": "1일",
  "1W": "1주",
  "1M": "1개월",
  "3M": "3개월",
  "6M": "6개월",
  "1Y": "1년",
  "5Y": "5년",
  "ALL": "전체"
};

export function MobileChartControls({
  chartMode,
  onChartModeChange,
  chartType,
  onChartTypeChange,
  timeRange = '1D',
  onTimeRangeChange,
  hideTimeRange = false,
}: MobileChartControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* 첫 번째 줄: 차트 모드와 차트 타입 - space-between으로 양쪽 끝 배치 */}
      <div className="flex justify-between items-center gap-2">
        {/* 차트 모드 선택 - 더 넓은 너비 */}
        <Select value={chartMode} onValueChange={(v) => onChartModeChange(v as ChartMode)}>
          <SelectTrigger className="flex-1 min-w-[100px] max-w-40 h-10 touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[100px]">
            <SelectItem value="basic">
              <span className="flex items-center gap-2">
                <Settings2 className="h-3 w-3" />
                기본
              </span>
            </SelectItem>
            <SelectItem value="enhanced">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                고급
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* 차트 타입 선택 - 더 넓은 너비 */}
        <Select value={chartType} onValueChange={(v) => onChartTypeChange(v as ChartType)}>
          <SelectTrigger className="flex-1 min-w-[100px] max-w-40 h-10 touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[100px]">
            {(Object.keys(chartTypeLabels) as ChartType[]).map((type) => {
              const Icon = chartTypeIcons[type];
              return (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3 w-3" />
                    {chartTypeLabels[type]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 두 번째 줄: 시간 범위 선택 (Basic 모드에서만) - 전체 너비 */}
      {chartMode === "basic" && onTimeRangeChange && (
        <div className="flex items-center">
          <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
            <SelectTrigger className="w-full h-10 touch-manipulation">
              <SelectValue placeholder="시간 범위 선택" />
            </SelectTrigger>
            <SelectContent className="w-full">
              {timeRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {timeRangeLabels[range]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
