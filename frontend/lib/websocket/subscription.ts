/**
 * WebSocket 구독 관리
 * subscribe, unsubscribe, resubscribe 로직을 담당
 */

import { Logger } from "./logger";
import { WebSocketConnection } from "./connection";

export class SubscriptionManager {
  private subscriptions: Set<string> = new Set();
  private candleIntervals: Map<string, number> = new Map(); // symbol -> interval in ms
  private connection: WebSocketConnection;
  private logger: Logger;

  constructor(connection: WebSocketConnection, logger: Logger) {
    this.connection = connection;
    this.logger = logger;
  }

  /**
   * 심볼 구독
   */
  async subscribe(
    symbols: string | string[],
    intervalMs: number = 60000
  ): Promise<boolean> {
    // 연결이 완료될 때까지 대기
    if (!this.connection.isConnected && this.connection.isConnecting) {
      this.logger.debug("Waiting for connection to open...");
      await this.waitForConnection(5000);
    }

    if (!this.connection.isConnected) {
      this.logger.error("WebSocket not ready. Cannot subscribe.");
      return false;
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map((s) => s.toUpperCase());

    try {
      const subscribeMessage = {
        action: "subscribe",
        symbols: normalizedSymbols,
      };

      this.logger.debug("Sending subscribe message:", subscribeMessage);

      const success = this.connection.send(subscribeMessage);

      if (success) {
        // 구독 목록 업데이트
        normalizedSymbols.forEach((symbol) => {
          this.subscriptions.add(symbol);
          this.candleIntervals.set(symbol, intervalMs);
        });

        this.logger.info(
          `Subscribed to: ${normalizedSymbols.join(", ")} (interval: ${intervalMs / 1000}s)`
        );
      }

      return success;
    } catch (error) {
      this.logger.error("Subscribe failed:", error);
      return false;
    }
  }

  /**
   * 구독 해제
   */
  async unsubscribe(symbols: string | string[]): Promise<boolean> {
    if (!this.connection.isConnected) {
      this.logger.warn("WebSocket not connected. Cannot unsubscribe.");
      return false;
    }

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const normalizedSymbols = symbolArray.map((s) => s.toUpperCase());

    try {
      const unsubscribeMessage = {
        action: "unsubscribe",
        symbols: normalizedSymbols,
      };

      const success = this.connection.send(unsubscribeMessage);

      if (success) {
        normalizedSymbols.forEach((symbol) => {
          this.subscriptions.delete(symbol);
          this.candleIntervals.delete(symbol);
        });

        this.logger.info(`Unsubscribed from: ${normalizedSymbols.join(", ")}`);
      }

      return success;
    } catch (error) {
      this.logger.error("Unsubscribe failed:", error);
      return false;
    }
  }

  /**
   * 재구독 (재연결 후 자동 구독 복원)
   */
  async resubscribe(): Promise<boolean> {
    if (this.subscriptions.size === 0) {
      this.logger.debug("No subscriptions to restore");
      return true;
    }

    this.logger.info(
      `Resubscribing to ${this.subscriptions.size} symbols...`
    );

    const symbols = Array.from(this.subscriptions);

    // 각 심볼의 인터벌을 유지하면서 재구독
    // 같은 인터벌을 가진 심볼들을 그룹화
    const intervalGroups = new Map<number, string[]>();

    symbols.forEach((symbol) => {
      const intervalMs = this.candleIntervals.get(symbol) || 60000;
      if (!intervalGroups.has(intervalMs)) {
        intervalGroups.set(intervalMs, []);
      }
      intervalGroups.get(intervalMs)!.push(symbol);
    });

    // 각 그룹별로 구독
    const results = await Promise.all(
      Array.from(intervalGroups.entries()).map(([intervalMs, groupSymbols]) =>
        this.subscribe(groupSymbols, intervalMs)
      )
    );

    const allSuccess = results.every((result) => result);

    if (allSuccess) {
      this.logger.info("All subscriptions restored successfully");
    } else {
      this.logger.warn("Some subscriptions failed to restore");
    }

    return allSuccess;
  }

  /**
   * 모든 구독 해제
   */
  async unsubscribeAll(): Promise<boolean> {
    if (this.subscriptions.size === 0) {
      return true;
    }

    const symbols = Array.from(this.subscriptions);
    return await this.unsubscribe(symbols);
  }

  /**
   * 연결 대기
   */
  private async waitForConnection(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, timeoutMs);

      const checkConnection = () => {
        if (this.connection.isConnected) {
          clearTimeout(timeout);
          resolve();
        } else if (Date.now() - startTime >= timeoutMs) {
          clearTimeout(timeout);
          reject(new Error("Connection timeout"));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * 구독 목록 조회
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * 심볼의 인터벌 조회
   */
  getInterval(symbol: string): number | undefined {
    return this.candleIntervals.get(symbol.toUpperCase());
  }

  /**
   * 구독 여부 확인
   */
  isSubscribed(symbol: string): boolean {
    return this.subscriptions.has(symbol.toUpperCase());
  }

  /**
   * 모든 구독 정리 (disconnect 시 호출)
   */
  clear() {
    this.subscriptions.clear();
    this.candleIntervals.clear();
  }
}
