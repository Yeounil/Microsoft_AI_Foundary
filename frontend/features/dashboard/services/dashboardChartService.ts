/**
 * DashboardChart Service
 * 대시보드 차트 관련 타입 정의 및 유틸리티 함수
 */

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL";
export type ChartInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo" | "1y";
export type ChartMode = "basic" | "enhanced";

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
    case "1wk":
      return 7 * 24 * 60 * 60 * 1000;
    case "1mo":
      return 30 * 24 * 60 * 60 * 1000;
    case "1y":
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}

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
 * Basic 모드에서 TimeRange에 따른 자동 interval 매핑
 * - 1D: 10분 간격 (API: 5m, 프론트 필터링)
 * - 1W: 2시간 간격 (API: 1h, 프론트 필터링)
 * - 1M, 3M: 1일 간격
 * - 6M, 1Y: 1일 간격 (프론트에서 7일마다 필터링)
 * - 5Y: 1일 간격 (프론트에서 30일마다 필터링)
 * - ALL: 1일 간격 (프론트에서 90일마다 필터링)
 */
export function getBasicModeInterval(range: TimeRange): ChartInterval {
  switch (range) {
    case "1D":
      return "5m"; // 5분 데이터 가져와서 10분마다 필터링
    case "1W":
      return "1h"; // 1시간 데이터 가져와서 2시간마다 필터링
    case "1M":
    case "3M":
    case "6M":
    case "1Y":
    case "5Y":
    case "ALL":
      return "1d"; // 1일 간격
    default:
      return "1d";
  }
}

/**
 * Basic 모드에서 데이터 필터링을 위한 간격
 * @returns { interval: number, unit: 'minute' | 'hour' | 'day' }
 */
export function getBasicModeFilterInterval(range: TimeRange): {
  interval: number;
  unit: "minute" | "hour" | "day";
} {
  switch (range) {
    case "1D":
      return { interval: 10, unit: "minute" }; // 10분마다
    case "1W":
      return { interval: 2, unit: "hour" }; // 2시간마다
    case "1M":
    case "3M":
      return { interval: 1, unit: "day" }; // 1일마다 (필터링 안함)
    case "6M":
    case "1Y":
      return { interval: 7, unit: "day" }; // 7일마다
    case "5Y":
      return { interval: 30, unit: "day" }; // 30일마다
    case "ALL":
      return { interval: 90, unit: "day" }; // 90일마다
    default:
      return { interval: 1, unit: "day" };
  }
}

/**
 * Basic 모드 데이터 필터링 함수
 * 지정된 간격에 맞게 데이터를 필터링합니다
 */
export function filterBasicModeData<T extends { time: number }>(
  data: T[],
  range: TimeRange
): T[] {
  if (data.length === 0) return data;

  const { interval, unit } = getBasicModeFilterInterval(range);

  // 1M, 3M은 필터링하지 않음
  if (range === "1M" || range === "3M") {
    return data;
  }

  const filtered: T[] = [];
  let lastTime = 0;

  for (let i = 0; i < data.length; i++) {
    const currentTime = data[i].time;

    if (i === 0) {
      filtered.push(data[i]);
      lastTime = currentTime;
      continue;
    }

    let diff = 0;
    if (unit === "minute") {
      diff = (currentTime - lastTime) / 60; // 분 단위 차이
    } else if (unit === "hour") {
      diff = (currentTime - lastTime) / 3600; // 시간 단위 차이
    } else if (unit === "day") {
      diff = (currentTime - lastTime) / 86400; // 일 단위 차이
    }

    // 지정된 간격 이상이면 데이터 포함
    if (diff >= interval) {
      filtered.push(data[i]);
      lastTime = currentTime;
    }
  }

  // 마지막 데이터는 항상 포함
  if (filtered[filtered.length - 1] !== data[data.length - 1]) {
    filtered.push(data[data.length - 1]);
  }

  return filtered;
}

/**
 * Enhanced 모드의 기간 타입
 */
export type EnhancedPeriod = "day" | "week" | "month" | "year";

/**
 * Enhanced 모드 기간별 레이블
 */
export function getEnhancedPeriodLabel(period: EnhancedPeriod): string {
  switch (period) {
    case "day":
      return "일";
    case "week":
      return "주";
    case "month":
      return "월";
    case "year":
      return "년";
  }
}

/**
 * Enhanced 모드 기간별 TimeRange 매핑
 */
export function getEnhancedTimeRange(period: EnhancedPeriod): TimeRange {
  switch (period) {
    case "day":
      return "1D";
    case "week":
      return "1W";
    case "month":
      return "1M";
    case "year":
      return "1Y";
  }
}
