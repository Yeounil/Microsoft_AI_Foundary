import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatedNewsArticle, getSentimentBadge } from "../../services/newsAnalysisService";

interface RelatedNewsCardProps {
  article: RelatedNewsArticle;
}

/**
 * RelatedNewsCard Component
 * 관련 뉴스 개별 카드
 */
export function RelatedNewsCard({ article }: RelatedNewsCardProps) {
  const sentimentBadge = getSentimentBadge(article.positive_score);
  const SentimentIcon = sentimentBadge.icon;

  return (
    <Link href={`/news-analysis/${article.id}`} className="block">
      <Card className="cursor-pointer transition-all hover:shadow-md">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="line-clamp-2 text-sm leading-5 flex-1 min-h-10">
              {article.title}
            </CardTitle>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md whitespace-nowrap ${sentimentBadge.color}`}
            >
              <SentimentIcon className="h-3 w-3" />
              <span className="text-xs font-medium">
                {sentimentBadge.label}
              </span>
            </div>
          </div>
          <CardDescription className="space-y-1 text-xs">
            <div>{article.source || "Unknown"}</div>
            <div>
              {article.published_at
                ? new Date(article.published_at).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Unknown date"}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
