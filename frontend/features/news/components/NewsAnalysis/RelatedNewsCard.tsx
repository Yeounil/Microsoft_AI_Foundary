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
      <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] min-h-[100px] py-2">
        <CardHeader className="p-3 md:p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <CardTitle className="line-clamp-2 text-xs leading-4 flex-1">
              {article.title}
            </CardTitle>
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0 ${sentimentBadge.color}`}
            >
              <SentimentIcon className="h-2.5 w-2.5" />
              <span className="text-[10px] font-medium">
                {sentimentBadge.label}
              </span>
            </div>
          </div>
          <CardDescription className="text-[10px] md:text-xs">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="truncate max-w-[100px]">{article.source || "Unknown"}</span>
              <span>•</span>
              <span>
                {article.published_at
                  ? new Date(article.published_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Unknown"}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
