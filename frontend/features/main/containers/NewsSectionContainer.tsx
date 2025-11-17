"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStockStore } from "@/store/stock-store";
import { useNewsSearch } from "../hooks/useNewsSearch";
import { useNewsQuery } from "../hooks/useNewsQuery";
import { SearchBar } from "../components/NewsSection/SearchBar";
import { NewsList } from "../components/NewsSection/NewsList";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../constants/stockCategories";

interface NewsSectionContainerProps {
  availableStocks: string[];
  isLoadingStocks: boolean;
  initialStock?: string; // 초기 선택 종목 (대시보드 페이지용)
  categories?: Record<string, string[]>; // 카테고리별 종목 리스트
}

/**
 * NewsSectionContainer
 * 뉴스 섹션의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function NewsSectionContainer({
  availableStocks,
  isLoadingStocks,
  initialStock,
  categories = {},
}: NewsSectionContainerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [mainTab, setMainTab] = useState<"hot" | "favorites">("hot");
  const [categoryTab, setCategoryTab] = useState<string | null>(null);
  const itemsPerPage = 5;

  const { watchlist } = useStockStore();

  // activeTab을 mainTab과 categoryTab 조합으로 계산
  const activeTab = categoryTab || mainTab;

  // 검색 hook - 탭별 독립적인 검색 상태
  const {
    searchQuery,
    selectedStock,
    showDropdown,
    highlightedIndex,
    filteredStocks,
    dropdownRef,
    inputRef,
    handleSelectStock,
    handleClearStock,
    handleInputChange,
    setShowDropdown,
    setHighlightedIndex,
  } = useNewsSearch(availableStocks, activeTab, initialStock);

  // 카테고리가 선택된 경우 해당 종목 리스트 가져오기
  const categorySymbols = useMemo(() => {
    if (categoryTab && categories[categoryTab]) {
      return categories[categoryTab];
    }
    return undefined;
  }, [categoryTab, categories]);

  // 뉴스 데이터 fetching hook
  const {
    hotNewsData,
    isLoadingHot,
    watchlistNewsData,
    isLoadingWatchlist,
    watchlistError,
    isStockNotInWatchlist,
    categoryNewsData,
    isLoadingCategory,
  } = useNewsQuery(
    selectedStock,
    currentPage,
    activeTab,
    watchlist,
    isLoadingStocks,
    itemsPerPage,
    categorySymbols,
    mainTab,
    categoryTab
  );

  // 종목 선택 시 페이지 리셋
  const handleStockSelect = (stock: string) => {
    handleSelectStock(stock);
    setCurrentPage(1);
  };

  // 종목 클리어 시 페이지 리셋
  const handleStockClear = () => {
    handleClearStock();
    setCurrentPage(1);
  };

  // 메인 탭 변경 핸들러
  const handleMainTabChange = (tab: "hot" | "favorites") => {
    setMainTab(tab);
    setCurrentPage(1);
  };

  // 카테고리 탭 변경 핸들러
  const handleCategoryTabChange = (category: string) => {
    if (categoryTab === category) {
      // 이미 선택된 카테고리를 다시 클릭하면 해제
      setCategoryTab(null);
    } else {
      setCategoryTab(category);
    }
    setCurrentPage(1);
  };

  // 현재 표시할 뉴스 데이터와 로딩 상태 결정
  const currentNewsData = useMemo(() => {
    if (categoryTab) {
      // 카테고리가 선택된 경우
      return categoryNewsData?.articles || [];
    } else if (mainTab === "favorites") {
      // 관심종목 탭
      return watchlistNewsData?.articles || [];
    } else {
      // Hot 뉴스 탭
      return hotNewsData?.articles || [];
    }
  }, [categoryTab, mainTab, categoryNewsData, watchlistNewsData, hotNewsData]);

  const isCurrentLoading = useMemo(() => {
    if (categoryTab) {
      return isLoadingCategory;
    } else if (mainTab === "favorites") {
      return isLoadingWatchlist;
    } else {
      return isLoadingHot;
    }
  }, [categoryTab, mainTab, isLoadingCategory, isLoadingWatchlist, isLoadingHot]);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>뉴스</CardTitle>
        <SearchBar
          searchQuery={searchQuery}
          selectedStock={selectedStock}
          showDropdown={showDropdown}
          highlightedIndex={highlightedIndex}
          filteredStocks={filteredStocks}
          isLoadingStocks={isLoadingStocks}
          dropdownRef={dropdownRef}
          inputRef={inputRef}
          onInputChange={handleInputChange}
          onInputFocus={() => setShowDropdown(searchQuery.length > 0)}
          onSelectStock={handleStockSelect}
          onClearStock={handleStockClear}
          onHighlightChange={setHighlightedIndex}
        />
      </CardHeader>
      <CardContent>
        {/* 첫 번째 탭 그룹: Hot 뉴스 / 관심종목 */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={mainTab === "hot" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleMainTabChange("hot")}
          >
            Hot 뉴스
          </Button>
          <Button
            variant={mainTab === "favorites" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleMainTabChange("favorites")}
          >
            관심종목
          </Button>
        </div>

        {/* 두 번째 탭 그룹: 카테고리 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_ORDER.map((categoryKey) => (
            <Button
              key={categoryKey}
              variant={categoryTab === categoryKey ? "default" : "outline"}
              className="flex-1 min-w-20"
              onClick={() => handleCategoryTabChange(categoryKey)}
            >
              {CATEGORY_LABELS[categoryKey]}
            </Button>
          ))}
        </div>

        {/* 뉴스 리스트 */}
        <NewsList
          news={currentNewsData}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={isCurrentLoading}
          selectedStock={selectedStock}
          itemsPerPage={itemsPerPage}
          error={mainTab === "favorites" ? watchlistError : undefined}
          isWatchlistTab={mainTab === "favorites"}
          watchlistLength={watchlist.length}
        />
      </CardContent>
    </Card>
  );
}
