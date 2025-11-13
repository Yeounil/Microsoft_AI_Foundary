"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useStockStore } from "@/store/stock-store";
import { useChartInitialization } from "@/features/main/hooks/useChartInitialization";
import { useChartSeries } from "@/features/main/hooks/useChartSeries";
import { useHistoricalData } from "@/features/main/hooks/useHistoricalData";
import { useRealtimeWebSocket } from "@/features/main/hooks/useRealtimeWebSocket";
import {
  TimeRange,
  ChartInterval,
} from "@/features/main/services/chartService";
import {
  ChartMode,
  getBasicModeInterval,
} from "../services/dashboardChartService";
import { DashboardChartHeader } from "../components/RealtimeDashboardChart/DashboardChartHeader";
import { TimeRangeSelector } from "../components/RealtimeDashboardChart/TimeRangeSelector";
import { EnhancedChartSelector, type EnhancedChartType } from "../components/RealtimeDashboardChart/EnhancedChartSelector";
import { ChartCanvas } from "../components/RealtimeDashboardChart/ChartCanvas";

interface DashboardChartContainerProps {
  symbol: string;
}

/**
 * DashboardChartContainer
 * 대시보드 실시간 차트의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 * main의 Chart hooks를 재사용하여 차트 기능을 구현합니다.
 */
export function DashboardChartContainer({
  symbol,
}: DashboardChartContainerProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("enhanced");

  // Basic 모드 상태
  const [basicTimeRange, setBasicTimeRange] = useState<TimeRange>("1D");

  // Enhanced 모드 상태
  const [enhancedChartType, setEnhancedChartType] = useState<EnhancedChartType>("day");
  const [enhancedMinuteInterval, setEnhancedMinuteInterval] = useState<ChartInterval>("5m");

  const { selectedStock, watchlist, addToWatchlist, removeFromWatchlist } =
    useStockStore();

  const isInWatchlist = watchlist.includes(symbol);

  // 실제 차트에 사용될 timeRange와 interval 계산
  let timeRange: TimeRange;
  let interval: ChartInterval;

  if (chartMode === "basic") {
    timeRange = basicTimeRange;
    interval = getBasicModeInterval(basicTimeRange);
  } else {
    // Enhanced 모드
    if (enhancedChartType === "minute") {
      // 분단위: 모두 30일치 데이터
      timeRange = "1M";
      interval = enhancedMinuteInterval;
    } else if (enhancedChartType === "day") {
      // 일봉: 전체 데이터를 일 단위로
      timeRange = "ALL";
      interval = "1d";
    } else if (enhancedChartType === "week") {
      // 주봉: 전체 데이터를 주 단위로
      timeRange = "ALL";
      interval = "1d";
    } else if (enhancedChartType === "month") {
      // 월봉
      timeRange = "ALL";
      interval = "1d";
    } else {
      // 연봉
      timeRange = "ALL";
      interval = "1d";
    }
  }

  // 차트 초기화
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChartInitialization(chartContainerRef);

  // 차트 시리즈 생성 (Candlestick 고정)
  const seriesRef = useChartSeries(chartRef, "candle");

  // Historical 데이터 로드
  const { isLoading, priceInfo, setPriceInfo } = useHistoricalData(
    chartRef,
    seriesRef,
    symbol,
    timeRange,
    interval,
    "candle",
    chartMode
  );

  // 실시간 WebSocket 연결 (1D일 때만)
  const { isRealtime } = useRealtimeWebSocket(
    chartRef,
    seriesRef,
    symbol,
    timeRange,
    interval,
    "candle",
    priceInfo,
    setPriceInfo
  );

  // 관심 종목 토글
  const toggleWatchlist = useCallback(() => {
    if (isInWatchlist) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  }, [isInWatchlist, symbol, addToWatchlist, removeFromWatchlist]);

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
        <DashboardChartHeader
          symbol={symbol}
          companyName={selectedStock?.company_name}
          currentPrice={priceInfo.currentPrice ?? undefined}
          priceChange={priceInfo.priceChange}
          priceChangePercent={priceInfo.priceChangePercent}
          isRealtime={isRealtime}
          isLoading={isLoading}
          chartMode={chartMode}
          onChartModeChange={setChartMode}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={toggleWatchlist}
        />

        {/* Chart Mode에 따른 다른 UI */}
        <div className="mt-6">
          {chartMode === "basic" ? (
            // Basic 모드: TimeRange 버튼만 표시
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
        <ChartCanvas chartContainerRef={chartContainerRef} />
      </CardContent>
    </Card>
  );
}
