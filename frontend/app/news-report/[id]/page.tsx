'use client';

import { useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function NewsReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const id = params.id as string;

  // Mock data for news report
  const reportData = {
    title: '애플 AI 기술 관련 뉴스 종합 분석 레포트',
    generatedAt: '2025년 1월 8일 16:30',
    analysisPeriod: '최근 7일',
    analyzedCount: 20,
    sentimentDistribution: {
      positive: 14,
      neutral: 4,
      negative: 2,
    },
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;

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
  };

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
        <Button onClick={generatePDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          PDF로 다운로드
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
              {reportData.analyzedCount}개의 뉴스를 분석하고
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
              최근 7일간 애플의 AI 기술 발표와 관련된 20개의 뉴스를 분석한 결과, 전반적으로 긍정적인 시장 반응을 확인할 수 있었습니다.
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold mb-2">주요 발견사항:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>70%의 뉴스가 긍정적인 톤을 보였으며, AI 기술 혁신에 대한 기대감이 높음</li>
                <li>반도체 및 AI 관련 기업들의 주가에 긍정적인 영향 예상</li>
                <li>경쟁사 대비 기술적 우위를 확보했다는 평가가 지배적</li>
                <li>단기적으로 주가 상승 모멘텀이 있을 것으로 전망</li>
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
              분석 기간 동안 수집된 20개의 뉴스 기사를 감성 분석한 결과, 전체의 70%(14개)가 긍정적인 톤을 보였습니다.
              이는 애플의 AI 기술 발표가 시장에서 호의적으로 받아들여지고 있음을 시사합니다.
            </p>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-2">주요 긍정 요인:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>차세대 AI 프로세서의 성능 개선</li>
                  <li>실시간 번역 및 자연어 처리 기능의 혁신성</li>
                  <li>프라이버시 중심의 온디바이스 AI 접근방식</li>
                  <li>경쟁사 대비 에너지 효율성 우수</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">중립적 평가(20%, 4개):</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>기술의 실제 상용화 시기에 대한 불확실성</li>
                  <li>가격 정책에 대한 시장의 관망세</li>
                  <li>일부 기능의 점진적 출시 계획</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">부정적 우려(10%, 2개):</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>중국 시장에서의 규제 리스크</li>
                  <li>경쟁사들의 유사 기술 발표 가능성</li>
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
              애플(AAPL) 주가에 대한 영향을 분석한 결과, 단기적으로 긍정적인 모멘텀이 예상됩니다.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-3">예상 주가 변동:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>단기(1-2주):</span>
                    <Badge variant="default">+3~5% 상승 예상</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>중기(1-3개월):</span>
                    <Badge variant="default">+8~12% 상승 가능성</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>장기(6개월 이상):</span>
                    <Badge variant="secondary">+15~25% 상승 잠재력</Badge>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-3">관련 섹터 영향:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">반도체</Badge>
                    <span className="text-muted-foreground">NVDA, AMD 수혜 예상</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">클라우드</Badge>
                    <span className="text-muted-foreground">MSFT, GOOGL 수혜</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">소프트웨어</Badge>
                    <span className="text-muted-foreground">AI 플랫폼 성장 기대</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">투자 포인트:</p>
              <p className="text-sm text-muted-foreground">
                애플의 AI 기술 발표는 단순히 새로운 기능 추가가 아닌, 장기적인 생태계 전환의 시작점으로 평가됩니다.
                온디바이스 AI는 프라이버시와 성능을 동시에 만족시키는 차별화 전략으로, 프리미엄 시장에서의 경쟁력 강화가 기대됩니다.
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
              애플의 AI 기술 발표에 대한 경쟁사들의 대응과 시장 포지셔닝을 분석했습니다.
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">삼성전자:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>갤럭시 AI 기능으로 선제 대응</li>
                  <li>구글과의 파트너십으로 AI 생태계 구축</li>
                  <li>중저가 시장까지 AI 기능 확대 전략</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">Google:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Android 생태계 전반에 Gemini AI 통합</li>
                  <li>클라우드 기반 AI로 차별화</li>
                  <li>검색 및 광고 사업과의 시너지 활용</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">기타 중국 제조사들:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>자체 AI 칩 개발에 투자 확대</li>
                  <li>가격 경쟁력으로 시장 점유율 확대</li>
                  <li>로컬 AI 모델 개발로 규제 대응</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">시장 전망:</p>
              <p className="text-sm text-muted-foreground">
                AI 기능이 스마트폰 시장의 새로운 차별화 포인트로 부상하면서, 하드웨어와 소프트웨어의 통합 역량이 중요해질 것으로 예상됩니다.
                애플은 자체 칩과 소프트웨어 생태계의 강점을 활용하여 프리미엄 시장에서의 입지를 더욱 공고히 할 것으로 전망됩니다.
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
              AI 기술 도입과 관련된 잠재적 리스크 요인들을 분석했습니다.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">기술적 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>AI 모델의 정확도 및 신뢰성 문제</li>
                  <li>배터리 소모 및 발열 문제</li>
                  <li>언어별 성능 편차</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">규제 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>EU의 AI 규제 강화 (AI Act)</li>
                  <li>중국의 데이터 현지화 요구사항</li>
                  <li>프라이버시 관련 규제 대응 비용</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-2">시장 리스크:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>소비자의 AI 기능에 대한 실제 수요 불확실</li>
                  <li>프리미엄 가격에 대한 시장 저항</li>
                  <li>경쟁사의 유사 기능 출시로 인한 차별성 감소</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-2">대응 전략:</p>
              <p className="text-sm text-muted-foreground">
                애플은 점진적 기능 출시와 베타 테스트를 통해 기술적 리스크를 최소화하고, 법무팀 확대로 규제 대응 역량을 강화하고 있습니다.
                또한 개발자 생태계를 활용하여 다양한 사용 사례를 개발하고 있어, 시장 리스크에 대한 대응도 적절히 진행 중인 것으로 평가됩니다.
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

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">투자 의견:</p>
                <Badge className="bg-green-600">매수 (BUY)</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">목표주가:</p>
                  <p className="font-semibold">단기(3개월): $195 (+5%)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">&nbsp;</p>
                  <p className="font-semibold">중기(6개월): $210 (+13%)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">&nbsp;</p>
                  <p className="font-semibold">장기(12개월): $230 (+24%)</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-2">투자 근거:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>AI 기술 혁신으로 제품 차별화 강화</li>
                  <li>프리미엄 시장에서의 가격 결정력 유지</li>
                  <li>서비스 매출 성장 가속화 기대</li>
                  <li>강력한 현금흐름 및 재무 건전성</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">주요 모니터링 포인트:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>차기 아이폰 사전예약 및 초기 판매 실적</li>
                  <li>AI 기능 사용률 및 사용자 만족도</li>
                  <li>경쟁사의 대응 전략</li>
                  <li>반도체 공급망 안정성</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="font-semibold text-sm mb-2 text-yellow-800">리스크:</p>
              <p className="text-sm text-yellow-700">
                본 투자 권고는 AI 기술의 성공적인 상용화를 전제로 하며, 기술적 문제 발생, 규제 강화, 거시경제 악화 등의 요인으로 인해
                실제 결과는 예상과 다를 수 있습니다.
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
            <p className="text-sm leading-relaxed">
              애플의 AI 기술 발표는 스마트폰 시장의 새로운 전환점이 될 것으로 평가됩니다.
            </p>

            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold text-sm mb-3">핵심 요약:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>시장의 긍정적 반응과 기대감이 높음</li>
                <li>단기 및 중장기적으로 주가 상승 모멘텀 존재</li>
                <li>프리미엄 시장에서의 경쟁력 강화 기대</li>
                <li>일부 리스크 요인에 대한 모니터링 필요</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm">최종 의견:</p>
              <p className="text-sm text-muted-foreground">
                현재의 긍정적인 시장 분위기와 애플의 기술 역량을 고려할 때, AI 기능은 차기 아이폰의 주요 판매 동력이 될 것으로 전망됩니다.
                다만 기술의 실제 성능과 사용자 수용도에 대한 지속적인 관찰이 필요하며, 경쟁사들의 대응 전략도 주의 깊게 살펴봐야 합니다.
              </p>
              <p className="text-sm text-muted-foreground">
                투자자들은 단기 변동성에 주목하기보다는 AI 생태계 구축이라는 장기적 관점에서 접근하는 것이 바람직합니다.
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