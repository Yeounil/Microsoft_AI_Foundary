import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockAnalysis } from "@/types";
import { RiskBar } from "./RiskBar";

interface RiskAnalysisCardProps {
  analysis: StockAnalysis;
}

export function RiskAnalysisCard({ analysis }: RiskAnalysisCardProps) {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">리스크 분석</CardTitle>
        <CardDescription className="text-xs">
          AI 기반 위험 요소 평가
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-5 flex flex-col justify-center">
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
}
