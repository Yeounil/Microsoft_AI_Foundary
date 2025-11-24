"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useStockAnalysis } from "../hooks/useStockAnalysis";
import { AIAnalysisCard } from "../components/AnalysisSection/AIAnalysisCard";
import { BasicDataCard } from "../components/AnalysisSection/BasicDataCard";
import { RiskAnalysisCard } from "../components/AnalysisSection/RiskAnalysisCard";

interface AnalysisSectionContainerProps {
  symbol: string;
}

export function AnalysisSectionContainer({
  symbol,
}: AnalysisSectionContainerProps) {
  const { analysisData, isLoading } = useStockAnalysis(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4 min-h-[300px] md:min-h-[400px] lg:min-h-[600px] flex items-center justify-center">
        <Card className="w-full">
          <CardContent className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              분석 데이터를 불러오는 중...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:min-h-[800px]">
      <AIAnalysisCard analysis={analysisData} />
      <BasicDataCard analysis={analysisData} />
      <RiskAnalysisCard analysis={analysisData} />
    </div>
  );
}
