"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { StockAnalysis } from "@/types";

interface AnalysisSectionProps {
  symbol: string;
}

export function AnalysisSection({ symbol }: AnalysisSectionProps) {
  // AI 분석 데이터 가져오기
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", symbol],
    queryFn: () => apiClient.analyzeStock(symbol, "1mo"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 h-[1080px] flex items-center justify-center">
        <Card className="w-full h-full">
          <CardContent className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              분석 데이터를 불러오는 중...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mockAnalysis: StockAnalysis = {
    symbol,
    ai_score: 76,
    market_sentiment: 75,
    volatility_index: 42,
    liquidity_score: 83,
    recommendation: "현재 상승 모멘텀이 강하며, 단기 투자에 적합한 시점입니다.",
    technical_indicators: {
      rsi: 65,
      macd: 0.5,
      ma_50: 150.25,
      ma_200: 145.8,
    },
    financial_ratios: {
      pe_ratio: 28.5,
      pb_ratio: 7.2,
      debt_to_equity: 1.2,
      roe: 25.3,
    },
    risk_analysis: {
      market_risk: "low",
      volatility_risk: "medium",
      liquidity_risk: "low",
    },
  };

  const analysisData = analysis || mockAnalysis;

  return (
    <div className="h-[1080px] flex flex-col gap-4">
      {/* AI 종합 분석 - 33.3% */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">AI 종합 분석</CardTitle>
          <CardDescription className="text-xs">머신러닝 기반 투자 적합도 평가</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 flex-1 flex flex-col justify-center">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">AI 투자 점수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {analysisData.ai_score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={analysisData.ai_score} className="h-2" />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">시장 센티먼트</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {analysisData.market_sentiment}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={analysisData.market_sentiment} className="h-2" />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">변동성 지수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {analysisData.volatility_index}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={analysisData.volatility_index} className="h-2" />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">유동성 점수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {analysisData.liquidity_score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={analysisData.liquidity_score} className="h-2" />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-1.5">AI 추천</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysisData.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 기본 데이터 - 33.3% */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">기본 데이터</CardTitle>
          <CardDescription className="text-xs">주요 재무 및 시장 지표</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center">
          <div className="grid gap-3 grid-cols-2 w-full">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">시가총액</span>
              <span className="text-base font-semibold">$2.8T</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">P/E 비율</span>
              <span className="text-base font-semibold">
                {analysisData.financial_ratios?.pe_ratio || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">52주 최고가</span>
              <span className="text-base font-semibold">$315.49</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">52주 최저가</span>
              <span className="text-base font-semibold">$224.96</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">평균 거래량</span>
              <span className="text-base font-semibold">58.2M</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">배당 수익률</span>
              <span className="text-base font-semibold">0.52%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 리스크 분석 - 33.3% */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">리스크 분석</CardTitle>
          <CardDescription className="text-xs">AI 기반 위험 요소 평가</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-5 flex flex-col justify-center">
          <RiskBar
            label="시장 리스크"
            level={analysisData.risk_analysis?.market_risk || "low"}
          />
          <RiskBar
            label="변동성 리스크"
            level={analysisData.risk_analysis?.volatility_risk || "medium"}
          />
          <RiskBar
            label="유동성 리스크"
            level={analysisData.risk_analysis?.liquidity_risk || "low"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface RiskBarProps {
  label: string;
  level: "low" | "medium" | "high";
}

function RiskBar({ label, level }: RiskBarProps) {
  const getColor = () => {
    switch (level) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
    }
  };

  const getText = () => {
    switch (level) {
      case "low":
        return "낮음";
      case "medium":
        return "보통";
      case "high":
        return "높음";
    }
  };

  const getProgress = () => {
    switch (level) {
      case "low":
        return 33;
      case "medium":
        return 66;
      case "high":
        return 100;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge
          variant={
            level === "low"
              ? "default"
              : level === "medium"
              ? "secondary"
              : "destructive"
          }
          className="text-xs px-2 py-0.5"
        >
          {getText()}
        </Badge>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${getColor()} transition-all`}
          style={{ width: `${getProgress()}%` }}
        />
      </div>
    </div>
  );
}
