'use client';

import { ReportDetail } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  ExternalLink,
  Newspaper
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ReportContentProps {
  report: ReportDetail;
}

export function ReportContent({ report }: ReportContentProps) {
  const { report_data } = report;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

    const lower = sentiment.toLowerCase();
    if (lower.includes('긍정') || lower.includes('positive')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (lower.includes('부정') || lower.includes('negative')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div className="space-y-6">
      {/* 요약 */}
      {report_data.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {report_data.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 시장 감정 */}
      {report_data.sentiment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              시장 감정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getSentimentColor(report_data.sentiment)}>
              {report_data.sentiment}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 주요 포인트 */}
      {report_data.key_points && report_data.key_points.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              주요 포인트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report_data.key_points.map((point, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-base leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 투자 제안 */}
      {report_data.recommendations && report_data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              투자 제안
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report_data.recommendations.map((rec, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-base leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 분석된 뉴스 */}
      {report_data.analyzed_articles && report_data.analyzed_articles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              분석된 뉴스 ({report_data.analyzed_articles.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report_data.analyzed_articles.map((article, index) => (
                <div
                  key={index}
                  className="border-l-4 border-primary/30 pl-4 py-2 hover:border-primary transition-colors"
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-medium text-base group-hover:text-primary transition-colors flex-1">
                        {article.title}
                      </h4>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-1" />
                    </div>
                  </a>

                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span>{formatDate(article.published_at)}</span>

                    {article.sentiment && (
                      <Badge variant="outline" className="text-xs">
                        {article.sentiment}
                      </Badge>
                    )}

                    {article.impact_score !== undefined && (
                      <span className="text-xs">
                        영향도: {(article.impact_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 기타 데이터 (report_data에 추가 필드가 있을 경우) */}
      {Object.keys(report_data).filter(
        key => !['summary', 'sentiment', 'key_points', 'recommendations', 'analyzed_articles'].includes(key)
      ).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>추가 분석 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(report_data).filter(
                    ([key]) => !['summary', 'sentiment', 'key_points', 'recommendations', 'analyzed_articles'].includes(key)
                  )
                ),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
