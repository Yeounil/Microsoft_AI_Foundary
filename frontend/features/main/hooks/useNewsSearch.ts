import { useState, useRef, useEffect, useMemo, useCallback } from "react";

interface StockInfo {
  symbol: string;
  name: string;
}

interface TabSearchState {
  searchQuery: string;
  selectedStock: string | null;
}

/**
 * 뉴스 검색 Hook
 * 검색, 필터링, dropdown, keyboard navigation을 관리합니다.
 * 탭별 독립적인 검색 상태를 유지합니다.
 */
export function useNewsSearch(
  availableStocks: StockInfo[],
  activeTab: string,
  initialStock?: string
) {
  // 탭별 독립적인 검색 상태
  const [hotTabSearch, setHotTabSearch] = useState<TabSearchState>({
    searchQuery: "",
    selectedStock: null,
  });
  const [favoritesTabSearch, setFavoritesTabSearch] = useState<TabSearchState>({
    searchQuery: "",
    selectedStock: null,
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 현재 활성 탭의 검색 상태 가져오기
  const currentTabSearch = activeTab === "hot" ? hotTabSearch : favoritesTabSearch;
  const searchQuery = currentTabSearch.searchQuery;
  const selectedStock = currentTabSearch.selectedStock;

  // Set initial stock if provided (only for dashboard pages, not for main page tabs)
  // Initialize state directly instead of using useEffect to avoid cascading renders
  const [initialized, setInitialized] = useState(false);
  if (!initialized && initialStock && activeTab === "hot") {
    setHotTabSearch({
      searchQuery: initialStock,
      selectedStock: initialStock,
    });
    setInitialized(true);
  }

  // Filter stocks based on search query (memoized)
  const filteredStocks = useMemo(
    () =>
      searchQuery
        ? availableStocks.filter((stock) =>
            stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stock.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [],
    [searchQuery, availableStocks]
  );

  // Handler functions (declared before effects)
  const handleSelectStock = useCallback(
    (stock: string) => {
      const newState = { searchQuery: stock, selectedStock: stock };
      if (activeTab === "hot") {
        setHotTabSearch(newState);
      } else {
        setFavoritesTabSearch(newState);
      }
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [activeTab]
  );

  const handleClearStock = useCallback(() => {
    const newState = { searchQuery: "", selectedStock: null };
    if (activeTab === "hot") {
      setHotTabSearch(newState);
    } else {
      setFavoritesTabSearch(newState);
    }
    inputRef.current?.focus();
  }, [activeTab]);

  const handleInputChange = useCallback(
    (value: string) => {
      const newState = {
        searchQuery: value,
        selectedStock: selectedStock && value !== selectedStock ? null : selectedStock,
      };
      if (activeTab === "hot") {
        setHotTabSearch(newState);
      } else {
        setFavoritesTabSearch(newState);
      }
      setShowDropdown(value.length > 0);
      setHighlightedIndex(-1);
    },
    [selectedStock, activeTab]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredStocks.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredStocks[highlightedIndex]) {
            handleSelectStock(filteredStocks[highlightedIndex].symbol);
          }
          break;
        case "Escape":
          setShowDropdown(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown, highlightedIndex, filteredStocks, handleSelectStock]);

  return {
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
  };
}
