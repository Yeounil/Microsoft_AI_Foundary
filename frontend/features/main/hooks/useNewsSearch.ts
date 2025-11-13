import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/**
 * 뉴스 검색 Hook
 * 검색, 필터링, dropdown, keyboard navigation을 관리합니다.
 */
export function useNewsSearch(availableStocks: string[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter stocks based on search query (memoized)
  const filteredStocks = useMemo(
    () =>
      searchQuery
        ? availableStocks.filter((stock) =>
            stock.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [],
    [searchQuery, availableStocks]
  );

  // Handler functions (declared before effects)
  const handleSelectStock = useCallback((stock: string) => {
    setSelectedStock(stock);
    setSearchQuery(stock);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }, []);

  const handleClearStock = useCallback(() => {
    setSelectedStock(null);
    setSearchQuery("");
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setShowDropdown(value.length > 0);
      setHighlightedIndex(-1);

      // Clear selection if input doesn't match selected stock
      if (selectedStock && value !== selectedStock) {
        setSelectedStock(null);
      }
    },
    [selectedStock]
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
            handleSelectStock(filteredStocks[highlightedIndex]);
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
