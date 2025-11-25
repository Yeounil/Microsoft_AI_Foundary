"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadingStore } from "@/store/loading-store";
import { useDevice } from "@/hooks/useDevice";
import { useChartInitialization } from "../hooks/useChartInitialization";
import { useChartSeries } from "../hooks/useChartSeries";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { useRealtimeWebSocket } from "../hooks/useRealtimeWebSocket";
import { ChartHeader } from "../components/Chart/ChartHeader";
import { ChartModeSelector } from "../components/Chart/ChartModeSelector";
import { ChartTypeSelector } from "../components/Chart/ChartTypeSelector";
import { TimeRangeSelector } from "../components/Chart/TimeRangeSelector";
import { EnhancedChartSelector, type EnhancedChartType } from "../components/Chart/EnhancedChartSelector";
import { ChartCanvas } from "../components/Chart/ChartCanvas";
import {
  ChartType,
  TimeRange,
  ChartInterval,
} from "../services/chartService";
import {
  ChartMode,
  getBasicModeInterval,
} from "@/features/dashboard/services/dashboardChartService";

interface RealtimeChartContainerProps {
  symbol: string;
}

/**
 * RealtimeChartContainer
 * 차트의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function RealtimeChartContainer({
  symbol,
}: RealtimeChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 디바이스 타입 감지
  const { isMobile, isTablet } = useDevice();

  // UI 상태
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [chartMode, setChartMode] = useState<ChartMode>("enhanced");

  // Basic 모드 상태
  const [basicTimeRange, setBasicTimeRange] = useState<TimeRange>("1M");

  // Enhanced 모드 상태
  const [enhancedChartType, setEnhancedChartType] = useState<EnhancedChartType>("day");
  const [enhancedMinuteInterval, setEnhancedMinuteInterval] = useState<ChartInterval>("5m");

  // 실제 차트에 사용될 timeRange와 interval 계산
  let timeRange: TimeRange;
  let interval: ChartInterval;

  if (chartMode === "basic") {
    timeRange = basicTimeRange;
    interval = getBasicModeInterval(basicTimeRange);
  } else {
    // Enhanced 모드
    if (enhancedChartType === "minute") {
      // 분단위: interval에 따라 적절한 기간 설정 (FMP API 제한)
      interval = enhancedMinuteInterval;
      // 1분/5분: 7일, 15분/30분/1시간: 30일
      if (interval === "1m" || interval === "5m") {
        timeRange = "1W";
      } else {
        timeRange = "1M";
      }
    } else if (enhancedChartType === "day") {
      // 일봉: 전체 데이터를 일 단위로
      timeRange = "ALL";
      interval = "1d";
    } else if (enhancedChartType === "week") {
      // 주봉: 일봉 데이터를 가져와서 프론트에서 주봉으로 집계
      timeRange = "ALL";
      interval = "1wk"; // useHistoricalData에서 집계 시 사용
    } else if (enhancedChartType === "month") {
      // 월봉: 일봉 데이터를 가져와서 프론트에서 월봉으로 집계
      timeRange = "ALL";
      interval = "1mo"; // useHistoricalData에서 집계 시 사용
    } else {
      // 연봉: 일봉 데이터를 가져와서 프론트에서 연봉으로 집계
      timeRange = "ALL";
      interval = "1y"; // useHistoricalData에서 집계 시 사용
    }
  }

  // Global loading state
  const { setChartLoading } = useLoadingStore();

  // Hooks
  const chartRef = useChartInitialization(chartContainerRef);
  const seriesRef = useChartSeries(chartRef, chartType);
  const { isLoading, priceInfo, setPriceInfo } = useHistoricalData(
    chartRef,
    seriesRef,
    symbol,
    timeRange,
    interval,
    chartType,
    chartMode,
    enhancedChartType, // Enhanced 차트 타입도 전달
    isMobile, // 모바일 여부 전달
    isTablet // 태블릿 여부 전달
  );
  const { isRealtime } = useRealtimeWebSocket(
    chartRef,
    seriesRef,
    symbol,
    timeRange,
    interval,
    chartType,
    priceInfo,
    setPriceInfo
  );

  // Update global loading state
  useEffect(() => {
    setChartLoading(isLoading);
  }, [isLoading, setChartLoading]);

  // Basic 모드 시간 범위 변경
  const handleBasicTimeRangeChange = useCallback((range: TimeRange) => {
    setBasicTimeRange(range);
  }, []);

  // Enhanced 모드 차트 타입 변경
  const handleEnhancedChartTypeChange = useCallback((type: EnhancedChartType) => {
    setEnhancedChartType(type);
  }, []);

  // Enhanced 모드 분단위 간격 변경
  const handleEnhancedMinuteIntervalChange = useCallback(
    (newInterval: ChartInterval) => {
      setEnhancedMinuteInterval(newInterval);
    },
    []
  );

  // Basic 모드일 때 차트 스크롤/줌 비활성화
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: chartMode !== "basic",
        handleScale: chartMode !== "basic",
      });
    }
  }, [chartMode, chartRef]);

  return (
    <Card>
      <CardHeader>
        {/* 헤더: 가격 정보 */}
        <ChartHeader
          symbol={symbol}
          isRealtime={isRealtime}
          isLoading={isLoading}
          currentPrice={priceInfo.currentPrice}
          priceChange={priceInfo.priceChange}
          priceChangePercent={priceInfo.priceChangePercent}
        />

        {/* 차트 모드 선택 + 차트 타입 선택 */}
        <div className="flex items-center gap-3 mt-4">
          <ChartModeSelector
            chartMode={chartMode}
            onChartModeChange={(mode) => setChartMode(mode)}
          />
          <ChartTypeSelector
            chartType={chartType}
            onChartTypeChange={setChartType}
          />
        </div>

        {/* Chart Mode에 따른 다른 UI */}
        <div className="mt-4">
          {chartMode === "basic" ? (
            // Basic 모드: TimeRange 버튼만 표시 (interval은 자동 설정)
            <TimeRangeSelector
              timeRange={basicTimeRange}
              onTimeRangeChange={handleBasicTimeRangeChange}
            />
          ) : (
            // Enhanced 모드: 분단위/일/주/월/년 선택
            <EnhancedChartSelector
              chartType={enhancedChartType}
              onChartTypeChange={handleEnhancedChartTypeChange}
              minuteInterval={enhancedMinuteInterval}
              onMinuteIntervalChange={handleEnhancedMinuteIntervalChange}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ChartCanvas chartContainerRef={chartContainerRef} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
