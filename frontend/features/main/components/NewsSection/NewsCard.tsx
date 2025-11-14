import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinancialNewsArticle, getSentiment } from "../../services/newsService";

interface NewsCardProps {
  article: FinancialNewsArticle;
  index: number;
}

/**
 * NewsCard Component
 * 개별 뉴스 기사를 카드 형태로 표시합니다.
 */
export function NewsCard({ article, index }: NewsCardProps) {
  const sentiment = getSentiment(article.positive_score);
  const SentimentIcon = sentiment.icon;

  return (
    <Link
      key={article.id || index}
      href={`/news-analysis/${article.id}`}
      className="block"
    >
      <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 h-[120px] py-2">
        <CardHeader className="pb-1 pt-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <CardTitle className="line-clamp-2 text-xs leading-4 flex-1">
              {article.title}
            </CardTitle>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md whitespace-nowrap ${sentiment.color}`}
            >
              <SentimentIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{sentiment.label}</span>
            </div>
          </div>
          <CardDescription className="space-y-1 text-xs">
            <div>{article.source || "Unknown"}</div>
            <div className="flex items-center gap-2">
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
        {article.text && (
          <CardContent>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {article.text}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
