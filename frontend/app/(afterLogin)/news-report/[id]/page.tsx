'use client';

import { useRef, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';

interface NewsReportData {
  symbol: string;
  companyName: string;
  title: string;
  generatedAt: string;
  analysisPeriod: string;
  analyzedCount: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  executiveSummary: {
    overview: string;
    keyFindings: string[];
  };
  marketReaction: {
    overview: string;
    positiveFactors: string[];
    neutralFactors: string[];
    negativeFactors: string[];
  };
  priceImpact: {
    overview: string;
    expectedChange: {
      shortTerm: string;
      mediumTerm: string;
      longTerm: string;
    };
    relatedSectors: Array<{
      sector: string;
      impact: string;
    }>;
    investmentPoint: string;
  };
  competitorAnalysis: {
    overview: string;
    competitors: Array<{
      name: string;
      analysis: string[];
    }>;
    marketOutlook: string;
  };
  riskFactors: {
    overview: string;
    technical: string[];
    regulatory: string[];
    market: string[];
    mitigation: string;
  };
  investmentRecommendation: {
    recommendation: string;
    targetPrices: {
      shortTerm: string;
      mediumTerm: string;
      longTerm: string;
    };
    reasons: string[];
    monitoringPoints: string[];
    riskWarning: string;
  };
  conclusion: {
    summary: string[];
    finalOpinion: string;
    longTermPerspective: string;
  };
}

export default function NewsReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const id = params.id as string; // This should be a stock symbol (e.g., AAPL)

  const [reportData, setReportData] = useState<NewsReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.getNewsReport(id.toUpperCase());
        // report_data 필드에서 실제 레포트 데이터 추출
        const data = response.report_data || response;
        setReportData(data);
      } catch (err: unknown) {
        console.error('Failed to fetch news report:', err);
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || '레포트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id]);

  const generatePDF = async () => {
    if (!reportRef.current) return;

    setIsGeneratingPDF(true);
    try {
      // Dynamic imports for heavy libraries
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`news-report-${id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">AI가 뉴스를 분석하여 레포트를 생성하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    const is404 = error?.includes('유효한 레포트가 없습니다') || error?.includes('404');

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600 text-center max-w-md">
            {error || '레포트를 불러올 수 없습니다.'}
          </p>
          {is404 && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              뉴스 분석 페이지에서 &quot;관련 뉴스 AI 종합 분석&quot; 버튼을 클릭하여 레포트를 생성해주세요.
            </p>
          )}
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
        <Button onClick={generatePDF} disabled={isGeneratingPDF} className="flex items-center gap-2">
          {isGeneratingPDF ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isGeneratingPDF ? 'PDF 생성 중...' : 'PDF로 다운로드'}
        </Button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 bg-background p-6">
        {/* Report Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{reportData.title}</CardTitle>
            <CardDescription className="mt-2">
              <span>{reportData.generatedAt}</span>
              <span className="mx-2">|</span>
              <span>분석 기간: {reportData.analysisPeriod}</span>
              <span className="mx-2">|</span>
              <span>분석 뉴스: {reportData.analyzedCount}개</span>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>감성 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              {reportData.analyzedCount}개의 뉴스를 분석했습니다
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">분석 뉴스</p>
                <p className="text-2xl font-bold">{reportData.analyzedCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">긍정</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportData.sentimentDistribution.positive}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">중립</p>
                <p className="text-2xl font-bold text-gray-600">
                  {reportData.sentimentDistribution.neutral}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">부정</p>
                <p className="text-2xl font-bold text-red-600">
                  {reportData.sentimentDistribution.negative}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle>핵심 요약 (Executive Summary)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {reportData.executiveSummary.overview}
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-2">주요 발견사항:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {reportData.executiveSummary.keyFindings.map((finding, idx) => (
                  <li key={idx}>{finding}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Market Reaction Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>1. 시장 반응 및 감성 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {reportData.marketReaction.overview}
            </p>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-2">주요 긍정 요인:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.marketReaction.positiveFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">중립적 평가:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.marketReaction.neutralFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">부정적 우려:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.marketReaction.negativeFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Impact Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>2. 주가 영향 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {reportData.priceImpact.overview}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-3">예상 주가 변동:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>단기(1-2주):</span>
                    <Badge variant="default">{reportData.priceImpact.expectedChange.shortTerm}</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>중기(1-3개월):</span>
                    <Badge variant="default">{reportData.priceImpact.expectedChange.mediumTerm}</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>장기(6개월 이상):</span>
                    <Badge variant="secondary">{reportData.priceImpact.expectedChange.longTerm}</Badge>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-3">관련 섹터 영향:</p>
                <ul className="space-y-2 text-sm">
                  {reportData.priceImpact.relatedSectors.map((sector, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Badge variant="outline">{sector.sector}</Badge>
                      <span className="text-muted-foreground">{sector.impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">투자 포인트:</p>
              <p className="text-sm text-muted-foreground">
                {reportData.priceImpact.investmentPoint}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Competitor Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>3. 경쟁사 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {reportData.competitorAnalysis.overview}
            </p>

            <div className="space-y-3">
              {reportData.competitorAnalysis.competitors.map((competitor, idx) => (
                <div key={idx} className="rounded-lg border p-4">
                  <p className="font-semibold text-sm mb-2">{competitor.name}:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {competitor.analysis.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">시장 전망:</p>
              <p className="text-sm text-muted-foreground">
                {reportData.competitorAnalysis.marketOutlook}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Risk Factors */}
        <Card>
          <CardHeader>
            <CardTitle>4. 리스크 요인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {reportData.riskFactors.overview}
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">기술적 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.riskFactors.technical.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">규제 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.riskFactors.regulatory.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">시장 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.riskFactors.market.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">대응 전략:</p>
              <p className="text-sm text-muted-foreground">
                {reportData.riskFactors.mitigation}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Investment Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle>5. 투자 권고</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              종합적인 분석 결과를 바탕으로 한 투자 권고 의견입니다.
            </p>

            <div className={`rounded-lg border p-4 ${
              reportData.investmentRecommendation.recommendation === 'BUY'
                ? 'border-green-200 bg-green-50'
                : reportData.investmentRecommendation.recommendation === 'SELL'
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">투자 의견:</p>
                <Badge className={
                  reportData.investmentRecommendation.recommendation === 'BUY'
                    ? 'bg-green-600'
                    : reportData.investmentRecommendation.recommendation === 'SELL'
                    ? 'bg-red-600'
                    : 'bg-gray-600'
                }>
                  {reportData.investmentRecommendation.recommendation === 'BUY' ? '매수 (BUY)' :
                   reportData.investmentRecommendation.recommendation === 'SELL' ? '매도 (SELL)' :
                   '보유 (HOLD)'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">목표주가:</p>
                  <p className="font-semibold">단기(3개월): {reportData.investmentRecommendation.targetPrices.shortTerm}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">&nbsp;</p>
                  <p className="font-semibold">중기(6개월): {reportData.investmentRecommendation.targetPrices.mediumTerm}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">&nbsp;</p>
                  <p className="font-semibold">장기(12개월): {reportData.investmentRecommendation.targetPrices.longTerm}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-2">투자 근거:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.investmentRecommendation.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">주요 모니터링 포인트:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {reportData.investmentRecommendation.monitoringPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="font-semibold text-sm mb-2 text-yellow-800">리스크:</p>
              <p className="text-sm text-yellow-700">
                {reportData.investmentRecommendation.riskWarning}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conclusion */}
        <Card>
          <CardHeader>
            <CardTitle>6. 결론</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-3">핵심 요약:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {reportData.conclusion.summary.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm">최종 의견:</p>
              <p className="text-sm text-muted-foreground">
                {reportData.conclusion.finalOpinion}
              </p>
              <p className="text-sm text-muted-foreground">
                {reportData.conclusion.longTermPerspective}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle>면책 조항 (Disclaimer)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              본 레포트는 AI 기반 뉴스 분석을 통해 자동 생성된 참고 자료입니다. 투자 권고나 종목 추천이 아니며,
              투자 결정에 대한 책임은 투자자 본인에게 있습니다. 본 레포트에 포함된 정보는 작성 시점 기준이며,
              시장 상황 변화에 따라 달라질 수 있습니다. 실제 투자 결정 시에는 전문가의 조언을 구하시기 바랍니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
