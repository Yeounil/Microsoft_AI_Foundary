/**
 * 캔들 집계 로직
 * Tick 데이터를 캔들로 변환하고 관리
 */

import { Logger } from "./logger";
import {
  FMPWebSocketMessage,
  CandleData,
  CandleCallback,
  CandleAggregatorOptions,
} from "./types";
import { convertToKST } from "../chart/timezone-utils";

export class CandleAggregator {
  private currentCandles: Map<string, CandleData> = new Map();
  private candleCallbacks: Map<string, CandleCallback[]> = new Map();
  private candleIntervals: Map<string, number> = new Map();
  private logger: Logger;
  private maxCandlesCached: number;

  constructor(options: CandleAggregatorOptions, logger: Logger) {
    this.logger = logger;
    this.maxCandlesCached = options.maxCandlesCached || 100;
  }

  /**
   * Tick 데이터로 캔들 업데이트
   */
  updateFromTick(
    symbol: string,
    message: FMPWebSocketMessage,
    intervalMs: number
  ): CandleData | null {
    const price = message.lp || message.ap || message.bp;

    if (!price) {
      this.logger.warn(`No price data in message for ${symbol}`);
      return null;
    }

    // FMP WebSocket은 나노초 단위로 timestamp를 보냄 (1762958806918000000)
    // JavaScript는 밀리초 사용이므로 1,000,000으로 나눔
    let timestamp = message.t || Date.now();
    if (timestamp > 1e15) {
      // 나노초인 경우 (16자리 이상)
      timestamp = Math.floor(timestamp / 1000000);
    }

    const candleTime = Math.floor(timestamp / intervalMs) * intervalMs;
    const candleTimeSeconds = Math.floor(candleTime / 1000);

    // 한국 시간대(KST)로 변환
    const kstCandleTime = convertToKST(candleTimeSeconds);

    let candle = this.currentCandles.get(symbol);

    // 새 캔들 시작
    if (!candle || candle.time !== kstCandleTime) {
      candle = this.createNewCandle(price, kstCandleTime, message.ls);
      this.currentCandles.set(symbol, candle);
      this.candleIntervals.set(symbol, intervalMs);

      const timeStr = candleTimeSeconds
        ? new Date(candleTimeSeconds * 1000).toLocaleTimeString()
        : 'No timestamp';

      this.logger.debug(`New candle for ${symbol}:`, {
        time: timeStr,
        price: `$${price}`,
        interval: `${intervalMs / 1000}s`,
      });
    } else {
      // 기존 캔들 업데이트
      this.updateExistingCandle(candle, price, message.ls);
      this.logger.debug(
        `Updated candle for ${symbol}: O:$${candle.open.toFixed(2)} H:$${candle.high.toFixed(2)} L:$${candle.low.toFixed(2)} C:$${candle.close.toFixed(2)}`
      );
    }

    // 캔들 콜백 실행
    this.triggerCallbacks(symbol, { ...candle });

    // 메모리 관리: 오래된 캔들 삭제
    this.cleanupOldCandles();

    return { ...candle };
  }

  /**
   * 새 캔들 생성
   */
  private createNewCandle(
    price: number,
    time: number,
    volume?: number
  ): CandleData {
    return {
      time, // Unix timestamp (seconds)
      open: price,
      high: price,
      low: price,
      close: price,
      volume: volume || 0,
    };
  }

  /**
   * 기존 캔들 업데이트
   */
  private updateExistingCandle(
    candle: CandleData,
    price: number,
    volume?: number
  ) {
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
    if (volume) {
      candle.volume = (candle.volume || 0) + volume;
    }
  }

  /**
   * 캔들 직접 설정 (REST API 동기화용)
   */
  setCandle(symbol: string, candle: CandleData): void {
    const normalizedSymbol = symbol.toUpperCase();
    this.currentCandles.set(normalizedSymbol, { ...candle });
    this.triggerCallbacks(normalizedSymbol, { ...candle });
    this.logger.debug(`Candle set for ${normalizedSymbol}`, candle);
  }

  /**
   * 캔들 조회
   */
  getCandle(symbol: string): CandleData | undefined {
    return this.currentCandles.get(symbol.toUpperCase());
  }

  /**
   * 캔들 콜백 등록
   */
  onCandle(symbol: string, callback: CandleCallback) {
    const normalizedSymbol = symbol.toUpperCase();

    if (!this.candleCallbacks.has(normalizedSymbol)) {
      this.candleCallbacks.set(normalizedSymbol, []);
    }

    this.candleCallbacks.get(normalizedSymbol)!.push(callback);
    this.logger.debug(
      `Candle callback registered for ${normalizedSymbol} (total: ${this.candleCallbacks.get(normalizedSymbol)!.length})`
    );
  }

  /**
   * 캔들 콜백 제거
   */
  offCandle(symbol: string, callback: CandleCallback) {
    const normalizedSymbol = symbol.toUpperCase();
    const callbacks = this.candleCallbacks.get(normalizedSymbol);

    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        this.logger.debug(`Candle callback removed for ${normalizedSymbol}`);
      }
    }
  }

  /**
   * 캔들 콜백 실행
   */
  private triggerCallbacks(symbol: string, candle: CandleData) {
    const callbacks = this.candleCallbacks.get(symbol) || [];
    this.logger.debug(
      `Calling ${callbacks.length} chart callback(s) for ${symbol}`
    );
    callbacks.forEach((cb) => cb(candle));
  }

  /**
   * 메모리 관리: 오래된 캔들 삭제
   */
  private cleanupOldCandles() {
    if (this.currentCandles.size <= this.maxCandlesCached) {
      return;
    }

    // 가장 오래된 캔들부터 삭제
    const now = Date.now() / 1000;
    const entriesToDelete: string[] = [];

    this.currentCandles.forEach((candle, symbol) => {
      // 1시간 이상 업데이트 안 된 캔들 삭제
      if (now - candle.time > 3600) {
        entriesToDelete.push(symbol);
      }
    });

    entriesToDelete.forEach((symbol) => {
      this.currentCandles.delete(symbol);
      this.candleIntervals.delete(symbol);
      this.logger.debug(`Cleaned up old candle for ${symbol}`);
    });
  }

  /**
   * 특정 심볼의 캔들 삭제
   */
  removeCandle(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    this.currentCandles.delete(normalizedSymbol);
    this.candleIntervals.delete(normalizedSymbol);
    this.candleCallbacks.delete(normalizedSymbol);
    this.logger.debug(`Removed candle for ${normalizedSymbol}`);
  }

  /**
   * 모든 캔들 삭제
   */
  clear() {
    this.currentCandles.clear();
    this.candleIntervals.clear();
    this.candleCallbacks.clear();
    this.logger.debug("All candles cleared");
  }

  /**
   * 캔들 개수 조회
   */
  getCandleCount(): number {
    return this.currentCandles.size;
  }

  /**
   * 모든 심볼 조회
   */
  getSymbols(): string[] {
    return Array.from(this.currentCandles.keys());
  }
}
