import { memo } from "react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinancialNewsArticle, getSentiment } from "../../services/newsService";
import { stripMarkdown } from "@/lib/stripMarkdown";

interface NewsCardProps {
  article: FinancialNewsArticle;
  index: number;
}

/**
 * NewsCard Component
 * 개별 뉴스 기사를 카드 형태로 표시합니다.
 */
export const NewsCard = memo(function NewsCard({ article, index }: NewsCardProps) {
  const sentiment = getSentiment(article.positive_score);
  const SentimentIcon = sentiment.icon;

  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  return (
    <Link
      key={article.id || index}
      href={`/news-analysis/${article.id}`}
      className="block"
    >
      <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] min-h-[90px] md:min-h-[110px] lg:min-h-[120px] py-1.5 md:py-2.5">
        <CardHeader className="pb-1.5 pt-1.5 md:pt-2.5 space-y-1.5 md:space-y-2.5 px-3 md:px-6">
          {/* 타블릿: 날짜 + 감정 상태 (상단) */}
          <div className="hidden md:flex lg:hidden items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md whitespace-nowrap ${sentiment.color}`}
            >
              <SentimentIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{sentiment.label}</span>
            </div>
          </div>

          {/* 제목 (모바일/타블릿) */}
          <CardTitle className="lg:hidden line-clamp-2 text-xs md:text-sm leading-4 md:leading-5">
            {article.title}
          </CardTitle>

          {/* 데스크톱: 제목 + 감정분석 (같은 줄) */}
          <div className="hidden lg:flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base leading-6 flex-1">
              {article.title}
            </CardTitle>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${sentiment.color}`}
            >
              <SentimentIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{sentiment.label}</span>
            </div>
          </div>

          {/* 본문 미리보기 (데스크톱만 표시) */}
          {(article.kr_translate || article.text) && (
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {stripMarkdown(article.kr_translate || article.text || "")}
              </p>
            </div>
          )}

          {/* 하단: 신문사 + 날짜 + 종목 */}
          <CardDescription className="text-[10px] md:text-xs">
            <div className="flex items-center gap-2">
              <span>{article.source || "Unknown"}</span>
              <span className="hidden lg:inline">•</span>
              <span className="hidden lg:inline">{formattedDate}</span>
              {article.symbol && (
                <>
                  <span>•</span>
                  <span className="font-medium text-primary">
                    {article.symbol}
                  </span>
                </>
              )}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
});
