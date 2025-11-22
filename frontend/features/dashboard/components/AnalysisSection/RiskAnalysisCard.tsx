import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockAnalysis } from "@/types";
import { RiskBar } from "./RiskBar";

interface RiskAnalysisCardProps {
  analysis: StockAnalysis;
}

export const RiskAnalysisCard = memo(function RiskAnalysisCard({ analysis }: RiskAnalysisCardProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">리스크 분석</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          AI 기반 위험 요소 평가
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 py-4 px-4">
        <RiskBar
          label="시장 리스크"
          level={analysis.risk_analysis?.market_risk || "low"}
        />
        <RiskBar
          label="변동성 리스크"
          level={analysis.risk_analysis?.volatility_risk || "medium"}
        />
        <RiskBar
          label="유동성 리스크"
          level={analysis.risk_analysis?.liquidity_risk || "low"}
        />
      </CardContent>
    </Card>
  );
});
