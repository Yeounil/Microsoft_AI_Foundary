"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewsReportProps {
  newsId: string;
}

// 임시 레포트 데이터
const mockReportData = {
  title: '애플 AI 기술 관련 뉴스 종합 분석 레포트',
  generatedAt: '2025년 1월 8일 16:30',
  period: '최근 7일',
  totalNewsAnalyzed: 20,
  mainStock: 'AAPL',
  overallSentiment: 'positive' as 'positive' | 'negative' | 'neutral',
  sentimentDistribution: {
    positive: 14,
    neutral: 4,
    negative: 2
  },
  executiveSummary: `최근 7일간 애플의 AI 기술 발표와 관련된 20개의 뉴스를 분석한 결과, 전반적으로 긍정적인 시장 반응을 확인할 수 있었습니다.

  주요 발견사항:
  • 70%의 뉴스가 긍정적인 톤을 보였으며, AI 기술 혁신에 대한 기대감이 높음
  • 반도체 및 AI 관련 기업들의 주가에 긍정적인 영향 예상
  • 경쟁사 대비 기술적 우위를 확보했다는 평가가 지배적
  • 단기적으로 주가 상승 모멘텀이 있을 것으로 전망`,

  sections: [
    {
      title: '1. 시장 반응 및 감성 분석',
      content: `분석 기간 동안 수집된 20개의 뉴스 기사를 감성 분석한 결과, 전체의 70%(14개)가 긍정적인 톤을 보였습니다. 이는 애플의 AI 기술 발표가 시장에서 호의적으로 받아들여지고 있음을 시사합니다.

주요 긍정 요인:
• 차세대 AI 프로세서의 성능 개선
• 실시간 번역 및 자연어 처리 기능의 혁신성
• 프라이버시 중심의 온디바이스 AI 접근방식
• 경쟁사 대비 에너지 효율성 우수

중립적 평가(20%, 4개):
• 기술의 실제 상용화 시기에 대한 불확실성
• 가격 정책에 대한 시장의 관망세
• 일부 기능의 점진적 출시 계획

부정적 우려(10%, 2개):
• 중국 시장에서의 규제 리스크
• 경쟁사들의 유사 기술 발표 가능성`
    },
    {
      title: '2. 주가 영향 분석',
      content: `애플(AAPL) 주가에 대한 영향을 분석한 결과, 단기적으로 긍정적인 모멘텀이 예상됩니다.

예상 주가 변동:
• 단기(1-2주): +3~5% 상승 예상
• 중기(1-3개월): +8~12% 상승 가능성
• 장기(6개월 이상): AI 생태계 구축 성공 여부에 따라 +15~25% 상승 잠재력

관련 섹터 영향:
• 반도체 업종: NVDA, AMD 등 AI 칩 제조사들의 수혜 예상
• 클라우드 서비스: AI 인프라 수요 증가로 MSFT, GOOGL 등도 수혜
• 소프트웨어: AI 개발 도구 및 플랫폼 기업들의 성장 기대

투자 포인트:
애플의 AI 기술 발표는 단순히 새로운 기능 추가가 아닌, 장기적인 생태계 전환의 시작점으로 평가됩니다. 온디바이스 AI는 프라이버시와 성능을 동시에 만족시키는 차별화 전략으로, 프리미엄 시장에서의 경쟁력 강화가 기대됩니다.`
    },
    {
      title: '3. 경쟁사 분석',
      content: `애플의 AI 기술 발표에 대한 경쟁사들의 대응과 시장 포지셔닝을 분석했습니다.

삼성전자:
• 갤럭시 AI 기능으로 선제 대응
• 구글과의 파트너십으로 AI 생태계 구축
• 중저가 시장까지 AI 기능 확대 전략

Google:
• Android 생태계 전반에 Gemini AI 통합
• 클라우드 기반 AI로 차별화
• 검색 및 광고 사업과의 시너지 활용

기타 중국 제조사들:
• 자체 AI 칩 개발에 투자 확대
• 가격 경쟁력으로 시장 점유율 확대
• 로컬 AI 모델 개발로 규제 대응

시장 전망:
AI 기능이 스마트폰 시장의 새로운 차별화 포인트로 부상하면서, 하드웨어와 소프트웨어의 통합 역량이 중요해질 것으로 예상됩니다. 애플은 자체 칩과 소프트웨어 생태계의 강점을 활용하여 프리미엄 시장에서의 입지를 더욱 공고히 할 것으로 전망됩니다.`
    },
    {
      title: '4. 리스크 요인',
      content: `AI 기술 도입과 관련된 잠재적 리스크 요인들을 분석했습니다.

기술적 리스크:
• AI 모델의 정확도 및 신뢰성 문제
• 배터리 소모 및 발열 문제
• 언어별 성능 편차

규제 리스크:
• EU의 AI 규제 강화 (AI Act)
• 중국의 데이터 현지화 요구사항
• 프라이버시 관련 규제 대응 비용

시장 리스크:
• 소비자의 AI 기능에 대한 실제 수요 불확실
• 프리미엄 가격에 대한 시장 저항
• 경쟁사의 유사 기능 출시로 인한 차별성 감소

대응 전략:
애플은 점진적 기능 출시와 베타 테스트를 통해 기술적 리스크를 최소화하고, 법무팀 확대로 규제 대응 역량을 강화하고 있습니다. 또한 개발자 생태계를 활용하여 다양한 사용 사례를 개발하고 있어, 시장 리스크에 대한 대응도 적절히 진행 중인 것으로 평가됩니다.`
    },
    {
      title: '5. 투자 권고',
      content: `종합적인 분석 결과를 바탕으로 한 투자 권고 의견입니다.

투자 의견: 매수 (BUY)

목표주가:
• 단기(3개월): $195 (+5%)
• 중기(6개월): $210 (+13%)
• 장기(12개월): $230 (+24%)

투자 근거:
1. AI 기술 혁신으로 제품 차별화 강화
2. 프리미엄 시장에서의 가격 결정력 유지
3. 서비스 매출 성장 가속화 기대
4. 강력한 현금흐름 및 재무 건전성

주요 모니터링 포인트:
• 차기 아이폰 사전예약 및 초기 판매 실적
• AI 기능 사용률 및 사용자 만족도
• 경쟁사의 대응 전략
• 반도체 공급망 안정성

리스크:
본 투자 권고는 AI 기술의 성공적인 상용화를 전제로 하며, 기술적 문제 발생, 규제 강화, 거시경제 악화 등의 요인으로 인해 실제 결과는 예상과 다를 수 있습니다.`
    },
    {
      title: '6. 결론',
      content: `애플의 AI 기술 발표는 스마트폰 시장의 새로운 전환점이 될 것으로 평가됩니다.

핵심 요약:
• 시장의 긍정적 반응과 기대감이 높음
• 단기 및 중장기적으로 주가 상승 모멘텀 존재
• 프리미엄 시장에서의 경쟁력 강화 기대
• 일부 리스크 요인에 대한 모니터링 필요

최종 의견:
현재의 긍정적인 시장 분위기와 애플의 기술 역량을 고려할 때, AI 기능은 차기 아이폰의 주요 판매 동력이 될 것으로 전망됩니다. 다만 기술의 실제 성능과 사용자 수용도에 대한 지속적인 관찰이 필요하며, 경쟁사들의 대응 전략도 주의 깊게 살펴봐야 합니다.

투자자들은 단기 변동성에 주목하기보다는 AI 생태계 구축이라는 장기적 관점에서 접근하는 것이 바람직합니다.`
    }
  ]
};

export function NewsReport({ newsId }: NewsReportProps) {
  const router = useRouter();
  const [reportData, setReportData] = useState(mockReportData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // TODO: API에서 레포트 데이터 가져오기
    // const fetchReport = async () => {
    //   setIsLoading(true);
    //   const data = await newsAPI.generateReport(newsId);
    //   setReportData(data);
    //   setIsLoading(false);
    // };
    // fetchReport();
  }, [newsId]);

  const handleDownload = () => {
    // TODO: PDF 다운로드 기능 구현
    alert('PDF 다운로드 기능은 곧 제공될 예정입니다.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">AI 레포트 생성 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="container mx-auto px-6 py-4 max-w-[1200px]">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로 가기
            </Button>

            <Button
              onClick={handleDownload}
              className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Download className="h-4 w-4" />
              PDF 다운로드
            </Button>
          </div>
        </div>
      </div>

      {/* 레포트 내용 */}
      <div className="container mx-auto px-6 py-8 max-w-[1200px]">
        <div className="space-y-6">
          {/* 레포트 헤더 */}
          <Card className="p-8 bg-white">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {reportData.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{reportData.generatedAt}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span>분석 기간: {reportData.period}</span>
                    <span className="text-gray-300">|</span>
                    <span>분석 뉴스: {reportData.totalNewsAnalyzed}개</span>
                  </div>
                </div>
              </div>

              {/* 통계 요약 */}
              <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{reportData.totalNewsAnalyzed}</div>
                  <div className="text-sm text-gray-600 mt-1">분석 뉴스</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{reportData.sentimentDistribution.positive}</div>
                  <div className="text-sm text-gray-600 mt-1">긍정</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{reportData.sentimentDistribution.neutral}</div>
                  <div className="text-sm text-gray-600 mt-1">중립</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{reportData.sentimentDistribution.negative}</div>
                  <div className="text-sm text-gray-600 mt-1">부정</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Executive Summary */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-blue-900">핵심 요약 (Executive Summary)</h2>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">
                {reportData.executiveSummary}
              </p>
            </div>
          </Card>

          {/* 상세 섹션들 */}
          {reportData.sections.map((section, index) => (
            <Card key={index} className="p-6 bg-white">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {section.title}
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {/* 면책 조항 */}
          <Card className="p-6 bg-gray-50 border-gray-300">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900">면책 조항 (Disclaimer)</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                본 레포트는 AI 기반 뉴스 분석을 통해 자동 생성된 참고 자료입니다. 투자 권고나 종목 추천이 아니며,
                투자 결정에 대한 책임은 투자자 본인에게 있습니다. 본 레포트에 포함된 정보는 작성 시점 기준이며,
                시장 상황 변화에 따라 달라질 수 있습니다. 실제 투자 결정 시에는 전문가의 조언을 구하시기 바랍니다.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
