import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RelatedNewsArticle } from "../../services/newsAnalysisService";
import { RelatedNewsCard } from "./RelatedNewsCard";

interface RelatedNewsListProps {
  symbol?: string;
  relatedNews: RelatedNewsArticle[];
  currentPage: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
}

/**
 * RelatedNewsList Component
 * 관련 뉴스 리스트 (사이드바)
 */
export function RelatedNewsList({
  symbol,
  relatedNews,
  currentPage,
  onPageChange,
  hasNextPage,
}: RelatedNewsListProps) {
  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">관련 뉴스</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {symbol ? `${symbol} 종목 관련 뉴스` : "관련 뉴스"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        {relatedNews.length > 0 ? (
          <div className="space-y-3">
            {relatedNews.map((article) => (
              <RelatedNewsCard key={article.id} article={article} />
            ))}

            {/* Pagination */}
            <div className="pt-3 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        currentPage > 1 && onPageChange(currentPage - 1)
                      }
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {/* Page numbers - Show current page and nearby pages */}
                  {Array.from({ length: 3 }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 1) + i;

                    // 현재 페이지 기준으로 앞뒤 1페이지씩만 표시
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
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            관련 뉴스가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
