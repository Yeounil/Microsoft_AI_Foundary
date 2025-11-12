/**
 * 차트 데이터 로더
 * REST API를 통해 과거 캔들 데이터를 로드
 */

import apiClient from "../api-client";
import { CandleData } from "../websocket/types";

export type ChartPeriod = "1d" | "1w" | "1mo" | "3mo" | "1y" | "5y" | "all";
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

/**
 * 차트 데이터 로더 클래스
 */
export class ChartDataLoader {
  /**
   * 분단위 Intraday 데이터 로드 (1D 기간 전용)
   */
  static async loadIntradayData(
    symbol: string,
    interval: ChartInterval = "1m"
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

      console.log(`Loading intraday data: ${symbol}, interval: ${interval} → ${fmpInterval}`);

      const response = await apiClient.getIntradayData(symbol, fmpInterval);

      // API 응답 형식 정규화
      if (response.data && Array.isArray(response.data)) {
        // Intraday API는 이미 정규화된 형식으로 반환됨
        console.log(`Loaded ${response.data.length} intraday candles for ${symbol}`);
        return response.data;
      } else {
        console.error("Unexpected intraday data format:", response);
        return [];
      }
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
  ): Promise<CandleData[]> {
    try {
      // 1D 기간 + 분단위 인터벌 → Intraday API 사용
      if (period === "1d" && ["1m", "5m", "15m", "30m", "1h"].includes(interval)) {
        console.log(`Using Intraday API for ${symbol} (period: ${period}, interval: ${interval})`);
        return await this.loadIntradayData(symbol, interval);
      }

      // 기존 로직 (일/주/월봉)
      const response = await apiClient.getChartData(symbol, period, interval);

      // API 응답 형식 정규화
      if (Array.isArray(response)) {
        return this.normalizeChartData(response);
      } else if (response.data && Array.isArray(response.data)) {
        return this.normalizeChartData(response.data);
      } else if (response.chart_data && Array.isArray(response.chart_data)) {
        return this.normalizeChartData(response.chart_data);
      } else {
        console.error("Unexpected chart data format:", response);
        return [];
      }
    } catch (error) {
      console.error(`Failed to load chart data for ${symbol}:`, error);
      return [];
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
      .map((item: any) => {
        try {
          // 시간 필드 정규화
          let time: number;

          if (typeof item.time === "number") {
            time = item.time;
          } else if (typeof item.timestamp === "number") {
            time = item.timestamp;
          } else if (typeof item.date === "string") {
            time = Math.floor(new Date(item.date).getTime() / 1000);
          } else if (typeof item.time === "string") {
            time = Math.floor(new Date(item.time).getTime() / 1000);
          } else {
            // 날짜를 파싱할 수 없으면 현재 시간 사용
            time = Math.floor(Date.now() / 1000);
          }

          // OHLC 데이터 정규화
          const candle: CandleData = {
            time,
            open: this.parseNumber(item.open || item.o || 0),
            high: this.parseNumber(item.high || item.h || 0),
            low: this.parseNumber(item.low || item.l || 0),
            close: this.parseNumber(item.close || item.c || 0),
            volume: this.parseNumber(item.volume || item.v || 0),
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
  private static parseNumber(value: any): number {
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
      "1w": "15m",
      "1mo": "1h",
      "3mo": "1d",
      "1y": "1d",
      "5y": "1wk",
      "all": "1mo",
    };

    return periodIntervalMap[period] || "1d";
  }
}
