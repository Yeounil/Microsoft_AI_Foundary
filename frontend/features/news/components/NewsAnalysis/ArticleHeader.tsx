import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SentimentType } from "../../services/newsAnalysisService";

interface ArticleHeaderProps {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: SentimentType;
}

/**
 * ArticleHeader Component
 * 뉴스 기사 헤더 (제목, 출처, 날짜, 감정 배지)
 */
export function ArticleHeader({
  title,
  source,
  publishedAt,
  sentiment,
}: ArticleHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>{source}</span>
              <span>•</span>
              <span>
                {new Date(publishedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </CardDescription>
          </div>
          <Badge
            variant={
              sentiment === "positive"
                ? "default"
                : sentiment === "negative"
                ? "destructive"
                : "secondary"
            }
          >
            {sentiment === "positive"
              ? "긍정"
              : sentiment === "negative"
              ? "부정"
              : "중립"}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}
