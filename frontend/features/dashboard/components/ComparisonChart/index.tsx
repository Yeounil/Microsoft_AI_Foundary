"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, TrendingUp } from "lucide-react";
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type LineData, type Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface ComparisonSymbol {
  symbol: string;
  name: string;
  color: string;
  data: LineData<Time>[];
}

interface ComparisonChartProps {
  initialSymbol?: string;
  className?: string;
}

const CHART_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
];

/**
 * ComparisonChart Component
 * 여러 종목을 동시에 비교하는 차트
 */
export function ComparisonChart({ initialSymbol, className }: ComparisonChartProps) {
  const [symbols, setSymbols] = useState<ComparisonSymbol[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  // 차트 초기화
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: "#e5e5e5" },
        horzLines: { color: "#e5e5e5" },
      },
      rightPriceScale: {
        borderColor: "#e5e5e5",
        mode: 2, // Percentage mode for comparison
      },
      timeScale: {
        borderColor: "#e5e5e5",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // 초기 심볼 추가
  useEffect(() => {
    if (initialSymbol && symbols.length === 0) {
      addSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // 종목 데이터 가져오기 (모의 데이터)
  const fetchSymbolData = async (symbol: string): Promise<LineData<Time>[]> => {
    // 실제로는 API에서 데이터를 가져와야 함
    // 여기서는 모의 데이터 생성
    const basePrice = Math.random() * 100 + 50;
    const data: LineData<Time>[] = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const change = (Math.random() - 0.5) * 5;
      const price = basePrice + change * (30 - i) / 30;

      data.push({
        time: date.toISOString().split("T")[0] as Time,
        value: price,
      });
    }

    return data;
  };

  // 종목 추가
  const addSymbol = useCallback(async (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim();

    if (!upperSymbol) return;
    if (symbols.find((s) => s.symbol === upperSymbol)) {
      return; // 이미 추가된 종목
    }
    if (symbols.length >= 6) {
      return; // 최대 6개까지만
    }

    setIsLoading(true);

    try {
      const data = await fetchSymbolData(upperSymbol);
      const colorIndex = symbols.length % CHART_COLORS.length;
      const color = CHART_COLORS[colorIndex];

      // 정규화된 데이터 (첫 값을 100으로)
      const firstValue = data[0]?.value || 1;
      const normalizedData = data.map((d) => ({
        ...d,
        value: (d.value / firstValue) * 100,
      }));

      const newSymbol: ComparisonSymbol = {
        symbol: upperSymbol,
        name: upperSymbol, // 실제로는 회사명을 가져와야 함
        color,
        data: normalizedData,
      };

      // 차트에 시리즈 추가
      if (chartRef.current) {
        const series = chartRef.current.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          priceFormat: {
            type: "custom",
            formatter: (price: number) => `${price.toFixed(1)}%`,
          },
        });
        series.setData(normalizedData);
        seriesRefs.current.set(upperSymbol, series);
      }

      setSymbols((prev) => [...prev, newSymbol]);
      setInputValue("");
    } catch (error) {
      logger.error("Failed to add symbol:", error);
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);

  // 종목 제거
  const removeSymbol = useCallback((symbol: string) => {
    // 차트에서 시리즈 제거
    const series = seriesRefs.current.get(symbol);
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series);
      seriesRefs.current.delete(symbol);
    }

    setSymbols((prev) => prev.filter((s) => s.symbol !== symbol));
  }, []);

  // Enter 키로 추가
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addSymbol(inputValue);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            종목 비교
          </CardTitle>

          {/* 종목 추가 입력 */}
          <div className="flex gap-2">
            <Input
              placeholder="종목 코드 입력"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-32 sm:w-40 h-8 text-xs sm:text-sm"
              disabled={symbols.length >= 6 || isLoading}
            />
            <Button
              size="sm"
              onClick={() => addSymbol(inputValue)}
              disabled={!inputValue || symbols.length >= 6 || isLoading}
              className="h-8 px-2 sm:px-3"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* 선택된 종목 태그 */}
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
            {symbols.map((s) => (
              <div
                key={s.symbol}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${s.color}20`, color: s.color }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.symbol}
                <button
                  onClick={() => removeSymbol(s.symbol)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
        <div
          ref={chartContainerRef}
          className="w-full h-[250px] sm:h-[300px]"
        />

        {symbols.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              종목을 추가하여 비교를 시작하세요
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
