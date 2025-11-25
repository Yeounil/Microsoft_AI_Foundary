"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockStore } from "@/store/stock-store";
import { useStockData } from "../hooks/useStockData";
import { useStockPrices } from "../hooks/useStockPrices";
import { useStockSearch } from "../hooks/useStockSearch";
import { StockListSearch } from "../components/StockList/StockListSearch";
import { StockListTabs } from "../components/StockList/StockListTabs";
import { StockItem } from "../services/stockListService";

interface StockInfo {
  symbol: string;
  name: string;
}

interface StockListContainerProps {
  onSelectStock?: (symbol: string) => void;
  selectedSymbol?: string;
  supportedStocks: StockInfo[];
  isLoadingStocks: boolean;
}

/**
 * StockListContainer
 * 종목 리스트의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function StockListContainer({
  onSelectStock,
  selectedSymbol,
  supportedStocks,
  isLoadingStocks,
}: StockListContainerProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();

  // supportedStocks를 변환하고 첫 종목 자동 선택
  const { allStocks } = useStockData({
    supportedStocks,
    onSelectStock,
    selectedSymbol,
  });

  // 가격 업데이트 (초기 로딩 + 주기적 업데이트)
  const { stockPrices } = useStockPrices(allStocks);

  // 가격 데이터와 결합된 최종 stocks
  const stocks = useMemo((): StockItem[] => {
    return allStocks.map((stock) => {
      const priceData = stockPrices[stock.symbol];

      if (priceData && priceData.price) {
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: priceData.price,
          change: priceData.change || 0,
          changePercent: priceData.changePercent || 0,
          isLoading: false,
        };
      }

      // 가격 데이터가 없으면 로딩 중 (상위 100개 밖의 종목)
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: null,
        change: 0,
        changePercent: 0,
        isLoading: true,
      };
    });
  }, [allStocks, stockPrices]);

  // 검색 필터링
  const { filteredStocks } = useStockSearch(stocks, searchQuery);

  // 관심 종목 필터링 (메모이제이션)
  const favoriteStocks = useMemo(
    () => filteredStocks.filter((stock) => watchlist.includes(stock.symbol)),
    [filteredStocks, watchlist]
  );

  // 현재 탭에 따른 표시 종목 (메모이제이션)
  const displayStocks = useMemo(
    () => (activeTab === "all" ? filteredStocks : favoriteStocks),
    [activeTab, filteredStocks, favoriteStocks]
  );

  // 관심 종목 토글 (콜백 메모이제이션)
  const toggleWatchlist = useCallback(
    (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation(); // 클릭 이벤트 전파 방지

      if (watchlist.includes(symbol)) {
        removeFromWatchlist(symbol);
      } else {
        addToWatchlist(symbol);
      }
    },
    [watchlist, removeFromWatchlist, addToWatchlist]
  );

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="px-3 md:px-3">
        <CardTitle className="text-base md:text-lg">종목 리스트</CardTitle>
        <StockListSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isDisabled={isLoadingStocks}
        />
      </CardHeader>
      <CardContent className="px-3 md:px-3">
        {isLoadingStocks ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground animate-pulse">
              종목 리스트 로딩 중...
            </div>
          </div>
        ) : (
          <StockListTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allStocksCount={filteredStocks.length}
            favoriteStocksCount={favoriteStocks.length}
            displayStocks={displayStocks}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onSelectStock={onSelectStock}
            selectedSymbol={selectedSymbol}
          />
        )}
      </CardContent>
    </Card>
  );
}
