/**
 * Chart Service
 * 차트 관련 유틸리티 함수들을 제공합니다.
 */

export type ChartType = "area" | "line" | "candle";
export type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL";
export type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo" | "1y";

/**
 * TimeRange를 API 기간 문자열로 변환
 */
export function getPeriodFromRange(range: TimeRange): string {
  switch (range) {
    case "1D":
      return "1d";
    case "1W":
      return "7d";
    case "1M":
      return "1mo";
    case "3M":
      return "3mo";
    case "6M":
      return "6mo";
    case "1Y":
      return "1y";
    case "5Y":
      return "5y";
    case "ALL":
      return "max";
    default:
      return "1mo";
  }
}

/**
 * ChartInterval을 밀리초로 변환
 */
export function getIntervalMs(interval: ChartInterval): number {
  switch (interval) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "15m":
      return 15 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}

/**
 * TimeRange에 따른 표시 라벨 반환
 */
export function getTimeRangeLabel(range: TimeRange): string {
  switch (range) {
    case "1D":
      return "1일";
    case "1W":
      return "1주";
    case "1M":
      return "1개월";
    case "3M":
      return "3개월";
    case "6M":
      return "6개월";
    case "1Y":
      return "1년";
    case "5Y":
      return "5년";
    case "ALL":
      return "전체";
    default:
      return range;
  }
}

/**
 * ChartInterval에 따른 표시 라벨 반환
 */
export function getIntervalLabel(interval: ChartInterval): string {
  switch (interval) {
    case "1m":
      return "1분";
    case "5m":
      return "5분";
    case "15m":
      return "15분";
    case "30m":
      return "30분";
    case "1h":
      return "1시간";
    case "1d":
      return "1일";
    default:
      return interval;
  }
}

/**
 * TimeRange에 따라 차트에 표시할 데이터 포인트 수 반환
 */
export function getVisibleDataPoints(
  timeRange: TimeRange,
  interval: ChartInterval,
  totalDataPoints: number
): number {
  if (timeRange !== "1D") {
    return totalDataPoints; // 전체 보기
  }

  // 1D일 때는 인터벌에 따라 표시할 데이터 포인트 수 조정
  const visibleCountMap: Partial<Record<ChartInterval, number>> = {
    "1m": 120, // 2시간
    "5m": 80, // 6시간 40분
    "15m": 50, // 12시간 30분
    "30m": 40, // 20시간
    "1h": 24, // 24시간
    "1d": 30,
  };

  return Math.min(visibleCountMap[interval] || 100, totalDataPoints);
}
