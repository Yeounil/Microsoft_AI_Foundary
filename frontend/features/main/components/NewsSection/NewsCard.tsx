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

  return (
    <Link
      key={article.id || index}
      href={`/news-analysis/${article.id}`}
      className="block"
    >
      <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] min-h-responsive-card py-2">
        <CardHeader className="pb-2 pt-3 space-y-2">
          {/* 제목과 감정 태그 */}
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-sm leading-5 flex-1">
              {article.title}
            </CardTitle>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md whitespace-nowrap ${sentiment.color}`}
            >
              <SentimentIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{sentiment.label}</span>
            </div>
          </div>

          {/* 본문 미리보기 (kr_translate 우선, 없으면 text) */}
          {(article.kr_translate || article.text) && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {stripMarkdown(article.kr_translate || article.text || "")}
            </p>
          )}

          {/* 신문사와 날짜 */}
          <CardDescription className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span>{article.source || "Unknown"}</span>
              <span>•</span>
              <span>
                {article.published_at
                  ? new Date(article.published_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown date"}
              </span>
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
