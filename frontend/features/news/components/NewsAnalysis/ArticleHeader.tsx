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
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-start justify-between gap-2 md:block">
              <CardTitle className="text-lg md:text-2xl leading-tight">{title}</CardTitle>
              {/* 모바일에서만 배지 표시 */}
              <Badge
                className="md:hidden shrink-0"
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
            <CardDescription className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm">
              <span>{source}</span>
              <span>•</span>
              <span>
                {new Date(publishedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </CardDescription>
          </div>
          {/* 데스크톱에서만 배지 표시 */}
          <Badge
            className="hidden md:inline-flex shrink-0"
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
