/**
 * 차트 시간대 변환 유틸리티
 * Lightweight Charts는 시간대를 지원하지 않으므로
 * 타임스탬프를 수동으로 조정해야 합니다.
 */

// 한국 시간대 오프셋 (UTC+9, 초 단위)
export const KST_OFFSET_SECONDS = 9 * 60 * 60; // 32400초 (9시간)

/**
 * UTC 타임스탬프를 한국 시간대로 변환
 * @param utcTimestamp - Unix timestamp (초 단위)
 * @returns 한국 시간대 기준 타임스탬프
 */
export function convertToKST(utcTimestamp: number): number {
  return utcTimestamp + KST_OFFSET_SECONDS;
}

/**
 * 캔들 데이터 배열의 시간을 한국 시간대로 변환
 * @param candles - 원본 캔들 데이터 배열
 * @returns 한국 시간대로 변환된 캔들 데이터
 */
export function convertCandlesToKST<T extends { time: number }>(
  candles: T[]
): T[] {
  return candles.map((candle) => ({
    ...candle,
    time: convertToKST(candle.time),
  }));
}

/**
 * 단일 캔들의 시간을 한국 시간대로 변환
 * @param candle - 원본 캔들 데이터
 * @returns 한국 시간대로 변환된 캔들
 */
export function convertCandleToKST<T extends { time: number }>(candle: T): T {
  return {
    ...candle,
    time: convertToKST(candle.time),
  };
}
