"use client";

import { useEffect, useState, useCallback } from "react";
import { IChartApi, ISeriesApi, Time, MouseEventParams } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ChartTooltipProps {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick" | "Line"> | null;
  symbol: string;
}

interface TooltipData {
  time: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

/**
 * ChartTooltip Component
 * 차트 위 마우스 호버 시 상세 정보를 표시합니다.
 */
export function ChartTooltip({ chart, series, symbol }: ChartTooltipProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return "-";
    return `$${price.toFixed(2)}`;
  };

  const formatTime = (time: Time) => {
    if (typeof time === "number") {
      return new Date(time * 1000).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return String(time);
  };

  const handleCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      if (!series || !param.time || !param.point) {
        setIsVisible(false);
        return;
      }

      const data = param.seriesData.get(series);
      if (!data) {
        setIsVisible(false);
        return;
      }

      // 캔들스틱 데이터 또는 라인 데이터 처리
      const isCandlestick = "open" in data;
      let tooltipInfo: TooltipData;

      if (isCandlestick) {
        const candleData = data as {
          open: number;
          high: number;
          low: number;
          close: number;
        };
        const change = candleData.close - candleData.open;
        const changePercent = (change / candleData.open) * 100;

        tooltipInfo = {
          time: formatTime(param.time),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          change,
          changePercent,
        };
      } else {
        const lineData = data as { value: number };
        tooltipInfo = {
          time: formatTime(param.time),
          value: lineData.value,
        };
      }

      setTooltipData(tooltipInfo);
      setPosition({ x: param.point.x, y: param.point.y });
      setIsVisible(true);
    },
    [series]
  );

  useEffect(() => {
    if (!chart) return;

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [chart, handleCrosshairMove]);

  if (!isVisible || !tooltipData) return null;

  const isCandlestick = tooltipData.open !== undefined;
  const isPositive = (tooltipData.change ?? 0) >= 0;

  return (
    <div
      className={cn(
        "absolute z-50 pointer-events-none transition-opacity duration-150",
        "bg-popover/95 backdrop-blur-sm border rounded-lg shadow-lg p-3",
        "text-sm min-w-[180px]"
      )}
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: "translateY(-50%)",
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <span className="font-semibold text-foreground">{symbol}</span>
        <span className="text-xs text-muted-foreground">{tooltipData.time}</span>
      </div>

      {isCandlestick ? (
        /* 캔들스틱 데이터 */
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">시가</span>
              <span className="font-medium">{formatPrice(tooltipData.open)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">고가</span>
              <span className="font-medium text-stock-up">
                {formatPrice(tooltipData.high)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">저가</span>
              <span className="font-medium text-stock-down">
                {formatPrice(tooltipData.low)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">종가</span>
              <span className="font-medium">{formatPrice(tooltipData.close)}</span>
            </div>
          </div>

          {/* 변동 */}
          <div className="pt-1.5 border-t flex items-center justify-between">
            <span className="text-muted-foreground">변동</span>
            <div
              className={cn(
                "flex items-center gap-1 font-medium",
                isPositive ? "text-stock-up" : "text-stock-down"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : tooltipData.change === 0 ? (
                <Minus className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {tooltipData.change?.toFixed(2)} (
                {tooltipData.changePercent?.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 라인 데이터 */
        <div className="flex justify-between">
          <span className="text-muted-foreground">가격</span>
          <span className="font-medium">{formatPrice(tooltipData.value)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 차트 범례 컴포넌트
 */
interface ChartLegendProps {
  symbol: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export function ChartLegend({
  symbol,
  currentPrice,
  change,
  changePercent,
}: ChartLegendProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="font-semibold">{symbol}</span>
      {currentPrice !== undefined && (
        <>
          <span className="font-medium">${currentPrice.toFixed(2)}</span>
          {change !== undefined && changePercent !== undefined && (
            <span
              className={cn(
                "flex items-center gap-1",
                isPositive ? "text-stock-up" : "text-stock-down"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isPositive ? "+" : ""}
              {change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
          )}
        </>
      )}
    </div>
  );
}
