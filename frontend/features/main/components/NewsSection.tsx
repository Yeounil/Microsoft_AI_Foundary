"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { NewsArticle } from "@/types";
// import { useAuthStore } from "@/store/auth-store";

// 더미 뉴스 데이터 (API 실패 시 사용)
const dummyNewsData: NewsArticle[] = [
  {
    title: "삼성전자, AI 반도체 시장 진출로 주가 상승 기대",
    content:
      "삼성전자가 차세대 AI 반도체 개발을 발표하며 시장의 주목을 받고 있습니다.",
    url: "dummy-1",
    source: "한국경제",
    published_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    sentiment: "positive",
    ai_score: 85,
    related_stocks: ["005930", "000660", "035720"],
  },
  {
    title: "미국 연준, 금리 인상 가능성 시사... 글로벌 증시 하락",
    content: "연준 의장의 매파적 발언으로 글로벌 증시가 일제히 하락했습니다.",
    url: "dummy-2",
    source: "로이터",
    published_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    sentiment: "negative",
    ai_score: 72,
    related_stocks: ["SPY", "QQQ", "DIA"],
  },
  {
    title: "현대차, 전기차 신모델 공개... 테슬라와 경쟁 본격화",
    content:
      "현대자동차가 새로운 전기차 라인업을 발표하며 글로벌 EV 시장 공략에 나섰습니다.",
    url: "dummy-3",
    source: "매일경제",
    published_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    sentiment: "positive",
    ai_score: 78,
    related_stocks: ["005380", "TSLA", "F"],
  },
  {
    title: "카카오뱅크, 3분기 실적 시장 예상치 상회",
    content:
      "카카오뱅크가 3분기 영업이익 500억원을 기록하며 시장 예상을 뛰어넘었습니다.",
    url: "dummy-4",
    source: "이데일리",
    published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    sentiment: "positive",
    ai_score: 82,
    related_stocks: ["323410", "035720", "086790"],
  },
  {
    title: "중국 경제 지표 부진... 아시아 증시 전반적 약세",
    content:
      "중국의 제조업 PMI가 예상치를 하회하며 아시아 증시가 하락세를 보였습니다.",
    url: "dummy-5",
    source: "블룸버그",
    published_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    sentiment: "negative",
    ai_score: 65,
    related_stocks: ["FXI", "EEM", "ASHR"],
  },
  {
    title: "LG에너지솔루션, 북미 배터리 공장 증설 발표",
    content: "LG에너지솔루션이 미국에 제2공장 건설 계획을 발표했습니다.",
    url: "dummy-6",
    source: "서울경제",
    published_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    sentiment: "positive",
    ai_score: 79,
    related_stocks: ["373220", "051910", "006400"],
  },
  {
    title: "국제유가 상승세... 에너지 관련주 주목",
    content:
      "OPEC+ 감산 연장 결정으로 국제유가가 상승하며 에너지주가 강세를 보이고 있습니다.",
    url: "dummy-7",
    source: "연합뉴스",
    published_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    sentiment: "neutral",
    ai_score: 70,
    related_stocks: ["XLE", "USO", "096770"],
  },
  {
    title: "네이버, AI 검색 서비스 베타 출시... 구글과 정면 승부",
    content:
      "네이버가 생성형 AI 기반 검색 서비스를 공개하며 글로벌 경쟁에 뛰어들었습니다.",
    url: "dummy-8",
    source: "한국일보",
    published_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    sentiment: "positive",
    ai_score: 76,
    related_stocks: ["035420", "GOOGL", "MSFT"],
  },
  {
    title: "SK하이닉스, HBM4 개발 소식에 주가 급등",
    content:
      "SK하이닉스가 차세대 고대역폭 메모리 HBM4 개발을 앞당긴다고 발표했습니다.",
    url: "dummy-9",
    source: "조선일보",
    published_at: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
    sentiment: "positive",
    ai_score: 88,
    related_stocks: ["000660", "NVDA", "AMD"],
  },
  {
    title: "코스피 2,500선 붕괴... 외국인 순매도 지속",
    content:
      "외국인 투자자들의 순매도가 이어지며 코스피가 2,500선 아래로 하락했습니다.",
    url: "dummy-10",
    source: "머니투데이",
    published_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    sentiment: "negative",
    ai_score: 60,
    related_stocks: ["069500", "005930", "000660"],
  },
  {
    title: "애플, 비전 프로 2세대 출시 예정... AR 시장 확대",
    content:
      "애플이 내년 상반기 비전 프로 2세대 출시를 준비 중인 것으로 알려졌습니다.",
    url: "dummy-11",
    source: "테크크런치",
    published_at: new Date(Date.now() - 1000 * 60 * 330).toISOString(),
    sentiment: "positive",
    ai_score: 74,
    related_stocks: ["AAPL", "META", "MSFT"],
  },
  {
    title: "바이오 섹터 규제 완화... 제약주 일제히 상승",
    content:
      "정부의 바이오헬스 규제 완화 정책 발표로 제약 바이오주가 강세를 보였습니다.",
    url: "dummy-12",
    source: "팜뉴스",
    published_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    sentiment: "positive",
    ai_score: 77,
    related_stocks: ["068270", "128940", "326030"],
  },
  {
    title: "테슬라, 중국 판매 부진으로 주가 하락",
    content:
      "테슬라의 중국 시장 판매량이 전년 대비 감소하며 주가가 5% 하락했습니다.",
    url: "dummy-13",
    source: "WSJ",
    published_at: new Date(Date.now() - 1000 * 60 * 390).toISOString(),
    sentiment: "negative",
    ai_score: 63,
    related_stocks: ["TSLA", "NIO", "XPEV"],
  },
  {
    title: "KB금융, 디지털 전환 투자 확대... 핀테크 기업 인수",
    content:
      "KB금융그룹이 디지털 금융 경쟁력 강화를 위해 핀테크 스타트업을 인수했습니다.",
    url: "dummy-14",
    source: "파이낸셜뉴스",
    published_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    sentiment: "neutral",
    ai_score: 71,
    related_stocks: ["105560", "055550", "316140"],
  },
  {
    title: "반도체 수출 회복세... 11월 수출 전년 대비 15% 증가",
    content:
      "반도체 수출이 회복세를 보이며 한국 전체 수출 증가를 이끌었습니다.",
    url: "dummy-15",
    source: "뉴시스",
    published_at: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
    sentiment: "positive",
    ai_score: 80,
    related_stocks: ["005930", "000660", "058470"],
  },
  {
    title: "현대건설, 사우디 대형 프로젝트 수주... 주가 상승",
    content:
      "현대건설이 사우디아라비아에서 3조원 규모의 건설 프로젝트를 수주했습니다.",
    url: "dummy-16",
    source: "건설경제",
    published_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    sentiment: "positive",
    ai_score: 83,
    related_stocks: ["000720", "005380", "028050"],
  },
  {
    title: "암호화폐 시장 변동성 확대... 비트코인 4만 달러선 공방",
    content:
      "비트코인이 4만 달러선에서 등락을 거듭하며 투자자들의 관심이 집중되고 있습니다.",
    url: "dummy-17",
    source: "코인데스크",
    published_at: new Date(Date.now() - 1000 * 60 * 510).toISOString(),
    sentiment: "neutral",
    ai_score: 68,
    related_stocks: ["COIN", "MARA", "RIOT"],
  },
  {
    title: "LG전자, 가전 사업부 실적 개선... 목표주가 상향",
    content:
      "LG전자의 생활가전 사업부가 견조한 실적을 기록하며 증권사들이 목표주가를 상향 조정했습니다.",
    url: "dummy-18",
    source: "전자신문",
    published_at: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    sentiment: "positive",
    ai_score: 75,
    related_stocks: ["066570", "003550", "021240"],
  },
  {
    title: "글로벌 인플레이션 우려 재부상... 안전자산 선호",
    content:
      "주요국 물가 지표가 예상을 상회하며 금과 달러 등 안전자산으로 자금이 이동하고 있습니다.",
    url: "dummy-19",
    source: "FT",
    published_at: new Date(Date.now() - 1000 * 60 * 570).toISOString(),
    sentiment: "negative",
    ai_score: 62,
    related_stocks: ["GLD", "UUP", "TLT"],
  },
  {
    title: "쿠팡, 로켓배송 확대로 매출 성장... 흑자 전환 기대",
    content:
      "쿠팡이 로켓배송 서비스 확대와 멤버십 가입자 증가로 실적 개선을 이어가고 있습니다.",
    url: "dummy-20",
    source: "이코노미스트",
    published_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    sentiment: "positive",
    ai_score: 78,
    related_stocks: ["CPNG", "AMZN", "035720"],
  },
];

export function NewsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hot");
  const itemsPerPage = 5;
  // const { isAuthenticated } = useAuthStore();

  // Hot 뉴스 가져오기
  const { data: hotNews, isLoading: loadingHot } = useQuery({
    queryKey: ["news", "latest", currentPage],
    queryFn: () => apiClient.getLatestNews(20),
  });

  // 관심 종목 뉴스 (메인 페이지에서는 사용 안 함)
  const { data: favoriteNews, isLoading: loadingFavorite } = useQuery({
    queryKey: ["news", "personalized", currentPage],
    queryFn: () => apiClient.getPersonalizedRecommendations(10),
    enabled: false, // 메인 페이지에서는 비활성화
  });

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>뉴스</CardTitle>
        <div className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="키워드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="hot" className="flex-1">
              Hot 뉴스
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              관심 종목
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-0">
            <NewsListContent
              news={
                hotNews?.articles?.length ? hotNews.articles : dummyNewsData
              }
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              isLoading={loadingHot}
              searchQuery={searchQuery}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <NewsListContent
              news={
                favoriteNews?.recommendations?.length
                  ? favoriteNews.recommendations
                  : dummyNewsData.filter((_, i) => i % 2 === 0)
              }
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              isLoading={loadingFavorite}
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface NewsListContentProps {
  news: NewsArticle[];
  currentPage: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  isLoading: boolean;
  searchQuery: string;
}

function NewsListContent({
  news,
  currentPage,
  onPageChange,
  itemsPerPage,
  isLoading,
  searchQuery,
}: NewsListContentProps) {
  // 검색 필터링
  const filteredNews = searchQuery
    ? news.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : news;

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleNews = filteredNews.slice(startIndex, startIndex + itemsPerPage);

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4" />;
      case "negative":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getSentimentBgColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100";
      case "negative":
        return "bg-red-100";
      default:
        return "bg-muted";
    }
  };

  const getSentimentText = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "긍정";
      case "negative":
        return "부정";
      default:
        return "중립";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[870px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          뉴스를 불러오는 중...
        </div>
      </div>
    );
  }

  if (visibleNews.length === 0) {
    return (
      <div className="flex h-[870px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          표시할 뉴스가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[870px] flex flex-col">
      <div className="space-y-3 flex-1">
        {visibleNews.map((item, index) => (
          <Link
            key={item.url || index}
            href={`/news-analysis/${encodeURIComponent(
              item.url || `dummy-${index + 1}`
            )}`}
            className="block"
          >
            <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 h-[150px] gap-2">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="line-clamp-2 text-sm leading-5 flex-1 overflow-hidden h-10">
                    {item.title}
                  </CardTitle>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${getSentimentBgColor(
                      item.sentiment
                    )}`}
                  >
                    <span className={getSentimentColor(item.sentiment)}>
                      {getSentimentIcon(item.sentiment)}
                    </span>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span>{item.source || "Unknown"}</span>
                  <span>•</span>
                  <span>
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString("ko-KR")
                      : "Unknown date"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${getSentimentColor(
                      item.sentiment
                    )}`}
                  >
                    {getSentimentText(item.sentiment)}
                  </span>
                  {item.related_stocks && item.related_stocks.length > 0 && (
                    <div className="flex gap-1">
                      {item.related_stocks.slice(0, 3).map((symbol) => (
                        <span
                          key={symbol}
                          className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
