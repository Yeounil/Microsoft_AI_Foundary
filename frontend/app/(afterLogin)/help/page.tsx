"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  HelpCircle,
  FileText,
  TrendingUp,
  Bell,
  Search,
  Star,
  BarChart2,
  Moon,
  Download,
} from "lucide-react";

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("guide");

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">도움말</h1>
        <p className="text-muted-foreground">
          AI Finance Analysis 사용 가이드 및 자주 묻는 질문
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">사용 가이드</span>
            <span className="sm:hidden">가이드</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="release" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">릴리즈 노트</span>
            <span className="sm:hidden">노트</span>
          </TabsTrigger>
        </TabsList>

        {/* 사용 가이드 */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                실시간 차트 보기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 홈 화면에서 관심있는 종목을 검색하거나 클릭하세요.
              </p>
              <p>
                2. 대시보드에서 실시간 차트를 확인할 수 있습니다.
              </p>
              <p>
                3. <strong>Basic 모드</strong>: 간단한 시간대별 차트 (1D, 1W, 1M 등)
              </p>
              <p>
                4. <strong>Enhanced 모드</strong>: 분봉, 일봉, 주봉, 월봉 상세 차트
              </p>
              <p>
                5. 캔들차트/라인차트 간 전환이 가능합니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                관심 종목 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 대시보드에서 ⭐ 버튼을 클릭하여 관심 종목에 추가하세요.
              </p>
              <p>
                2. 관심종목 페이지에서 모아볼 수 있습니다.
              </p>
              <p>
                3. 관심 종목의 실시간 가격 변동을 한눈에 확인하세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                검색 기능
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 상단 검색창에서 종목 코드 또는 회사명을 검색하세요.
              </p>
              <p>
                2. 검색 필터를 사용하여 종목/뉴스/카테고리로 분류할 수 있습니다.
              </p>
              <p>
                3. 검색 히스토리가 자동으로 저장됩니다.
              </p>
              <p>
                4. 키보드 방향키로 결과를 탐색하고 Enter로 선택하세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                알림 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 설정 페이지에서 알림을 구성할 수 있습니다.
              </p>
              <p>
                2. <strong>가격 알림</strong>: 목표가 도달 시 알림
              </p>
              <p>
                3. <strong>뉴스 알림</strong>: 관심 종목 관련 뉴스 알림
              </p>
              <p>
                4. <strong>시장 알림</strong>: 주요 시장 이벤트 알림
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                AI 분석 기능
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 대시보드의 분석 섹션에서 AI 분석 결과를 확인하세요.
              </p>
              <p>
                2. 리스크 분석, 투자 의견, 주요 지표를 제공합니다.
              </p>
              <p>
                3. 뉴스 기사의 AI 요약을 활용하세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                다크 모드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 헤더의 테마 토글 버튼을 클릭하세요.
              </p>
              <p>
                2. 라이트/다크/시스템 모드를 선택할 수 있습니다.
              </p>
              <p>
                3. 설정은 자동으로 저장됩니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                차트 저장
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                1. 대시보드에서 &quot;차트 저장&quot; 버튼을 클릭하세요.
              </p>
              <p>
                2. 현재 차트가 PNG 이미지로 다운로드됩니다.
              </p>
              <p>
                3. 파일명에 종목 코드와 날짜가 포함됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>자주 묻는 질문</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    실시간 데이터는 얼마나 빠르게 업데이트되나요?
                  </AccordionTrigger>
                  <AccordionContent>
                    WebSocket을 통해 1초 단위로 실시간 가격 데이터가 업데이트됩니다.
                    네트워크 상태에 따라 약간의 지연이 있을 수 있습니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    관심 종목은 몇 개까지 등록할 수 있나요?
                  </AccordionTrigger>
                  <AccordionContent>
                    현재 관심 종목 등록 개수에 제한은 없습니다. 다만, 너무 많은
                    종목을 등록하면 실시간 데이터 로딩에 시간이 걸릴 수 있습니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    차트 데이터는 어디서 제공되나요?
                  </AccordionTrigger>
                  <AccordionContent>
                    차트 데이터는 해당 종목의 5개년 치 데이터가 제공됩니다.
                    실시간 데이터는 별도의 WebSocket 서버를 통해 제공됩니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    AI 분석은 어떤 기준으로 이루어지나요?
                  </AccordionTrigger>
                  <AccordionContent>
                    AI 분석은 기술적 지표, 뉴스 감성 분석, 재무 데이터 등을
                    종합적으로 분석하여 제공됩니다. 투자 결정의 참고용으로만
                    사용하시기 바랍니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    모바일에서도 사용할 수 있나요?
                  </AccordionTrigger>
                  <AccordionContent>
                    네, 반응형 디자인으로 모바일 브라우저에서도 최적화된
                    환경에서 사용할 수 있습니다. 하단 네비게이션을 통해
                    쉽게 이동할 수 있습니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>
                    데이터가 로딩되지 않아요.
                  </AccordionTrigger>
                  <AccordionContent>
                    인터넷 연결을 확인해주세요. 문제가 지속되면 페이지를
                    새로고침하거나 로그아웃 후 다시 로그인해보세요.
                    WebSocket 연결 상태는 화면 상단에서 확인할 수 있습니다.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger>
                    비밀번호를 잊어버렸어요.
                  </AccordionTrigger>
                  <AccordionContent>
                    로그인 페이지에서 &quot;비밀번호 찾기&quot; 링크를 클릭하세요.
                    등록된 이메일로 비밀번호 재설정 링크가 발송됩니다.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 릴리즈 노트 */}
        <TabsContent value="release" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>v1.2.0 (2024-11-19)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">새로운 기능</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>검색 필터 기능 추가 (종목/뉴스/카테고리)</li>
                  <li>종목 비교 차트 기능 추가</li>
                  <li>에러 메시지 애니메이션 개선</li>
                  <li>폼 에러 요약 컴포넌트 추가</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">개선 사항</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>모바일 대시보드 UI 최적화</li>
                  <li>차트 높이 반응형 처리</li>
                  <li>폰트 로딩 최적화 (서브셋 적용)</li>
                  <li>테스트 커버리지 향상</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>v1.1.0 (2024-11-18)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">새로운 기능</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>다크 모드 지원</li>
                  <li>알림 설정 페이지</li>
                  <li>차트 이미지 다운로드</li>
                  <li>검색 자동완성 및 히스토리</li>
                  <li>가상 스크롤 구현</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">개선 사항</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>스켈레톤 로딩 컴포넌트</li>
                  <li>페이지 전환 애니메이션</li>
                  <li>실시간 폼 유효성 검증</li>
                  <li>접근성(a11y) 개선</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>v1.0.0 (2024-11-15)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">초기 릴리즈</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>실시간 주식 차트</li>
                  <li>관심 종목 관리</li>
                  <li>뉴스 피드 및 AI 요약</li>
                  <li>AI 기반 투자 분석</li>
                  <li>반응형 UI</li>
                  <li>회원가입/로그인 기능</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
