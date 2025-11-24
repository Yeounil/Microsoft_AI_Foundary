'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReportDetail } from '@/features/reports/hooks/useReportDetail';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import apiClient from '@/lib/api-client';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = Number(params.id);

  const { data: report, isLoading, error } = useReportDetail(reportId);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const generatePDF = async () => {
    if (!report || !reportData) return;

    setIsGeneratingPDF(true);
    try {
      console.log('백엔드에서 PDF 생성 중...');

      // 리포트 전체 데이터를 뉴스 데이터 형태로 변환 (모든 섹션 포함)
      const newsData = [
        {
          title: reportData.title || `${report.symbol} 뉴스 종합 분석 레포트`,
          source: 'AI Analysis',
          published_date: formatDate(report.created_at),
          sentiment: reportData.investmentRecommendation?.recommendation === 'BUY' ? 'positive' :
                     reportData.investmentRecommendation?.recommendation === 'SELL' ? 'negative' : 'neutral',
          content: `
## 감성 분석
- 긍정: ${reportData.sentimentDistribution?.positive || 0}개
- 중립: ${reportData.sentimentDistribution?.neutral || 0}개
- 부정: ${reportData.sentimentDistribution?.negative || 0}개

## 핵심 요약
${reportData.executiveSummary?.overview || ''}

주요 발견사항:
${reportData.executiveSummary?.keyFindings?.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n') || ''}

## 시장 반응
${reportData.marketReaction?.overview || ''}

긍정 요인:
${reportData.marketReaction?.positiveFactors?.map((f: string, i: number) => `- ${f}`).join('\n') || ''}

중립 요인:
${reportData.marketReaction?.neutralFactors?.map((f: string, i: number) => `- ${f}`).join('\n') || ''}

부정 요인:
${reportData.marketReaction?.negativeFactors?.map((f: string, i: number) => `- ${f}`).join('\n') || ''}

## 주가 영향 분석
${reportData.priceImpact?.overview || ''}

예상 주가 변동:
- 단기(1-2주): ${reportData.priceImpact?.expectedChange?.shortTerm || ''}
- 중기(1-3개월): ${reportData.priceImpact?.expectedChange?.mediumTerm || ''}
- 장기(6개월 이상): ${reportData.priceImpact?.expectedChange?.longTerm || ''}

관련 섹터 영향:
${reportData.priceImpact?.relatedSectors?.map((s: any) => `- ${s.sector}: ${s.impact}`).join('\n') || ''}

투자 포인트:
${reportData.priceImpact?.investmentPoint || ''}

## 경쟁사 분석
${reportData.competitorAnalysis?.overview || ''}

경쟁사 현황:
${reportData.competitorAnalysis?.competitors?.map((c: any) => `
${c.name}:
${c.analysis?.map((a: string) => `- ${a}`).join('\n') || ''}
`).join('\n') || ''}

시장 전망:
${reportData.competitorAnalysis?.marketOutlook || ''}

## 리스크 요인
${reportData.riskFactors?.overview || ''}

기술적 리스크:
${reportData.riskFactors?.technical?.map((r: string) => `- ${r}`).join('\n') || ''}

규제 리스크:
${reportData.riskFactors?.regulatory?.map((r: string) => `- ${r}`).join('\n') || ''}

시장 리스크:
${reportData.riskFactors?.market?.map((r: string) => `- ${r}`).join('\n') || ''}

대응 전략:
${reportData.riskFactors?.mitigation || ''}

## 투자 권고
추천: ${reportData.investmentRecommendation?.recommendation || 'HOLD'}

목표주가:
- 단기(3개월): ${reportData.investmentRecommendation?.targetPrices?.shortTerm || ''}
- 중기(6개월): ${reportData.investmentRecommendation?.targetPrices?.mediumTerm || ''}
- 장기(12개월): ${reportData.investmentRecommendation?.targetPrices?.longTerm || ''}

투자 근거:
${reportData.investmentRecommendation?.reasons?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') || ''}

모니터링 포인트:
${reportData.investmentRecommendation?.monitoringPoints?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') || ''}

리스크:
${reportData.investmentRecommendation?.riskWarning || ''}

## 결론
핵심 요약:
${reportData.conclusion?.summary?.map((s: string) => `- ${s}`).join('\n') || ''}

최종 의견:
${reportData.conclusion?.finalOpinion || ''}

${reportData.conclusion?.longTermPerspective || ''}
          `.trim()
        }
      ];

      // 백엔드 API 호출 - Playwright 기반 PDF 생성
      const response = await apiClient.generateNewsReportPDF(
        report.symbol.toUpperCase(),
        newsData,
        reportData.executiveSummary?.overview || '종합 분석 리포트'
      );

      if (response.file_url) {
        // 백엔드에서 생성된 PDF URL로 다운로드
        console.log('서버 PDF 생성 완료:', response.file_url);
        window.open(response.file_url, '_blank');
      } else {
        throw new Error('PDF URL을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      alert('PDF 생성에 실패했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">AI가 생성한 분석 보고서를 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !report) {
    const is404 = error?.toString().includes('404');

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-red-600 text-center max-w-md">
            {error?.toString() || '보고서를 불러올 수 없습니다.'}
          </p>
          {is404 && (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              프로필 페이지에서 새로운 보고서를 생성해주세요.
            </p>
          )}
          <Button onClick={() => router.push('/profile')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const reportData = report.report_data;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 border-b pb-3 sm:pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/profile')}
          className="flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </Button>
        <Button
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
        >
          {isGeneratingPDF ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isGeneratingPDF ? 'PDF 생성 중...' : 'PDF로 다운로드'}
        </Button>
      </div>

      {/* Report Content */}
      <div className="space-y-4 sm:space-y-6 bg-background p-2 sm:p-6">
        {/* Report Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {reportData.title || `${report.symbol} 뉴스 종합 분석 레포트`}
            </CardTitle>
            <CardDescription className="mt-2">
              <span>{formatDate(report.created_at)}</span>
              <span className="mx-2">|</span>
              <span>분석 뉴스: {report.analyzed_count}개</span>
              {!report.is_expired && (
                <>
                  <span className="mx-2">|</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    유효
                  </Badge>
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Sentiment Analysis */}
        {reportData.sentimentDistribution && (
          <Card>
            <CardHeader>
              <CardTitle>감성 분석 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 sm:mb-4 text-sm sm:text-base md:text-sm text-muted-foreground">
                {report.analyzed_count}개의 뉴스를 분석했습니다
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:grid-cols-4">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-muted/50">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">전체</p>
                  <p className="text-2xl sm:text-3xl md:text-2xl font-bold">{report.analyzed_count}</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">긍정</p>
                  <p className="text-2xl sm:text-3xl md:text-2xl font-bold text-green-600">
                    {reportData.sentimentDistribution.positive || 0}
                  </p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-muted/50">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">중립</p>
                  <p className="text-2xl sm:text-3xl md:text-2xl font-bold text-gray-600">
                    {reportData.sentimentDistribution.neutral || 0}
                  </p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">부정</p>
                  <p className="text-2xl sm:text-3xl md:text-2xl font-bold text-red-600">
                    {reportData.sentimentDistribution.negative || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Summary */}
        {reportData.executiveSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">핵심 요약 (Executive Summary)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.executiveSummary.overview && (
                <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                  {reportData.executiveSummary.overview}
                </p>
              )}
              {reportData.executiveSummary.keyFindings && reportData.executiveSummary.keyFindings.length > 0 && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="font-semibold mb-2 text-sm sm:text-base md:text-sm">주요 발견사항:</p>
                  <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm">
                    {reportData.executiveSummary.keyFindings.map((finding: string, idx: number) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Market Reaction Analysis */}
        {reportData.marketReaction && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">1. 시장 반응 및 감성 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.marketReaction.overview && (
                <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                  {reportData.marketReaction.overview}
                </p>
              )}

              <div className="space-y-3">
                {reportData.marketReaction.positiveFactors && reportData.marketReaction.positiveFactors.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">주요 긍정 요인:</p>
                    <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.marketReaction.positiveFactors.map((factor: string, idx: number) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reportData.marketReaction.neutralFactors && reportData.marketReaction.neutralFactors.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">중립적 평가:</p>
                    <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.marketReaction.neutralFactors.map((factor: string, idx: number) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reportData.marketReaction.negativeFactors && reportData.marketReaction.negativeFactors.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">부정적 우려:</p>
                    <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.marketReaction.negativeFactors.map((factor: string, idx: number) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Impact Analysis */}
        {reportData.priceImpact && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">2. 주가 영향 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.priceImpact.overview && (
                <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                  {reportData.priceImpact.overview}
                </p>
              )}

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {reportData.priceImpact.expectedChange && (
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2 sm:mb-3">예상 주가 변동:</p>
                    <div className="space-y-2 sm:space-y-3">
                      {reportData.priceImpact.expectedChange.shortTerm && (
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm text-muted-foreground">단기(1-2주)</p>
                          <p className={`text-sm sm:text-base md:text-sm font-medium leading-relaxed ${
                            reportData.priceImpact.expectedChange.shortTerm.startsWith('부정적')
                              ? 'text-red-600 dark:text-red-400'
                              : reportData.priceImpact.expectedChange.shortTerm.startsWith('긍정적')
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                          }`}>
                            {reportData.priceImpact.expectedChange.shortTerm}
                          </p>
                        </div>
                      )}
                      {reportData.priceImpact.expectedChange.mediumTerm && (
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm text-muted-foreground">중기(1-3개월)</p>
                          <p className={`text-sm sm:text-base md:text-sm font-medium leading-relaxed ${
                            reportData.priceImpact.expectedChange.mediumTerm.startsWith('부정적')
                              ? 'text-red-600 dark:text-red-400'
                              : reportData.priceImpact.expectedChange.mediumTerm.startsWith('긍정적')
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                          }`}>
                            {reportData.priceImpact.expectedChange.mediumTerm}
                          </p>
                        </div>
                      )}
                      {reportData.priceImpact.expectedChange.longTerm && (
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm text-muted-foreground">장기(6개월 이상)</p>
                          <p className={`text-sm sm:text-base md:text-sm font-medium leading-relaxed ${
                            reportData.priceImpact.expectedChange.longTerm.startsWith('부정적')
                              ? 'text-red-600 dark:text-red-400'
                              : reportData.priceImpact.expectedChange.longTerm.startsWith('긍정적')
                              ? 'text-green-600 dark:text-green-400'
                              : ''
                          }`}>
                            {reportData.priceImpact.expectedChange.longTerm}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {reportData.priceImpact.relatedSectors && reportData.priceImpact.relatedSectors.length > 0 && (
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2 sm:mb-3">관련 섹터 영향:</p>
                    <ul className="space-y-2 text-sm sm:text-base md:text-sm">
                      {reportData.priceImpact.relatedSectors.map((sector: { sector: string; impact: string }, idx: number) => (
                        <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <Badge variant="outline" className="w-fit">{sector.sector}</Badge>
                          <span className="text-muted-foreground text-xs sm:text-sm">{sector.impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {reportData.priceImpact.investmentPoint && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">투자 포인트:</p>
                  <p className="text-base sm:text-lg md:text-sm text-muted-foreground">
                    {reportData.priceImpact.investmentPoint}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Competitor Analysis */}
        {reportData.competitorAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">3. 경쟁사 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.competitorAnalysis.overview && (
                <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                  {reportData.competitorAnalysis.overview}
                </p>
              )}

              {reportData.competitorAnalysis.competitors && reportData.competitorAnalysis.competitors.length > 0 && (
                <div className="space-y-3">
                  {reportData.competitorAnalysis.competitors.map((competitor: { name: string; analysis: string[] }, idx: number) => (
                    <div key={idx} className="rounded-lg border p-3 sm:p-4">
                      <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">{competitor.name}:</p>
                      <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                        {competitor.analysis.map((item: string, itemIdx: number) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {reportData.competitorAnalysis.marketOutlook && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">시장 전망:</p>
                  <p className="text-base sm:text-lg md:text-sm text-muted-foreground">
                    {reportData.competitorAnalysis.marketOutlook}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risk Factors */}
        {reportData.riskFactors && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">4. 리스크 요인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.riskFactors.overview && (
                <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                  {reportData.riskFactors.overview}
                </p>
              )}

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                {reportData.riskFactors.technical && reportData.riskFactors.technical.length > 0 && (
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">기술적 리스크:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base md:text-sm text-muted-foreground">
                      {reportData.riskFactors.technical.map((risk: string, idx: number) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reportData.riskFactors.regulatory && reportData.riskFactors.regulatory.length > 0 && (
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">규제 리스크:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base md:text-sm text-muted-foreground">
                      {reportData.riskFactors.regulatory.map((risk: string, idx: number) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reportData.riskFactors.market && reportData.riskFactors.market.length > 0 && (
                  <div className="rounded-lg border p-3 sm:p-4">
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">시장 리스크:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base md:text-sm text-muted-foreground">
                      {reportData.riskFactors.market.map((risk: string, idx: number) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {reportData.riskFactors.mitigation && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">대응 전략:</p>
                  <p className="text-base sm:text-lg md:text-sm text-muted-foreground">
                    {reportData.riskFactors.mitigation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Investment Recommendation */}
        {reportData.investmentRecommendation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">5. 투자 권고</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <p className="text-base sm:text-lg md:text-sm leading-relaxed">
                종합적인 분석 결과를 바탕으로 한 투자 권고 의견입니다.
              </p>

              <div className={`rounded-lg border p-3 sm:p-4 ${
                reportData.investmentRecommendation.recommendation === 'BUY'
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                  : reportData.investmentRecommendation.recommendation === 'SELL'
                  ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
              }`}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <p className="font-semibold text-sm sm:text-base md:text-sm">투자 의견:</p>
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

                {reportData.investmentRecommendation.targetPrices && (
                  <div className="grid gap-2 sm:gap-3 sm:grid-cols-3 text-sm sm:text-base md:text-sm">
                    {reportData.investmentRecommendation.targetPrices.shortTerm && (
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">목표주가:</p>
                        <p className="font-semibold text-sm sm:text-base md:text-sm">단기(3개월): {reportData.investmentRecommendation.targetPrices.shortTerm}</p>
                      </div>
                    )}
                    {reportData.investmentRecommendation.targetPrices.mediumTerm && (
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">&nbsp;</p>
                        <p className="font-semibold text-sm sm:text-base md:text-sm">중기(6개월): {reportData.investmentRecommendation.targetPrices.mediumTerm}</p>
                      </div>
                    )}
                    {reportData.investmentRecommendation.targetPrices.longTerm && (
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">&nbsp;</p>
                        <p className="font-semibold text-sm sm:text-base md:text-sm">장기(12개월): {reportData.investmentRecommendation.targetPrices.longTerm}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {reportData.investmentRecommendation.reasons && reportData.investmentRecommendation.reasons.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">투자 근거:</p>
                    <ol className="list-decimal list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.investmentRecommendation.reasons.map((reason: string, idx: number) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {reportData.investmentRecommendation.monitoringPoints && reportData.investmentRecommendation.monitoringPoints.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm sm:text-base md:text-sm mb-2">주요 모니터링 포인트:</p>
                    <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.investmentRecommendation.monitoringPoints.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {reportData.investmentRecommendation.riskWarning && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 sm:p-4 dark:bg-yellow-950/20 dark:border-yellow-900">
                  <p className="font-semibold text-sm sm:text-base md:text-sm mb-2 text-yellow-800 dark:text-yellow-400">리스크:</p>
                  <p className="text-base sm:text-lg md:text-sm text-yellow-700 dark:text-yellow-300">
                    {reportData.investmentRecommendation.riskWarning}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conclusion */}
        {reportData.conclusion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">6. 결론</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reportData.conclusion.summary && reportData.conclusion.summary.length > 0 && (
                <div className="rounded-lg bg-muted p-3 sm:p-4">
                  <p className="font-semibold text-sm sm:text-base md:text-sm mb-2 sm:mb-3">핵심 요약:</p>
                  <ul className="list-disc list-inside space-y-1 text-base sm:text-lg md:text-sm text-muted-foreground">
                    {reportData.conclusion.summary.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {reportData.conclusion.finalOpinion && (
                  <>
                    <p className="font-semibold text-sm sm:text-base md:text-sm">최종 의견:</p>
                    <p className="text-base sm:text-lg md:text-sm text-muted-foreground">
                      {reportData.conclusion.finalOpinion}
                    </p>
                  </>
                )}
                {reportData.conclusion.longTermPerspective && (
                  <p className="text-base sm:text-lg md:text-sm text-muted-foreground">
                    {reportData.conclusion.longTermPerspective}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Card>
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-1 sm:pb-2">
            <CardTitle className="text-lg sm:text-xl">면책 조항 (Disclaimer)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-2 sm:pt-3 pb-4 sm:pb-6">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
