"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockStore } from "@/store/stock-store";
import { useNewsSearch } from "../hooks/useNewsSearch";
import { useNewsQuery } from "../hooks/useNewsQuery";
import { SearchBar } from "../components/NewsSection/SearchBar";
import { NewsList } from "../components/NewsSection/NewsList";

interface NewsSectionContainerProps {
  availableStocks: string[];
  isLoadingStocks: boolean;
  initialStock?: string; // 초기 선택 종목 (대시보드 페이지용)
}

/**
 * NewsSectionContainer
 * 뉴스 섹션의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function NewsSectionContainer({
  availableStocks,
  isLoadingStocks,
  initialStock,
}: NewsSectionContainerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hot");
  const itemsPerPage = 5;

  const { watchlist } = useStockStore();

  // 검색 hook
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
  } = useNewsSearch(availableStocks, initialStock);

  // 뉴스 데이터 fetching hook
  const { hotNewsData, isLoadingHot, watchlistNewsData, isLoadingWatchlist } =
    useNewsQuery(
      selectedStock,
      currentPage,
      activeTab,
      watchlist,
      isLoadingStocks,
      itemsPerPage
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

  return (
    <Card className="h-fit lg:sticky lg:top-20">
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1); // Reset page when switching tabs
          }}
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="hot" className="flex-1">
              Hot 뉴스
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심종목
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-0">
            <NewsList
              news={hotNewsData?.articles || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              isLoading={isLoadingHot}
              selectedStock={selectedStock}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <NewsList
              news={watchlistNewsData?.articles || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              isLoading={isLoadingWatchlist}
              selectedStock={selectedStock}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
