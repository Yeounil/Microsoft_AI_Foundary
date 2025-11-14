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
      <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 h-[120px] py-2">
        <CardHeader className="pb-1 pt-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <CardTitle className="line-clamp-2 text-xs leading-4 flex-1">
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
          <CardDescription className="text-xs">
            <div className="flex items-center gap-2">
              <span>{article.source || "Unknown"}</span>
              <span>•</span>
              <span>
                {article.published_at
                  ? new Date(article.published_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown date"}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
