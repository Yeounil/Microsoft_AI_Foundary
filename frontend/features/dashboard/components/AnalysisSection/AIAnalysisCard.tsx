import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StockAnalysis } from "@/types";

interface AIAnalysisCardProps {
  analysis: StockAnalysis;
}

export const AIAnalysisCard = memo(function AIAnalysisCard({ analysis }: AIAnalysisCardProps) {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">AI 종합 분석</CardTitle>
        <CardDescription className="text-xs">
          머신러닝 기반 투자 적합도 평가
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 flex flex-col justify-center">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <ScoreItem
            label="AI 투자 점수"
            value={analysis.ai_score}
          />
          <ScoreItem
            label="시장 센티먼트"
            value={analysis.market_sentiment}
          />
          <ScoreItem
            label="변동성 지수"
            value={analysis.volatility_index}
          />
          <ScoreItem
            label="유동성 점수"
            value={analysis.liquidity_score}
          />
        </div>

        <div className="rounded-lg bg-muted p-2">
          <p className="text-sm font-medium mb-1">AI 추천</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
