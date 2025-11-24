/**
 * 날짜 포맷 유틸리티
 * 앱 전체에서 일관된 날짜 표시를 위한 헬퍼 함수들
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 날짜를 한국어 형식으로 포맷
 * @param date - Date 객체 또는 ISO 문자열
 * @param formatStr - 포맷 문자열 (기본: 'yyyy년 M월 d일')
 */
export function formatDate(date: Date | string | null | undefined, formatStr: string = 'yyyy년 M월 d일'): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return format(dateObj, formatStr, { locale: ko });
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷
 * @param date - Date 객체 또는 ISO 문자열
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'yyyy년 M월 d일 HH:mm');
}

/**
 * 짧은 날짜 형식 (M월 d일)
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  return formatDate(date, 'M월 d일');
}

/**
 * 짧은 날짜와 시간 형식 (M월 d일 HH:mm)
 */
export function formatShortDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'M월 d일 HH:mm');
}

/**
 * 상대적 시간 표시 (예: '3시간 전', '2일 전')
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ko });
}

/**
 * 뉴스 기사용 날짜 포맷 (M월 d일 HH:mm)
 */
export function formatNewsDate(date: Date | string | null | undefined): string {
  return formatDate(date, 'M월 d일 HH:mm');
}

/**
 * 전체 날짜 시간 (ISO 형식)
 */
export function formatISO(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return dateObj.toISOString();
}

/**
 * 숫자로 된 날짜 (yyyy-MM-dd)
 */
export function formatNumericDate(date: Date | string | null | undefined): string {
  return formatDate(date, 'yyyy-MM-dd');
}

/**
 * 시간만 표시 (HH:mm)
 */
export function formatTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'HH:mm');
}
