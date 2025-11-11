'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { StockAnalysis } from '@/types';

interface AnalysisSectionProps {
  symbol: string;
}

export function AnalysisSection({ symbol }: AnalysisSectionProps) {
  const [activeTab, setActiveTab] = useState('analysis');

  // AI 분석 데이터 가져오기
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['analysis', symbol],
    queryFn: () => apiClient.analyzeStock(symbol, '1mo'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">분석 데이터를 불러오는 중...</p>
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
    recommendation: '현재 상승 모멘텀이 강하며, 단기 투자에 적합한 시점입니다.',
    technical_indicators: {
      rsi: 65,
      macd: 0.5,
      ma_50: 150.25,
      ma_200: 145.80,
    },
    financial_ratios: {
      pe_ratio: 28.5,
      pb_ratio: 7.2,
      debt_to_equity: 1.2,
      roe: 25.3,
    },
    risk_analysis: {
      market_risk: 'low',
      volatility_risk: 'medium',
      liquidity_risk: 'low',
    },
  };

  const analysisData = analysis || mockAnalysis;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full">
        <TabsTrigger value="analysis" className="flex-1">
          분석
        </TabsTrigger>
        <TabsTrigger value="news" className="flex-1">
          뉴스
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="space-y-4 mt-4">
        {/* AI 종합 분석 */}
        <Card>
          <CardHeader>
            <CardTitle>AI 종합 분석</CardTitle>
            <CardDescription>머신러닝 기반 투자 적합도 평가</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">AI 투자 점수</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{analysisData.ai_score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={analysisData.ai_score} className="h-2" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">시장 센티먼트</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{analysisData.market_sentiment}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={analysisData.market_sentiment} className="h-2" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">변동성 지수</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{analysisData.volatility_index}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={analysisData.volatility_index} className="h-2" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">유동성 점수</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{analysisData.liquidity_score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={analysisData.liquidity_score} className="h-2" />
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">AI 추천</p>
              <p className="text-sm text-muted-foreground">
                {analysisData.recommendation}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 기본 데이터 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 데이터</CardTitle>
            <CardDescription>주요 재무 및 시장 지표</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">시가총액</span>
                <span className="text-sm font-medium">$2.8T</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">P/E 비율</span>
                <span className="text-sm font-medium">{analysisData.financial_ratios?.pe_ratio || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">52주 최고가</span>
                <span className="text-sm font-medium">$315.49</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">52주 최저가</span>
                <span className="text-sm font-medium">$224.96</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">평균 거래량</span>
                <span className="text-sm font-medium">58.2M</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">배당 수익률</span>
                <span className="text-sm font-medium">0.52%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 리스크 분석 */}
        <Card>
          <CardHeader>
            <CardTitle>리스크 분석</CardTitle>
            <CardDescription>AI 기반 위험 요소 평가</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RiskBar
              label="시장 리스크"
              level={analysisData.risk_analysis?.market_risk || 'low'}
            />
            <RiskBar
              label="변동성 리스크"
              level={analysisData.risk_analysis?.volatility_risk || 'medium'}
            />
            <RiskBar
              label="유동성 리스크"
              level={analysisData.risk_analysis?.liquidity_risk || 'low'}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="news" className="mt-4">
        <NewsTab symbol={symbol} />
      </TabsContent>
    </Tabs>
  );
}

interface RiskBarProps {
  label: string;
  level: 'low' | 'medium' | 'high';
}

function RiskBar({ label, level }: RiskBarProps) {
  const getColor = () => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
    }
  };

  const getText = () => {
    switch (level) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
    }
  };

  const getProgress = () => {
    switch (level) {
      case 'low': return 33;
      case 'medium': return 66;
      case 'high': return 100;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={level === 'low' ? 'default' : level === 'medium' ? 'secondary' : 'destructive'}>
          {getText()}
        </Badge>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${getColor()} transition-all`}
          style={{ width: `${getProgress()}%` }}
        />
      </div>
    </div>
  );
}

function NewsTab({ symbol }: { symbol: string }) {
  const { data: news, isLoading } = useQuery({
    queryKey: ['stock-news', symbol],
    queryFn: () => apiClient.getStockNewsPublic(symbol, 7),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">뉴스를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {news?.articles?.map((article, index) => (
        <Card key={index} className="cursor-pointer transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm line-clamp-2">{article.title}</CardTitle>
              {article.sentiment && (
                <Badge variant={article.sentiment === 'positive' ? 'default' : article.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                  {article.sentiment === 'positive' ? '긍정' : article.sentiment === 'negative' ? '부정' : '중립'}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {article.source} • {article.published_at ? new Date(article.published_at).toLocaleDateString('ko-KR') : ''}
            </CardDescription>
          </CardHeader>
        </Card>
      )) || <p className="text-sm text-muted-foreground">표시할 뉴스가 없습니다</p>}
    </div>
  );
}