import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SentimentType } from "../../services/newsAnalysisService";

interface ImpactAnalysisProps {
  sentiment: SentimentType;
  impact: string;
  aiScore?: number;
  relatedStocks: string[];
}

/**
 * ImpactAnalysis Component
 * 주가 영향 분석 카드
 */
export function ImpactAnalysis({
  sentiment,
  impact,
  aiScore,
  relatedStocks,
}: ImpactAnalysisProps) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">주가 영향 분석</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">예상 영향:</span>
          <span
            className={`text-sm font-medium ${
              sentiment === "positive"
                ? "text-green-600"
                : sentiment === "negative"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {impact}
          </span>
        </div>
        {aiScore && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI 신뢰도:</span>
            <span className="text-sm font-medium">
              {(aiScore * 100).toFixed(0)}%
            </span>
          </div>
        )}
        {relatedStocks.length > 0 && (
          <div>
            <span className="text-sm font-medium">관련 종목:</span>
            <div className="mt-2 flex gap-2">
              {relatedStocks.map((stock) => (
                <Badge key={stock} variant="outline">
                  {stock}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
