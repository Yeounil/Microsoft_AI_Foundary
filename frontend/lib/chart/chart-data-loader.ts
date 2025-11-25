/**
 * 차트 데이터 로더
 * REST API를 통해 과거 캔들 데이터를 로드
 */

import apiClient from "../api-client";
import { CandleData } from "../websocket/types";
import { logger } from "../logger";
import { convertToKST } from "./timezone-utils";

export type ChartPeriod = "1d" | "7d" | "1w" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max" | "all";
export type ChartInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "1d"
  | "1wk"
  | "1mo";

export interface ChartDataResponse {
  symbol: string;
  data: CandleData[];
  period: ChartPeriod;
  interval: ChartInterval;
}

export interface HistoricalDataResult {
  candles: CandleData[];
  companyName?: string;
}

/**
 * 차트 데이터 로더 클래스
 */
export class ChartDataLoader {
  /**
   * 이전 영업일 계산 (주말 건너뛰기)
   */
  private static getPreviousBusinessDay(date: Date): Date {
    const prevDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const dayOfWeek = prevDay.getDay();

    if (dayOfWeek === 0) {
      // 일요일 → 금요일로 (2일 더 전)
      return new Date(prevDay.getTime() - 2 * 24 * 60 * 60 * 1000);
    } else if (dayOfWeek === 6) {
      // 토요일 → 금요일로 (1일 더 전)
      return new Date(prevDay.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
    return prevDay;
  }

  /**
   * 특정 날짜의 인트라데이 데이터 로드 (내부 헬퍼)
   */
  private static async fetchIntradayForDate(
    symbol: string,
    fmpInterval: string,
    targetDate: Date
  ): Promise<unknown[]> {
    const dateStr = targetDate.toISOString().split('T')[0];

    logger.debug(`Fetching intraday data for ${symbol} on ${dateStr}`);

    const response = await apiClient.getIntradayData(symbol, fmpInterval, dateStr, dateStr);

    if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * 분단위 Intraday 데이터 로드
   */
  static async loadIntradayData(
    symbol: string,
    interval: ChartInterval = "1m",
    period: ChartPeriod = "1d"
  ): Promise<CandleData[]> {
    try {
      // interval 변환: 명시적 매핑 (1m → 1min, 5m → 5min, 1h → 1hour)
      const intervalMap: Record<string, string> = {
        "1m": "1min",
        "5m": "5min",
        "15m": "15min",
        "30m": "30min",
        "1h": "1hour",
      };

      const fmpInterval = intervalMap[interval];
      if (!fmpInterval) {
        console.error(`Unsupported intraday interval: ${interval}`);
        return [];
      }

      // period에 따른 날짜 범위 설정
      let now = new Date();

      // 가장 최근 영업일로 조정 (주말 + 시장 개장 전 처리)
      const dayOfWeek = now.getDay(); // 0 (일요일) ~ 6 (토요일)
      const hour = now.getHours();

      // 주말이거나, 월요일 오전(아직 시장 미개장)인 경우 금요일로 조정
      if (dayOfWeek === 0) {
        // 일요일 → 금요일로 (2일 전)
        now = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        logger.debug("Weekend detected (Sunday), adjusting to Friday");
      } else if (dayOfWeek === 6) {
        // 토요일 → 금요일로 (1일 전)
        now = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        logger.debug("Weekend detected (Saturday), adjusting to Friday");
      } else if (dayOfWeek === 1 && hour < 23) {
        // 월요일 23시 전(미국 시장 개장 전) → 금요일로 (3일 전)
        now = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        logger.debug("Monday before market open, adjusting to Friday");
      }

      // 하루치 데이터 (period === "1d")인 경우 특별 처리
      if (period === "1d") {
        let targetDate = now;
        const maxRetries = 5; // 최대 5일 전까지 시도 (공휴일 대비)

        for (let retry = 0; retry < maxRetries; retry++) {
          const dataArray = await this.fetchIntradayForDate(symbol, fmpInterval, targetDate);

          if (dataArray.length > 0) {
            logger.debug(`Loaded ${dataArray.length} intraday candles for ${symbol} on ${targetDate.toISOString().split('T')[0]}`);
            return this.normalizeChartData(dataArray);
          }

          // 데이터가 없으면 이전 영업일로 재시도
          logger.debug(`No data for ${targetDate.toISOString().split('T')[0]}, trying previous business day`);
          targetDate = this.getPreviousBusinessDay(targetDate);
        }

        logger.warn(`No intraday data found for ${symbol} after ${maxRetries} retries`);
        return [];
      }

      // 1주일 이상의 기간 데이터
      let daysAgo = 0;

      switch (period) {
        case "7d":
        case "1w":
          daysAgo = 7;
          break;
        case "1mo":
          daysAgo = 30;
          break;
        default:
          daysAgo = 0;
      }

      const fromDateObj = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const toDate = now.toISOString().split('T')[0];
      const fromDate = fromDateObj.toISOString().split('T')[0];

      logger.debug(`Loading intraday data: ${symbol}, period: ${period}, interval: ${interval} → ${fmpInterval}, from: ${fromDate}, to: ${toDate}`);

      const response = await apiClient.getIntradayData(symbol, fmpInterval, fromDate, toDate);

      let dataArray: unknown[];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        dataArray = response.data;
      } else {
        console.error("Unexpected intraday data format:", response);
        return [];
      }

      logger.debug(`Loaded ${dataArray.length} intraday candles for ${symbol}`);

      return this.normalizeChartData(dataArray);
    } catch (error) {
      console.error(`Failed to load intraday data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 과거 캔들 데이터 로드 (개선)
   */
  static async loadHistoricalData(
    symbol: string,
    period: ChartPeriod = "1d",
    interval: ChartInterval = "1d"
  ): Promise<HistoricalDataResult> {
    try {
      // 1D, 1W, 1M 기간 + 분/시간 단위 인터벌 → Intraday API 사용
      if (
        (period === "1d" || period === "7d" || period === "1w" || period === "1mo") &&
        ["1m", "5m", "15m", "30m", "1h"].includes(interval)
      ) {
        logger.debug(`Using Intraday API for ${symbol} (period: ${period}, interval: ${interval})`);
        const candles = await this.loadIntradayData(symbol, interval, period);
        return { candles };
      }

      // 기존 로직 (일/주/월봉)
      const response = await apiClient.getChartData(symbol, period, interval);

      // API 응답 형식 정규화
      let candles: CandleData[];
      if (Array.isArray(response)) {
        candles = this.normalizeChartData(response);
      } else if (response.data && Array.isArray(response.data)) {
        candles = this.normalizeChartData(response.data);
      } else if (response.chart_data && Array.isArray(response.chart_data)) {
        candles = this.normalizeChartData(response.chart_data);
      } else {
        console.error("Unexpected chart data format:", response);
        candles = [];
      }

      return {
        candles,
        companyName: response.company_name,
      };
    } catch (error) {
      console.error(`Failed to load chart data for ${symbol}:`, error);
      return { candles: [] };
    }
  }

  /**
   * 최근 N개 캔들 로드 (동기화용)
   */
  static async loadRecentCandles(
    symbol: string,
    count: number = 10,
    interval: ChartInterval = "1m"
  ): Promise<CandleData[]> {
    try {
      // 분단위 인터벌은 Intraday API 사용
      if (["1m", "5m", "15m", "30m", "1h"].includes(interval)) {
        const allCandles = await this.loadIntradayData(symbol, interval);
        // 최근 N개만 반환
        return allCandles.slice(-count);
      }

      // 일/주/월봉은 기존 로직 사용
      const response = await apiClient.getChartData(symbol, "1h", interval);

      let data: unknown[];
      if (Array.isArray(response)) {
        data = response;
      } else if (response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response.chart_data && Array.isArray(response.chart_data)) {
        data = response.chart_data;
      } else {
        return [];
      }

      const normalized = this.normalizeChartData(data);

      // 최근 N개만 반환
      return normalized.slice(-count);
    } catch (error) {
      console.error(`Failed to load recent candles for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 차트 데이터 정규화
   * 다양한 API 응답 형식을 CandleData 형식으로 변환
   */
  private static normalizeChartData(data: unknown[]): CandleData[] {
    return data
      .map((item: unknown) => {
        try {
          const record = item as Record<string, unknown>;

          // 시간 필드 정규화
          let time: number;

          if (typeof record.time === "number") {
            time = record.time;
          } else if (typeof record.timestamp === "number") {
            time = record.timestamp;
          } else if (typeof record.date === "string") {
            time = Math.floor(new Date(record.date).getTime() / 1000);
          } else if (typeof record.time === "string") {
            time = Math.floor(new Date(record.time).getTime() / 1000);
          } else {
            // 날짜를 파싱할 수 없으면 현재 시간 사용
            time = Math.floor(Date.now() / 1000);
          }

          // OHLC 데이터 정규화 (타임스탬프는 UTC 그대로 유지)
          const candle: CandleData = {
            time: time,
            open: this.parseNumber(record.open || record.o || 0),
            high: this.parseNumber(record.high || record.h || 0),
            low: this.parseNumber(record.low || record.l || 0),
            close: this.parseNumber(record.close || record.c || 0),
            volume: this.parseNumber(record.volume || record.v || 0),
          };

          return candle;
        } catch (error) {
          console.error("Failed to normalize candle data:", item, error);
          return null;
        }
      })
      .filter((candle): candle is CandleData => candle !== null)
      .sort((a, b) => a.time - b.time); // 시간순 정렬
  }

  /**
   * 숫자 파싱 유틸리티
   */
  private static parseNumber(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * 일봉 데이터를 주봉으로 집계
   */
  static aggregateToWeekly(dailyData: CandleData[]): CandleData[] {
    if (dailyData.length === 0) return [];

    const weeklyCandles: CandleData[] = [];
    let currentWeek: CandleData | null = null;

    dailyData.forEach((candle) => {
      const date = new Date(candle.time * 1000);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // 주의 시작 (일요일)
      weekStart.setHours(0, 0, 0, 0);
      const weekTime = Math.floor(weekStart.getTime() / 1000);

      if (!currentWeek || currentWeek.time !== weekTime) {
        // 새로운 주 시작
        if (currentWeek) {
          weeklyCandles.push(currentWeek);
        }
        currentWeek = {
          time: weekTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      } else {
        // 같은 주 내에서 집계
        currentWeek.high = Math.max(currentWeek.high, candle.high);
        currentWeek.low = Math.min(currentWeek.low, candle.low);
        currentWeek.close = candle.close; // 마지막 종가
        currentWeek.volume = (currentWeek.volume || 0) + (candle.volume || 0);
      }
    });

    // 마지막 주 추가
    if (currentWeek) {
      weeklyCandles.push(currentWeek);
    }

    return weeklyCandles;
  }

  /**
   * 일봉 데이터를 월봉으로 집계
   */
  static aggregateToMonthly(dailyData: CandleData[]): CandleData[] {
    if (dailyData.length === 0) return [];

    const monthlyCandles: CandleData[] = [];
    let currentMonth: CandleData | null = null;

    dailyData.forEach((candle) => {
      const date = new Date(candle.time * 1000);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthTime = Math.floor(monthStart.getTime() / 1000);

      if (!currentMonth || currentMonth.time !== monthTime) {
        // 새로운 월 시작
        if (currentMonth) {
          monthlyCandles.push(currentMonth);
        }
        currentMonth = {
          time: monthTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      } else {
        // 같은 월 내에서 집계
        currentMonth.high = Math.max(currentMonth.high, candle.high);
        currentMonth.low = Math.min(currentMonth.low, candle.low);
        currentMonth.close = candle.close; // 마지막 종가
        currentMonth.volume = (currentMonth.volume || 0) + (candle.volume || 0);
      }
    });

    // 마지막 월 추가
    if (currentMonth) {
      monthlyCandles.push(currentMonth);
    }

    return monthlyCandles;
  }

  /**
   * 일봉 데이터를 연봉으로 집계
   */
  static aggregateToYearly(dailyData: CandleData[]): CandleData[] {
    if (dailyData.length === 0) return [];

    const yearlyCandles: CandleData[] = [];
    let currentYear: CandleData | null = null;

    dailyData.forEach((candle) => {
      const date = new Date(candle.time * 1000);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const yearTime = Math.floor(yearStart.getTime() / 1000);

      if (!currentYear || currentYear.time !== yearTime) {
        // 새로운 연도 시작
        if (currentYear) {
          yearlyCandles.push(currentYear);
        }
        currentYear = {
          time: yearTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      } else {
        // 같은 연도 내에서 집계
        currentYear.high = Math.max(currentYear.high, candle.high);
        currentYear.low = Math.min(currentYear.low, candle.low);
        currentYear.close = candle.close; // 마지막 종가
        currentYear.volume = (currentYear.volume || 0) + (candle.volume || 0);
      }
    });

    // 마지막 연도 추가
    if (currentYear) {
      yearlyCandles.push(currentYear);
    }

    return yearlyCandles;
  }

  /**
   * 인터벌을 밀리초로 변환
   */
  static getIntervalMs(interval: ChartInterval): number {
    const intervalMap: Record<ChartInterval, number> = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1wk": 7 * 24 * 60 * 60 * 1000,
      "1mo": 30 * 24 * 60 * 60 * 1000,
    };

    return intervalMap[interval] || 60 * 1000;
  }

  /**
   * 기간에 따른 권장 인터벌 반환
   */
  static getRecommendedInterval(period: ChartPeriod): ChartInterval {
    const periodIntervalMap: Record<ChartPeriod, ChartInterval> = {
      "1d": "1m",
      "7d": "15m",
      "1w": "15m",
      "1mo": "1h",
      "3mo": "1d",
      "6mo": "1d",
      "1y": "1d",
      "5y": "1wk",
      "max": "1mo",
      "all": "1mo",
    };

    return periodIntervalMap[period] || "1d";
  }
}
