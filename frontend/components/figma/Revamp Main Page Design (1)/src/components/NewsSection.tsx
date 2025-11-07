import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, ExternalLink, Search } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

const hotNews: NewsItem[] = [
  { id: '1', title: 'KOSPI, 외국인 순매수에 2,600선 돌파', summary: '외국인 투자자들의 대규모 순매수세에 힘입어 코스피 지수가 2,600선을 돌파했습니다. 반도체와 자동차 업종이 강세를 보이며 시장을 견인했습니다.', source: '한국경제', time: '10분 전', sentiment: 'positive' },
  { id: '2', title: '반도체 업종 급등, SK하이닉스 7% 상승', summary: 'AI 수요 증가 기대감에 반도체 주가들이 일제히 상승하고 있습니다. SK하이닉스는 HBM3E 양산 소식에 장중 7% 이상 상승했습니다.', source: '매일경제', time: '25분 전', sentiment: 'positive' },
  { id: '3', title: '미국 CPI 발표 앞두고 증시 긴장', summary: '오늘 밤 발표될 미국 소비자물가지수를 앞두고 투자 심리가 위축되고 있습니다. 시장은 인플레이션 둔화 여부에 주목하고 있습니다.', source: '서울경제', time: '1시간 전', sentiment: 'neutral' },
  { id: '4', title: '2차전지주 약세, LG에너지솔루션 3% 하락', summary: '미국 전기차 보조금 축소 우려에 2차전지 관련주들이 약세를 보이고 있습니다. LG에너지솔루션은 장중 3% 이상 하락했습니다.', source: '이데일리', time: '1시간 전', sentiment: 'negative' },
  { id: '5', title: '삼성전자, 신형 갤럭시 사전예약 100만대 돌파', summary: '신형 갤럭시 스마트폰 사전예약이 시작 3일만에 100만대를 넘어섰습니다. 시장에서는 2분기 실적 개선에 대한 기대감이 높아지고 있습니다.', source: '전자신문', time: '2시간 전', sentiment: 'positive' },
  { id: '6', title: '코스닥, 개인 매수에 850선 회복', summary: '개인 투자자들의 적극적인 매수세로 코스닥 지수가 850선을 회복했습니다. 바이오와 IT 업종이 강세를 주도했습니다.', source: '파이낸셜뉴스', time: '2시간 전', sentiment: 'positive' },
  { id: '7', title: '원달러 환율 1,300원대 중반 등락', summary: '미 달러 강세와 수출 실적 개선 기대가 맞서며 환율이 박스권 움직임을 보이고 있습니다. 1,320원 선에서 지지를 받고 있습니다.', source: '연합인포맥스', time: '3시간 전', sentiment: 'neutral' },
  { id: '8', title: '카카오, AI 서비스 본격 출시', summary: '카카오가 자체 개발한 AI 기반 서비스를 정식으로 공개했습니다. 시장에서는 새로운 수익 모델 확보에 긍정적인 반응을 보이고 있습니다.', source: '조선비즈', time: '3시간 전', sentiment: 'positive' },
  { id: '9', title: '금리 인상 우려에 건설주 일제히 약세', summary: '금리 추가 인상 가능성이 제기되면서 건설 관련주들이 하락세를 보이고 있습니다. 부동산 프로젝트파이낸싱(PF) 리스크도 부담 요인입니다.', source: '머니투데이', time: '4시간 전', sentiment: 'negative' },
  { id: '10', title: '네이버, 클라우드 사업 흑자 전환', summary: '네이버 클라우드가 출범 6년만에 분기 기준 첫 흑자를 달성했습니다. AI와 클라우드 인프라 수요 증가가 실적 개선을 이끌었습니다.', source: 'IT조선', time: '4시간 전', sentiment: 'positive' },
  { id: '11', title: '미국 증시, 기술주 강세에 혼조세', summary: '나스닥은 상승했으나 다우지수는 하락 마감했습니다. 빅테크 기업들의 실적 발표를 앞두고 투자심리가 엇갈리고 있습니다.', source: '한국경제', time: '5시간 전', sentiment: 'neutral' },
  { id: '12', title: '배당주 수요 증가, 금융주 상승세', summary: '고배당주에 대한 관심이 높아지면서 금융주들이 강세를 보이고 있습니다. KB금융과 신한지주가 2% 이상 상승했습니다.', source: '이투데이', time: '5시간 전', sentiment: 'positive' },
  { id: '13', title: '유가 상승에 정유주 동반 상승', summary: '국제 유가가 배럴당 80달러를 돌파하며 정유 관련주들이 일제히 상승했습니다. SK이노베이션과 S-Oil이 강세를 보였습니다.', source: '에너지경제', time: '6시간 전', sentiment: 'positive' },
  { id: '14', title: '게임주, 신작 출시 기대에 상승', summary: '주요 게임사들의 신작 출시 일정이 공개되며 게임주들이 상승세를 탔습니다. 엔씨소프트와 넷마블이 선두를 달렸습니다.', source: '게임메카', time: '6시간 전', sentiment: 'positive' },
  { id: '15', title: '반도체 장비주도 동반 상승', summary: '반도체 업황 개선 기대감에 장비 제조사들의 주가도 함께 올랐습니다. 원익IPS와 주성엔지니어링이 상한가에 근접했습니다.', source: '전자신문', time: '7시간 전', sentiment: 'positive' },
  { id: '16', title: '바이오주, 임상 결과 발표 앞두고 변동성', summary: '주요 바이오 기업들의 임상시험 결과 발표를 앞두고 관련주들의 변동성이 확대되고 있습니다.', source: '메디게이트뉴스', time: '7시간 전', sentiment: 'neutral' },
  { id: '17', title: '조선주, 수주잔고 증가에 상승', summary: '대형 조선사들의 수주잔고가 사상 최대치를 경신하며 조선주들이 강세를 보이고 있습니다. 한국조선해양이 4% 이상 올랐습니다.', source: '매일경제', time: '8시간 전', sentiment: 'positive' },
  { id: '18', title: '면세점주, 중국 관광객 증가 기대', summary: '중국의 단체 관광 재개 가능성이 제기되며 면세점 관련주들이 상승했습니다. 호텔신라와 롯데관광개발이 급등했습니다.', source: '한국경제', time: '8시간 전', sentiment: 'positive' },
  { id: '19', title: '화학주, 원자재 가격 상승에 약세', summary: '원유 및 원자재 가격 상승으로 화학 관련주들이 하락 압력을 받고 있습니다. LG화학과 롯데케미칼이 하락했습니다.', source: '케미컬뉴스', time: '9시간 전', sentiment: 'negative' },
  { id: '20', title: '엔터주, K-POP 해외 진출 성과', summary: 'K-POP 아티스트들의 해외 공연 성과가 좋아지며 엔터 관련주들이 상승세를 보이고 있습니다. 하이브와 JYP가 강세입니다.', source: '스포츠서울', time: '9시간 전', sentiment: 'positive' },
];

const watchlistNews: NewsItem[] = [
  { id: '21', title: '삼성전자, 3나노 공정 수율 90% 달성', summary: '삼성전자가 3나노 파운드리 공정의 수율을 90%까지 끌어올리는데 성공했습니다. 이는 경쟁사 대비 높은 수준으로 평가됩니다.', source: '디지털타임스', time: '30분 전', sentiment: 'positive' },
  { id: '22', title: '현대차, 인도 시장에서 판매 1위 달성', summary: '현대자동차가 인도 승용차 시장에서 처음으로 월간 판매 1위를 차지했습니다. 현지 맞춤형 전략이 주효했다는 평가입니다.', source: '오토타임스', time: '1시간 전', sentiment: 'positive' },
  { id: '23', title: 'NAVER AI 검색 이용자 1천만명 돌파', summary: '네이버의 생성형 AI 검색 서비스 이용자가 1천만명을 넘어섰습니다. 사용자 만족도도 높은 것으로 조사됐습니다.', source: 'ZDNet Korea', time: '2시간 전', sentiment: 'positive' },
  { id: '24', title: 'SK하이닉스, HBM3E 양산 본격화', summary: 'SK하이닉스가 차세대 고대역폭 메모리 HBM3E의 대량 생산에 돌입했습니다. AI 서버 수요 증가로 공급 부족이 예상됩니다.', source: '전자신문', time: '2시간 전', sentiment: 'positive' },
  { id: '25', title: 'LG에너지솔루션, 유럽 배터리 공장 증설', summary: 'LG에너지솔루션이 폴란드 공장의 생산능력을 2배로 확대하기로 했습니다. 유럽 전기차 시장 공략을 강화할 계획입니다.', source: '에너지경제', time: '3시간 전', sentiment: 'positive' },
  { id: '26', title: '삼성전자, 폴더블폰 시장 점유율 80% 돌파', summary: '삼성전자가 전세계 폴더블 스마트폰 시장에서 80% 이상의 점유율을 기록하며 압도적인 1위를 유지하고 있습니다.', source: '디지털데일리', time: '4시간 전', sentiment: 'positive' },
  { id: '27', title: 'NAVER 웹툰, 미국 시장 진출 가속화', summary: '네이버 웹툰이 미국 현지 작가 육성에 나서며 글로벌 시장 확대에 박차를 가하고 있습니다.', source: 'IT조선', time: '4시간 전', sentiment: 'positive' },
  { id: '28', title: '카카오뱅크, 대출 포트폴리오 다각화', summary: '카카오뱅크가 기업대출 시장에 본격 진출하며 수익원 다변화를 추진하고 있습니다.', source: '파이낸셜뉴스', time: '5시간 전', sentiment: 'positive' },
  { id: '29', title: '현대차, 수소차 판매 전년 대비 50% 증가', summary: '현대자동차의 수소전기차 넥쏘 판매량이 전년 동기 대비 50% 이상 증가하며 수소차 시장을 선도하고 있습니다.', source: '오토헤럴드', time: '5시간 전', sentiment: 'positive' },
  { id: '30', title: 'SK하이닉스, AI 반도체 수요 급증으로 증설 검토', summary: 'SK하이닉스가 AI 반도체 수요 급증에 대응하기 위해 생산 라인 추가 증설을 검토 중인 것으로 알려졌습니다.', source: '전자신문', time: '6시간 전', sentiment: 'positive' },
  { id: '31', title: 'LG전자, 프리미엄 가전 시장 공략 강화', summary: 'LG전자가 프리미엄 가전 브랜드 LG 시그니처를 앞세워 고가 시장 점유율 확대에 나섰습니다.', source: '전자신문', time: '6시간 전', sentiment: 'positive' },
  { id: '32', title: '삼성바이오로직스, 대형 CMO 계약 체결', summary: '삼성바이오로직스가 글로벌 제약사와 대형 위탁생산 계약을 체결하며 실적 개선이 기대됩니다.', source: '메디게이트뉴스', time: '7시간 전', sentiment: 'positive' },
  { id: '33', title: '네이버 파이낸셜, 종합금융 플랫폼으로 도약', summary: '네이버 파이낸셜이 증권, 보험, 자산관리 등 금융 서비스를 통합한 종합 플랫폼 구축을 본격화하고 있습니다.', source: '한국경제', time: '7시간 전', sentiment: 'positive' },
  { id: '34', title: '카카오모빌리티, 자율주행 택시 시범 운행', summary: '카카오모빌리티가 서울 일부 지역에서 자율주행 택시 시범 서비스를 시작했습니다.', source: 'IT조선', time: '8시간 전', sentiment: 'positive' },
  { id: '35', title: 'SK이노베이션, 배터리 재활용 사업 본격화', summary: 'SK이노베이션이 폐배터리 재활용 사업에 본격 진출하며 순환경제 체계 구축에 나섰습니다.', source: '에너지경제', time: '8시간 전', sentiment: 'positive' },
];

export function NewsSection() {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'hot' | 'watchlist'>('hot');
  const [searchKeyword, setSearchKeyword] = useState('');

  const newsData = activeTab === 'hot' ? hotNews : watchlistNews;
  
  // 검색 필터링
  const filteredNews = useMemo(() => {
    if (!searchKeyword.trim()) return newsData;
    
    const keyword = searchKeyword.toLowerCase();
    return newsData.filter(news => 
      news.title.toLowerCase().includes(keyword) || 
      news.summary.toLowerCase().includes(keyword) ||
      news.source.toLowerCase().includes(keyword)
    );
  }, [newsData, searchKeyword]);

  const displayCount = 5;
  const totalPages = Math.ceil(filteredNews.length / displayCount);
  const startIndex = (currentPage - 1) * displayCount;
  const displayedNews = filteredNews.slice(startIndex, startIndex + displayCount);

  const handleTabChange = (tab: 'hot' | 'watchlist') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchKeyword('');
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="outline" className="border-success text-success text-xs">긍정</Badge>;
      case 'negative':
        return <Badge variant="outline" className="border-destructive text-destructive text-xs">부정</Badge>;
      default:
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-xs">중립</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border">
        <button
          onClick={() => handleTabChange('hot')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'hot'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🔥 Hot 뉴스
        </button>
        <button
          onClick={() => handleTabChange('watchlist')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'watchlist'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ⭐ 관심 종목 뉴스
        </button>
      </div>

      {/* 검색 필터 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="뉴스 키워드 검색..."
          value={searchKeyword}
          onChange={(e) => {
            setSearchKeyword(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10 h-10 border-border focus:border-primary bg-background"
        />
      </div>

      {/* 뉴스 리스트 */}
      <div className="space-y-3">
        {displayedNews.map((news) => (
          <Card key={news.id} className="p-4 hover:shadow-md transition-all cursor-pointer">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(news.sentiment)}
                    <h4 className="text-foreground line-clamp-1">{news.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {news.summary}
                  </p>
                </div>
                {getSentimentBadge(news.sentiment)}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{news.source}</span>
                  <span>•</span>
                  <span>{news.time}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  원문 보기
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 검색 결과 표시 */}
      {searchKeyword && (
        <div className="text-sm text-muted-foreground text-center py-2">
          {filteredNews.length > 0 
            ? `${filteredNews.length}개의 뉴스를 찾았습니다.` 
            : '검색 결과가 없습니다.'}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
