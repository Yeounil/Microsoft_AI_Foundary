/**
 * WebSocket 로깅 유틸리티
 * 로그 레벨을 설정하여 프로덕션 환경에서 불필요한 로그를 제거
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(level?: LogLevel, prefix: string = "[FMP WS]") {
    // 프로덕션 환경에서는 기본적으로 error 레벨만 출력
    this.level =
      level ||
      (process.env.NODE_ENV === "production" ? "error" : "debug");
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(message: string): string {
    return `${this.prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// 싱글톤 기본 로거
export const defaultLogger = new Logger();
