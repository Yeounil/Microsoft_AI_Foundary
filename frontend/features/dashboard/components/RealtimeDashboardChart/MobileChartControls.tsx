"use client";

import { Download, BarChart3, LineChart, AreaChart, Sparkles, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onDownload: () => void;
}

const chartTypeIcons = {
  candlestick: BarChart3,
  line: LineChart,
  area: AreaChart,
};

const chartTypeLabels = {
  candlestick: "캔들",
  line: "라인",
  area: "영역",
};

const timeRanges: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "ALL"];

export function MobileChartControls({
  chartMode,
  onChartModeChange,
  chartType,
  onChartTypeChange,
  timeRange,
  onTimeRangeChange,
  onDownload,
}: MobileChartControlsProps) {
  return (
    <div className="flex gap-2 items-center">
      {/* 차트 모드 선택 */}
      <Select value={chartMode} onValueChange={(v) => onChartModeChange(v as ChartMode)}>
        <SelectTrigger className="w-[90px] h-10 touch-manipulation">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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

      {/* 차트 타입 선택 */}
      <Select value={chartType} onValueChange={(v) => onChartTypeChange(v as ChartType)}>
        <SelectTrigger className="w-[90px] h-10 touch-manipulation">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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

      {/* 시간 범위 선택 (Basic 모드에서만) */}
      {chartMode === "basic" && (
        <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
          <SelectTrigger className="w-[70px] h-10 touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((range) => (
              <SelectItem key={range} value={range}>
                {range}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 다운로드 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDownload}
        className="ml-auto min-h-[48px] min-w-[48px] touch-manipulation active:scale-95 transition-transform"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
