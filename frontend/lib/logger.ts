/**
 * 개발 환경용 로깅 유틸리티
 * 프로덕션에서는 로그를 출력하지 않음
 */

const isDev = () => process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev()) console.log(...args);
  },

  info: (...args: unknown[]) => {
    if (isDev()) console.info('[INFO]', ...args);
  },

  warn: (...args: unknown[]) => {
    if (isDev()) console.warn('[WARN]', ...args);
  },

  error: (...args: unknown[]) => {
    // 에러는 프로덕션에서도 출력 (모니터링 필요)
    console.error('[ERROR]', ...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev()) console.debug('[DEBUG]', ...args);
  },

  group: (label: string) => {
    if (isDev()) console.group(label);
  },

  groupEnd: () => {
    if (isDev()) console.groupEnd();
  },

  table: (data: unknown) => {
    if (isDev()) console.table(data);
  },

  time: (label: string) => {
    if (isDev()) console.time(label);
  },

  timeEnd: (label: string) => {
    if (isDev()) console.timeEnd(label);
  },
};

export default logger;
