import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
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
}: NewsListProps) {
  // 다음 페이지가 있는지 확인
  const hasNextPage = news.length === itemsPerPage;

  if (isLoading) {
    return (
      <div className="flex h-[720px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          뉴스를 불러오는 중...
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex h-[720px] items-center justify-center">
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
    <div className="flex flex-col h-[720px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {news.map((item, index) => (
          <NewsCard key={item.id || index} article={item} index={index} />
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

            {/* Ellipsis */}
            {hasNextPage && currentPage > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

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
