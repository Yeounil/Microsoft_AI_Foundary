/**
 * API 호출 배칭 유틸리티
 * 여러 API 호출을 하나로 묶어서 효율적으로 처리합니다.
 */

interface BatchedRequest<T, R> {
  key: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

interface BatcherOptions<T, R> {
  maxBatchSize?: number;
  maxWaitMs?: number;
  batchFn: (keys: T[]) => Promise<Map<T, R>>;
}

/**
 * API Batcher 클래스
 * 여러 요청을 배칭하여 한 번에 처리합니다.
 */
export class ApiBatcher<T, R> {
  private queue: BatchedRequest<T, R>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private maxBatchSize: number;
  private maxWaitMs: number;
  private batchFn: (keys: T[]) => Promise<Map<T, R>>;

  constructor(options: BatcherOptions<T, R>) {
    this.maxBatchSize = options.maxBatchSize || 10;
    this.maxWaitMs = options.maxWaitMs || 50;
    this.batchFn = options.batchFn;
  }

  /**
   * 요청을 큐에 추가
   */
  async fetch(key: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // 배치 크기에 도달하면 즉시 처리
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timeout) {
        // 타이머 시작
        this.timeout = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  /**
   * 큐에 있는 요청들을 배치 처리
   */
  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    const keys = batch.map((req) => req.key);

    try {
      const results = await this.batchFn(keys);

      for (const request of batch) {
        const result = results.get(request.key);
        if (result !== undefined) {
          request.resolve(result);
        } else {
          request.reject(new Error(`No result for key: ${request.key}`));
        }
      }
    } catch (error) {
      for (const request of batch) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // 큐에 남은 요청이 있으면 계속 처리
    if (this.queue.length > 0) {
      this.flush();
    }
  }

  /**
   * 큐 비우기
   */
  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.queue = [];
  }
}

/**
 * Debounced API 호출
 */
export function createDebouncedFetch<T, R>(
  fetchFn: (key: T) => Promise<R>,
  delayMs = 300
): (key: T) => Promise<R> {
  const cache = new Map<T, { promise: Promise<R>; timestamp: number }>();
  const pending = new Map<T, NodeJS.Timeout>();

  return (key: T): Promise<R> => {
    // 기존 타이머 취소
    const existingTimeout = pending.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 최근 캐시 확인 (5초 이내)
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.promise;
    }

    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        pending.delete(key);
        try {
          const promise = fetchFn(key);
          cache.set(key, { promise, timestamp: Date.now() });
          const result = await promise;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);

      pending.set(key, timeout);
    });
  };
}

/**
 * 요청 중복 제거
 */
export function createDeduplicatedFetch<T extends string | number, R>(
  fetchFn: (key: T) => Promise<R>
): (key: T) => Promise<R> {
  const inFlight = new Map<T, Promise<R>>();

  return async (key: T): Promise<R> => {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = fetchFn(key).finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, promise);
    return promise;
  };
}

/**
 * 재시도 래퍼
 */
export function withRetry<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): (...args: T) => Promise<R> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = () => true,
  } = options;

  return async (...args: T): Promise<R> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries && shouldRetry(lastError)) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
}

/**
 * 요청 큐 관리자
 * 동시 요청 수를 제한합니다.
 */
export class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }
}
