'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth-store';
import { useStockStore } from '@/store/stock-store';
import apiClient from '@/lib/api-client';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Target,
  Shield
} from 'lucide-react';

interface Recommendation {
  symbol: string;
  company_name: string;
  current_price: number;
  predicted_return: number;
  confidence_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation_type: 'BUY' | 'HOLD' | 'SELL';
  reasons: string[];
}

interface TrendingStock {
  symbol: string;
  company_name: string;
  current_price: number;
  change_percent: number;
  volume: number;
  market_cap: number;
  sector: string;
  trend_score: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addToWatchlist, watchlist } = useStockStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'trending'>('ai');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');

  // 인증 체크
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 데이터 로드 함수 - useCallback으로 메모이제이션
  const loadDiscoverData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // AI 추천 종목 가져오기
      const [recResponse, trendResponse] = await Promise.all([
        apiClient.getPersonalizedRecommendations(15),
        fetchTrendingStocks()
      ]);

      setRecommendations(recResponse);
      setTrendingStocks(trendResponse);
    } catch (err) {
      console.error('Failed to load discover data:', err);
      setError('추천 데이터를 불러오는데 실패했습니다');
      // 더미 데이터로 대체
      setDummyData();
    } finally {
      setIsLoading(false);
    }
  }, []); // 빈 의존성 배열 - 함수가 변경되지 않음

  // 데이터 로드
  useEffect(() => {
    loadDiscoverData();
  }, [loadDiscoverData]);

  // 트렌딩 종목 가져오기 (실제 API가 없으므로 더미 데이터)
  const fetchTrendingStocks = async (): Promise<TrendingStock[]> => {
    // 실제로는 API 호출
    return [
      {
        symbol: 'NVDA',
        company_name: 'NVIDIA Corporation',
        current_price: 875.28,
        change_percent: 5.2,
        volume: 52000000,
        market_cap: 2150000000000,
        sector: 'Technology',
        trend_score: 95,
      },
      {
        symbol: 'TSLA',
        company_name: 'Tesla, Inc.',
        current_price: 248.50,
        change_percent: 3.8,
        volume: 120000000,
        market_cap: 789000000000,
        sector: 'Automotive',
        trend_score: 88,
      },
      {
        symbol: 'META',
        company_name: 'Meta Platforms, Inc.',
        current_price: 502.15,
        change_percent: -2.1,
        volume: 18000000,
        market_cap: 1280000000000,
        sector: 'Technology',
        trend_score: 82,
      },
      {
        symbol: 'AMD',
        company_name: 'Advanced Micro Devices',
        current_price: 168.92,
        change_percent: 4.5,
        volume: 65000000,
        market_cap: 273000000000,
        sector: 'Semiconductors',
        trend_score: 91,
      },
    ];
  };

  // 더미 데이터 설정
  const setDummyData = () => {
    setRecommendations([
      {
        symbol: 'AAPL',
        company_name: 'Apple Inc.',
        current_price: 195.32,
        predicted_return: 15.5,
        confidence_score: 85,
        risk_level: 'LOW',
        recommendation_type: 'BUY',
        reasons: ['강한 브랜드 가치', '안정적인 수익 성장', '혁신적인 제품 라인업'],
      },
      {
        symbol: 'MSFT',
        company_name: 'Microsoft Corporation',
        current_price: 420.15,
        predicted_return: 12.3,
        confidence_score: 92,
        risk_level: 'LOW',
        recommendation_type: 'BUY',
        reasons: ['클라우드 시장 선도', 'AI 투자 확대', '안정적인 배당'],
      },
      {
        symbol: 'GOOGL',
        company_name: 'Alphabet Inc.',
        current_price: 156.78,
        predicted_return: 18.2,
        confidence_score: 78,
        risk_level: 'MEDIUM',
        recommendation_type: 'BUY',
        reasons: ['AI 기술 선도', '검색 시장 지배', '유튜브 성장'],
      },
    ]);
  };

  // 리스크 레벨 색상
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-stock-up bg-stock-up-bg';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      case 'HIGH':
        return 'text-stock-down bg-stock-down-bg';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900';
    }
  };

  // 추천 타입 색상
  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'bg-stock-up text-white';
      case 'HOLD':
        return 'bg-yellow-500 text-white';
      case 'SELL':
        return 'bg-stock-down text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // 필터링된 추천 목록
  const filteredRecommendations = recommendations.filter(
    (rec) => selectedRisk === 'ALL' || rec.risk_level === selectedRisk
  );

  // AI 추천 카드 컴포넌트
  const RecommendationCard = ({ rec }: { rec: Recommendation }) => {
    const isInWatchlist = watchlist.includes(rec.symbol);

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {rec.symbol}
                <Badge className={getRecommendationColor(rec.recommendation_type)}>
                  {rec.recommendation_type}
                </Badge>
              </CardTitle>
              <CardDescription>{rec.company_name}</CardDescription>
            </div>
            <Badge variant="outline" className={getRiskColor(rec.risk_level)}>
              <Shield className="h-3 w-3 mr-1" />
              {rec.risk_level} RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">현재 가격</p>
              <p className="text-xl font-bold">${rec.current_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">예상 수익률</p>
              <p className="text-xl font-bold text-stock-up">
                +{rec.predicted_return.toFixed(1)}%
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">AI 신뢰도</p>
            <div className="flex items-center gap-2">
              <Progress value={rec.confidence_score} className="flex-1" />
              <span className="text-sm font-medium">{rec.confidence_score}%</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">추천 이유</p>
            <ul className="space-y-1">
              {rec.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <Sparkles className="h-3 w-3 mt-0.5 text-yellow-500" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => router.push(`/dashboard/${rec.symbol}`)}
            >
              상세 분석
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (!isInWatchlist) {
                  addToWatchlist(rec.symbol);
                }
              }}
              disabled={isInWatchlist}
            >
              <Star className={`h-4 w-4 ${isInWatchlist ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 트렌딩 종목 카드 컴포넌트
  const TrendingCard = ({ stock }: { stock: TrendingStock }) => {
    const isInWatchlist = watchlist.includes(stock.symbol);
    const isPositive = stock.change_percent >= 0;

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg">{stock.symbol}</h3>
              <p className="text-sm text-muted-foreground">{stock.company_name}</p>
            </div>
            <Badge variant="secondary">
              <Target className="h-3 w-3 mr-1" />
              {stock.sector}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">${stock.current_price.toFixed(2)}</span>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-stock-up' : 'text-stock-down'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{stock.change_percent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">거래량</p>
                <p className="font-medium">{(stock.volume / 1000000).toFixed(1)}M</p>
              </div>
              <div>
                <p className="text-muted-foreground">트렌드 점수</p>
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-linear-to-r from-blue-500 to-purple-500 h-full rounded-full"
                      style={{ width: `${stock.trend_score}%` }}
                    />
                  </div>
                  <span className="font-medium">{stock.trend_score}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/dashboard/${stock.symbol}`)}
              >
                차트 보기
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => !isInWatchlist && addToWatchlist(stock.symbol)}
                disabled={isInWatchlist}
              >
                <Star className={`h-4 w-4 ${isInWatchlist ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>AI가 맞춤 종목을 분석 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-500" />
          종목 발견
        </h1>
        <p className="text-muted-foreground">
          AI 추천과 실시간 트렌드 분석으로 새로운 투자 기회를 발견하세요
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ai' | 'trending')}>
        <TabsList className="mb-6">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI 추천
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            트렌딩 종목
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          {/* 리스크 필터 */}
          <div className="flex gap-2">
            <Button
              variant={selectedRisk === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRisk('ALL')}
            >
              전체
            </Button>
            <Button
              variant={selectedRisk === 'LOW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRisk('LOW')}
            >
              낮은 위험
            </Button>
            <Button
              variant={selectedRisk === 'MEDIUM' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRisk('MEDIUM')}
            >
              중간 위험
            </Button>
            <Button
              variant={selectedRisk === 'HIGH' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRisk('HIGH')}
            >
              높은 위험
            </Button>
          </div>

          {/* AI 추천 목록 */}
          {error && !recommendations.length ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-yellow-800">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={loadDiscoverData}
                >
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map((rec) => (
                <RecommendationCard key={rec.symbol} rec={rec} />
              ))}
            </div>
          )}

          {filteredRecommendations.length === 0 && !error && (
            <Card>
              <CardContent className="py-16 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>선택한 리스크 레벨에 해당하는 추천 종목이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingStocks.map((stock) => (
              <TrendingCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}