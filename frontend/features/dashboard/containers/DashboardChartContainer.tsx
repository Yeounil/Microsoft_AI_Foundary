"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDevice } from "@/hooks/useDevice";
import { useStockStore } from "@/store/stock-store";
import { useLoadingStore } from "@/store/loading-store";
import { useChartSettingsStore } from "@/store/chart-settings-store";
import { useSupportedStocks } from "@/hooks/useSupportedStocks";
import { logger } from "@/lib/logger";
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
import { ChartModeSelector } from "../components/RealtimeDashboardChart/ChartModeSelector";
import { ChartTypeSelector, type ChartType } from "../components/RealtimeDashboardChart/ChartTypeSelector";
import { TimeRangeSelector } from "../components/RealtimeDashboardChart/TimeRangeSelector";
import {
  EnhancedChartSelector,
  type EnhancedChartType,
} from "../components/RealtimeDashboardChart/EnhancedChartSelector";
import { ChartCanvas } from "../components/RealtimeDashboardChart/ChartCanvas";
import { MobileChartHeader } from "../components/RealtimeDashboardChart/MobileChartHeader";
import { MobileChartControls } from "../components/RealtimeDashboardChart/MobileChartControls";

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
  // 디바이스 타입 감지
  const { isMobile, isTablet } = useDevice();

  // 차트 설정 스토어에서 저장된 설정 불러오기
  const {
    getSettings,
    setChartType: saveChartType,
    setChartMode: saveChartMode,
    setBasicTimeRange: saveBasicTimeRange,
    setEnhancedChartType: saveEnhancedChartType,
    setEnhancedMinuteInterval: saveEnhancedMinuteInterval,
  } = useChartSettingsStore();

  // 디바이스별 설정 가져오기
  const settings = getSettings(isMobile);

  // UI 상태 (디바이스별 저장된 설정으로 초기화)
  const [chartType, setChartType] = useState<ChartType>(settings.chartType);
  const [chartMode, setChartMode] = useState<ChartMode>(settings.chartMode);

  // Basic 모드 상태
  const [basicTimeRange, setBasicTimeRange] = useState<TimeRange>(settings.basicTimeRange);

  // Enhanced 모드 상태
  const [enhancedChartType, setEnhancedChartType] =
    useState<EnhancedChartType>(settings.enhancedChartType);
  const [enhancedMinuteInterval, setEnhancedMinuteInterval] =
    useState<ChartInterval>(settings.enhancedMinuteInterval);

  const { selectedStock, watchlist, addToWatchlist, removeFromWatchlist } =
    useStockStore();
  const { setChartLoading } = useLoadingStore();
  const { stocks: supportedStocks } = useSupportedStocks();

  // Company name fallback: selectedStock > supportedStocks > symbol
  const companyName = useMemo(() => {
    // 1. selectedStock에서 company_name이 symbol과 다르면 사용
    if (selectedStock?.company_name && selectedStock.company_name !== symbol) {
      return selectedStock.company_name;
    }
    // 2. supportedStocks에서 name 찾기
    const stockInfo = supportedStocks.find((s) => s.symbol === symbol);
    if (stockInfo?.name && stockInfo.name !== symbol) {
      return stockInfo.name;
    }
    // 3. fallback: symbol 그대로
    return undefined;
  }, [selectedStock?.company_name, supportedStocks, symbol]);

  // 설정 변경 시 저장 (디바이스 구분)
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setChartType(type);
    saveChartType(type, isMobile);
  }, [saveChartType, isMobile]);

  const handleChartModeChange = useCallback((mode: ChartMode) => {
    setChartMode(mode);
    saveChartMode(mode, isMobile);
  }, [saveChartMode, isMobile]);

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

  // 차트 초기화
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChartInitialization(chartContainerRef);

  // 차트 시리즈 생성
  const seriesRef = useChartSeries(chartRef, chartType);

  // Historical 데이터 로드
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

  // 실시간 WebSocket 연결 (1D일 때만)
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

  // 관심 종목 토글
  const toggleWatchlist = useCallback(async () => {
    try {
      if (isInWatchlist) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol);
      }
    } catch (error) {
      logger.error('Failed to toggle watchlist:', error);
    }
  }, [isInWatchlist, symbol, addToWatchlist, removeFromWatchlist]);

  // Basic 모드 시간 범위 변경
  const handleBasicTimeRangeChange = useCallback((range: TimeRange) => {
    setBasicTimeRange(range);
    saveBasicTimeRange(range, isMobile);
  }, [saveBasicTimeRange, isMobile]);

  // Enhanced 모드 차트 타입 변경
  const handleEnhancedChartTypeChange = useCallback(
    (type: EnhancedChartType) => {
      setEnhancedChartType(type);
      saveEnhancedChartType(type, isMobile);
    },
    [saveEnhancedChartType, isMobile]
  );

  // Enhanced 모드 분단위 간격 변경
  const handleEnhancedMinuteIntervalChange = useCallback(
    (newInterval: ChartInterval) => {
      setEnhancedMinuteInterval(newInterval);
      saveEnhancedMinuteInterval(newInterval, isMobile);
    },
    [saveEnhancedMinuteInterval, isMobile]
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
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
        {/* 모바일 헤더 */}
        {isMobile ? (
          <MobileChartHeader
            symbol={symbol}
            companyName={companyName}
            currentPrice={priceInfo.currentPrice ?? undefined}
            priceChange={priceInfo.priceChange}
            priceChangePercent={priceInfo.priceChangePercent}
            isLoading={isLoading}
            isInWatchlist={isInWatchlist}
            onToggleWatchlist={toggleWatchlist}
          />
        ) : (
          /* 데스크탑 헤더 */
          <DashboardChartHeader
            symbol={symbol}
            companyName={companyName}
            currentPrice={priceInfo.currentPrice ?? undefined}
            priceChange={priceInfo.priceChange}
            priceChangePercent={priceInfo.priceChangePercent}
            isRealtime={isRealtime}
            isLoading={isLoading}
            isInWatchlist={isInWatchlist}
            onToggleWatchlist={toggleWatchlist}
          />
        )}

        {/* 모바일: 컴팩트 컨트롤 / 데스크탑: 기존 컨트롤 */}
        {isMobile ? (
          <MobileChartControls
            chartMode={chartMode}
            onChartModeChange={handleChartModeChange}
            chartType={chartType}
            onChartTypeChange={handleChartTypeChange}
            timeRange={basicTimeRange}
            onTimeRangeChange={handleBasicTimeRangeChange}
          />
        ) : (
          <>
            {/* 차트 모드 선택 + 차트 타입 선택 */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <ChartModeSelector
                  chartMode={chartMode}
                  onChartModeChange={handleChartModeChange}
                />
                <ChartTypeSelector
                  chartType={chartType}
                  onChartTypeChange={handleChartTypeChange}
                />
              </div>
            </div>

            {/* Chart Mode에 따른 다른 UI */}
            <div>
              {chartMode === "basic" ? (
                <TimeRangeSelector
                  timeRange={basicTimeRange}
                  onTimeRangeChange={handleBasicTimeRangeChange}
                />
              ) : (
                <EnhancedChartSelector
                  chartType={enhancedChartType}
                  onChartTypeChange={handleEnhancedChartTypeChange}
                  minuteInterval={enhancedMinuteInterval}
                  onMinuteIntervalChange={handleEnhancedMinuteIntervalChange}
                />
              )}
            </div>
          </>
        )}

        {/* Enhanced 모드 선택기 (모바일에서도 표시) */}
        {isMobile && chartMode === "enhanced" && (
          <EnhancedChartSelector
            chartType={enhancedChartType}
            onChartTypeChange={handleEnhancedChartTypeChange}
            minuteInterval={enhancedMinuteInterval}
            onMinuteIntervalChange={handleEnhancedMinuteIntervalChange}
          />
        )}
      </CardHeader>
      <CardContent className="px-0 pl-3 sm:pl-4 md:pl-6 pt-0">
        <ChartCanvas chartContainerRef={chartContainerRef} isLoading={isLoading} isMobile={isMobile} />
      </CardContent>
    </Card>
  );
}
