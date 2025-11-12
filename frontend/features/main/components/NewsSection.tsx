"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { useStockStore } from "@/store/stock-store";

interface NewsSectionProps {
  availableStocks: string[];
  isLoadingStocks: boolean;
}

interface FinancialNewsArticle {
  title: string;
  url: string;
  source: string;
  published_at: string;
  sentiment?: string;
  symbol?: string;
  text?: string;
}

export function NewsSection({ availableStocks, isLoadingStocks }: NewsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hot");
  const itemsPerPage = 5;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { watchlist } = useStockStore();

  // Filter stocks based on search query
  const filteredStocks = searchQuery
    ? availableStocks.filter(stock =>
        stock.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Fetch hot news (general financial news)
  const { data: hotNewsData, isLoading: loadingHot } = useQuery({
    queryKey: ["financial-news", "hot", selectedStock, currentPage],
    queryFn: async () => {
      return await apiClient.getFinancialNewsV1({
        symbol: selectedStock || undefined,
        page: currentPage,
        limit: itemsPerPage,
        lang: 'en',
      });
    },
    enabled: !isLoadingStocks && activeTab === "hot",
    staleTime: 5 * 60 * 1000,
  });

  // Fetch watchlist news (news for user's watchlist stocks)
  const { data: watchlistNewsData, isLoading: loadingWatchlist } = useQuery({
    queryKey: ["financial-news", "watchlist", watchlist, selectedStock, currentPage],
    queryFn: async () => {
      // If user selected a specific stock, use that; otherwise use first watchlist item
      const symbol = selectedStock || (watchlist.length > 0 ? watchlist[0] : undefined);
      return await apiClient.getFinancialNewsV1({
        symbol,
        page: currentPage,
        limit: itemsPerPage,
        lang: 'en',
      });
    },
    enabled: !isLoadingStocks && activeTab === "favorites",
    staleTime: 5 * 60 * 1000,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
          setHighlightedIndex(prev =>
            prev < filteredStocks.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
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
  }, [showDropdown, highlightedIndex, filteredStocks]);

  const handleSelectStock = (stock: string) => {
    setSelectedStock(stock);
    setSearchQuery(stock);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setCurrentPage(1); // Reset page when stock changes
  };

  const handleClearStock = () => {
    setSelectedStock(null);
    setSearchQuery("");
    setCurrentPage(1);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.length > 0);
    setHighlightedIndex(-1);

    // Clear selection if input doesn't match selected stock
    if (selectedStock && value !== selectedStock) {
      setSelectedStock(null);
    }
  };

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>뉴스</CardTitle>
        <div className="pt-4 relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="종목 심볼 검색 (예: AAPL, TSLA)..."
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowDropdown(searchQuery.length > 0)}
              className="pl-9 pr-8"
              disabled={isLoadingStocks}
            />
            {selectedStock && (
              <button
                onClick={handleClearStock}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && filteredStocks.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredStocks.map((stock, index) => (
                <button
                  key={stock}
                  onClick={() => handleSelectStock(stock)}
                  className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                    highlightedIndex === index ? 'bg-muted' : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="font-medium">{stock}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1); // Reset page when switching tabs
        }}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="hot" className="flex-1">
              Hot 뉴스
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심 종목
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-0">
            <NewsListContent
              news={hotNewsData?.articles || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={hotNewsData?.total_pages || 1}
              isLoading={loadingHot}
              selectedStock={selectedStock}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <NewsListContent
              news={watchlistNewsData?.articles || []}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={watchlistNewsData?.total_pages || 1}
              isLoading={loadingWatchlist}
              selectedStock={selectedStock}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface NewsListContentProps {
  news: FinancialNewsArticle[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  isLoading: boolean;
  selectedStock: string | null;
  itemsPerPage: number;
}

function NewsListContent({
  news,
  currentPage,
  onPageChange,
  totalPages,
  isLoading,
  selectedStock,
  itemsPerPage,
}: NewsListContentProps) {
  const visibleNews = news;

  // 다음 페이지가 있는지 확인 (현재 페이지가 가득 차있으면 다음 페이지가 있을 가능성이 높음)
  const hasNextPage = news.length === itemsPerPage;

  if (isLoading) {
    return (
      <div className="flex h-[870px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          뉴스를 불러오는 중...
        </div>
      </div>
    );
  }

  if (visibleNews.length === 0) {
    return (
      <div className="flex h-[870px] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            {selectedStock
              ? `${selectedStock}에 대한 뉴스가 없습니다`
              : "종목을 선택하여 관련 뉴스를 확인하세요"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[870px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {visibleNews.map((item, index) => (
          <a
            key={item.url || index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 min-h-[120px]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="line-clamp-2 text-sm leading-5 flex-1">
                    {item.title}
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span>{item.source || "Unknown"}</span>
                  <span>•</span>
                  <span>
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString("ko-KR", {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "Unknown date"}
                  </span>
                  {item.symbol && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-primary">{item.symbol}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              {item.text && (
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.text}
                  </p>
                </CardContent>
              )}
            </Card>
          </a>
        ))}
      </div>

      {/* Pagination - Show previous pages and next button */}
      <div className="flex-shrink-0 border-t pt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {/* Page numbers - Show current page and nearby pages (±1) */}
            {Array.from({ length: 3 }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 1) + i;

              // 현재 페이지 기준으로 앞뒤 1페이지씩만 표시
              if (pageNum < currentPage - 1 || pageNum > currentPage + 1) {
                return null;
              }

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            }).filter(Boolean)}

            {/* Show ellipsis if we might have more pages */}
            {hasNextPage && currentPage > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => hasNextPage && onPageChange(currentPage + 1)}
                className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
