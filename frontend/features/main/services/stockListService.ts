/**
 * StockList Service
 * 종목 리스트 관련 타입 정의 및 유틸리티 함수
 */

export interface StockItem {
  symbol: string;
  name: string;
  price: number | null;
  change: number;
  changePercent: number;
  isLoading: boolean;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface BatchQuotesResponse {
  quotes: StockQuote[];
}

/**
 * supported stocks 배열을 StockItem 포맷으로 변환
 */
export function convertToStockItems(
  supportedStocks: string[]
): Array<{ symbol: string; name: string; marketCap: number }> {
  return supportedStocks.map((symbol) => ({
    symbol,
    name: symbol,
    marketCap: 0,
  }));
}

/**
 * 가격 데이터를 Map 형태로 변환
 */
export function createPricesMap(
  quotes: StockQuote[]
): Record<string, { price: number; change: number; changePercent: number }> {
  const pricesMap: Record<
    string,
    { price: number; change: number; changePercent: number }
  > = {};

  quotes.forEach((quote) => {
    pricesMap[quote.symbol] = {
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
    };
  });

  return pricesMap;
}
