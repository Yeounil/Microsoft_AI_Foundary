import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FinancialNewsArticle } from "../../services/newsService";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  news: FinancialNewsArticle[];
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  selectedStock: string | null;
  itemsPerPage: number;
  error?: Error | null;
  isWatchlistTab?: boolean;
  watchlistLength?: number;
}

/**
 * NewsList Component
 * 뉴스 리스트와 페이지네이션을 표시합니다.
 */
export function NewsList({
  news,
  currentPage,
  onPageChange,
  isLoading,
  selectedStock,
  itemsPerPage,
  error,
  isWatchlistTab = false,
  watchlistLength = 0,
}: NewsListProps) {
  // 다음 페이지가 있는지 확인
  const hasNextPage = news.length === itemsPerPage;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-200px)] lg:h-[900px] min-h-[400px] max-h-[1100px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          뉴스를 불러오는 중...
        </div>
      </div>
    );
  }

  // 에러 상태 (관심종목에 없는 종목 검색)
  if (error) {
    return (
      <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-200px)] lg:h-[900px] min-h-[400px] max-h-[1100px] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-sm font-medium text-destructive">
            {error.message}
          </div>
          <div className="text-xs text-muted-foreground">
            검색창을 클리어하거나 관심종목에 있는 종목을 검색해주세요
          </div>
        </div>
      </div>
    );
  }

  // 빈 관심종목 상태
  if (isWatchlistTab && watchlistLength === 0) {
    return (
      <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-200px)] lg:h-[900px] min-h-[400px] max-h-[1100px] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            관심종목을 추가해주세요
          </div>
          <div className="text-xs text-muted-foreground">
            메인 페이지 또는 상세 페이지에서 ⭐ 버튼을 클릭하여 종목을 추가할 수 있습니다
          </div>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-200px)] lg:h-[900px] min-h-[400px] max-h-[1100px] items-center justify-center">
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
    <div className="flex flex-col md:h-[870px] lg:h-[1080px] min-h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pt-4 stagger-animate">
        {news.map((item, index) => (
          <div key={item.id || index} className="transform transition-all duration-300">
            <NewsCard article={item} index={index} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="shrink-0 border-t pt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {/* Page numbers */}
            {Array.from({ length: 3 }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 1) + i;

              // 다음 페이지가 없으면 현재 페이지보다 큰 번호는 표시하지 않음
              if (
                pageNum < currentPage - 1 ||
                pageNum > currentPage + 1 ||
                (pageNum > currentPage && !hasNextPage)
              ) {
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

            <PaginationItem>
              <PaginationNext
                onClick={() => hasNextPage && onPageChange(currentPage + 1)}
                className={
                  !hasNextPage
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
