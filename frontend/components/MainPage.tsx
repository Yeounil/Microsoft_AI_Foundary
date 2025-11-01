"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Star, TrendingUp, Flame, ChevronRight, Clock, LogOut, Bell, Menu, X, Moon, Sun, ArrowUp, ArrowDown } from 'lucide-react';
import { authService } from '@/services/authService';
import { newsDB, interestsDB } from '@/lib/supabase';
import Image from 'next/image';
import myLogo from '@/assets/myLogo.png';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface MainPageProps {
  username: string;
  onLogout: () => void;
  onNavigateToAnalysis: () => void;
  onNavigateToWatchlist: () => void;
}

export function MainPage({ username, onLogout, onNavigateToAnalysis, onNavigateToWatchlist }: MainPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hotTopics, setHotTopics] = useState<string[]>([]);
  const [watchlistNews, setWatchlistNews] = useState<NewsArticle[]>([]);
  const [todayNews, setTodayNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadNewsData();
    }
  }, [isMounted]);

  const loadNewsData = async () => {
    setLoadingNews(true);
    try {
      // Hot Topics 로드
      const topics = ['연준 금리', 'AI 반도체', '테슬라', '엔비디아', '애플'];
      setHotTopics(topics);

      // 관심 종목 뉴스 로드 (DB에서 직접)
      try {
        const token = authService.getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.user_id || payload.sub;

          const interests = await interestsDB.getUserInterests(userId);
          if (interests && interests.length > 0) {
            // 첫 번째 관심 종목의 뉴스 가져오기
            const firstInterest = interests[0].interest;
            const news = await newsDB.getNewsBySymbol(firstInterest, 3);
            setWatchlistNews(news.map(n => ({
              title: n.title,
              description: n.description || '',
              url: n.url,
              source: n.source,
              published_at: n.published_at,
              category: n.category,
              sentiment: n.sentiment
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load watchlist news:', error);
      }

      // 오늘의 주요 이슈 뉴스 로드 (DB에서 직접)
      const latestNews = await newsDB.getLatestNews(10);

      // 뉴스에 카테고리와 감정 태그 추가 (임시)
      const categorizedNews = latestNews.map((news, index) => ({
        title: news.title,
        description: news.description || '',
        url: news.url,
        source: news.source,
        published_at: news.published_at,
        category: news.category || (index % 3 === 0 ? '정책' : index % 3 === 1 ? '테크' : '금융'),
        sentiment: news.sentiment || (index % 2 === 0 ? 'positive' as const : 'negative' as const)
      }));

      setTodayNews(categorizedNews);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // 검색 기능 구현
      console.log('Searching for:', searchQuery);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    onLogout();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${Math.floor(diffInHours / 24)}일 전`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-kakao-bg-dark' : 'bg-kakao-bg-light'}`}>
      {/* Header - Kakao Style */}
      <header className={`sticky top-0 z-50 border-b transition-colors ${isDarkMode ? 'bg-kakao-bg-dark-secondary border-kakao-bg-dark-tertiary' : 'bg-white border-kakao-border-light'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Image src={myLogo} alt="Logo" width={100} height={32} priority className="cursor-pointer" />

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <Button variant="ghost" className={`font-semibold ${isDarkMode ? 'text-kakao-yellow-light hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown-dark hover:bg-kakao-yellow/10'}`}>
                  홈
                </Button>
                <Button variant="ghost" onClick={onNavigateToAnalysis} className={`font-medium ${isDarkMode ? 'text-gray-300 hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown hover:bg-gray-100'}`}>
                  종목분석
                </Button>
                <Button variant="ghost" onClick={onNavigateToWatchlist} className={`font-medium ${isDarkMode ? 'text-gray-300 hover:bg-kakao-bg-dark-tertiary' : 'text-kakao-brown hover:bg-gray-100'}`}>
                  관심종목
                </Button>
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`hidden sm:flex ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className={`hidden sm:flex relative ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
              </Button>

              {/* User Menu */}
              <div className="hidden sm:flex items-center gap-3 ml-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className={`gap-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className={`md:hidden border-t ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <div className="px-4 py-3 space-y-1">
              <Button variant="ghost" className={`w-full justify-start ${isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-900 hover:bg-slate-100'}`}>
                홈
              </Button>
              <Button variant="ghost" onClick={onNavigateToAnalysis} className={`w-full justify-start ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                종목분석
              </Button>
              <Button variant="ghost" onClick={onNavigateToWatchlist} className={`w-full justify-start ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                관심종목
              </Button>
              <div className={`flex items-center justify-between pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{username}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className={`gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Search Section - Kakao Style */}
      <div className={`${isDarkMode ? 'bg-kakao-bg-dark-secondary' : 'bg-white'} py-6`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-2xl">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-kakao-brown-light'}`} />
            <Input
              type="text"
              placeholder="종목명, 종목코드 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={`pl-12 pr-4 h-14 text-base rounded-2xl transition-all shadow-sm ${
                isDarkMode
                  ? 'bg-kakao-bg-dark-tertiary border-kakao-bg-dark-border text-white placeholder:text-gray-500 focus:border-kakao-yellow-light focus:ring-2 focus:ring-kakao-yellow-light/20'
                  : 'bg-kakao-bg-light border-kakao-border-light text-kakao-brown-dark placeholder:text-kakao-brown-light focus:border-kakao-yellow focus:ring-2 focus:ring-kakao-yellow/20'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Actions - Kakao Style */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={onNavigateToAnalysis}
            className={`group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 ${
              isDarkMode
                ? 'bg-gradient-to-br from-kakao-yellow-light to-kakao-yellow-dark hover:shadow-2xl hover:shadow-kakao-yellow-light/40'
                : 'bg-gradient-to-br from-kakao-yellow to-kakao-yellow-dark hover:shadow-2xl hover:shadow-kakao-yellow/50'
            } shadow-lg hover:-translate-y-2 hover:scale-[1.02]`}
          >
            <div className="relative z-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-kakao-brown-dark flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-kakao-yellow" />
              </div>
              <span className="text-kakao-brown-dark text-xl font-bold mb-1">AI 종목 분석</span>
              <span className="text-kakao-brown text-sm">맞춤 추천 받기</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-kakao-brown-dark opacity-5 rounded-full -mr-8 -mt-8"></div>
          </button>

          <button
            onClick={onNavigateToWatchlist}
            className={`group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 ${
              isDarkMode
                ? 'bg-gradient-to-br from-kakao-brown to-kakao-brown-dark hover:shadow-2xl hover:shadow-kakao-brown/40'
                : 'bg-gradient-to-br from-kakao-brown-light to-kakao-brown hover:shadow-2xl hover:shadow-kakao-brown-light/50'
            } shadow-lg hover:-translate-y-2 hover:scale-[1.02]`}
          >
            <div className="relative z-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-kakao-yellow-light" />
              </div>
              <span className="text-white text-xl font-bold mb-1">관심 종목</span>
              <span className="text-white/80 text-sm">내 종목 보기</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8"></div>
          </button>
        </div>

        {/* Hot Topics - Kakao Style */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-kakao-yellow-light/20' : 'bg-kakao-yellow/20'}`}>
              <Flame className={`h-5 w-5 ${isDarkMode ? 'text-kakao-yellow-light' : 'text-[#FF6B00]'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-kakao-brown-dark'}`}>인기 토픽</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {hotTopics.map((topic, index) => (
              <button
                key={index}
                className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                  isDarkMode
                    ? index === 0
                      ? 'bg-kakao-yellow-light text-kakao-brown-dark'
                      : 'bg-kakao-bg-dark-tertiary text-white hover:bg-kakao-bg-dark-border'
                    : index === 0
                    ? 'bg-kakao-yellow text-kakao-brown-dark shadow-md hover:shadow-xl'
                    : 'bg-white text-kakao-brown border border-kakao-border-light hover:border-kakao-yellow shadow-sm hover:shadow-md'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* 관심 종목 뉴스 - Kakao Style */}
        {watchlistNews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-5">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-kakao-yellow-light/20' : 'bg-kakao-yellow/20'}`}>
                <Star className={`h-5 w-5 ${isDarkMode ? 'text-kakao-yellow-light' : 'text-kakao-yellow'}`} />
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-kakao-brown-dark'}`}>관심 종목 뉴스</h2>
            </div>
            <div className="space-y-3">
              {watchlistNews.slice(0, 3).map((news, index) => (
                <a
                  key={index}
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 ${
                    isDarkMode
                      ? 'bg-kakao-bg-dark-secondary hover:bg-kakao-bg-dark-tertiary shadow-md hover:shadow-xl'
                      : 'bg-white hover:bg-kakao-bg-cream border-2 border-kakao-border-light hover:border-kakao-yellow shadow-sm hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base mb-2 line-clamp-2 leading-snug ${isDarkMode ? 'text-white' : 'text-kakao-brown-dark'}`}>
                        {news.title}
                      </h3>
                      <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-kakao-brown-light'}`}>
                        <span className="font-medium">{news.source}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(news.published_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-1 ${isDarkMode ? 'text-gray-600' : 'text-kakao-brown-light'}`} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 오늘의 주요 이슈 - Kakao Style */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-kakao-brown/20' : 'bg-kakao-brown-light/10'}`}>
              <TrendingUp className={`h-5 w-5 ${isDarkMode ? 'text-kakao-yellow-light' : 'text-kakao-brown'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-kakao-brown-dark'}`}>오늘의 주요 이슈</h2>
          </div>
        </div>

        {loadingNews ? (
          <div className="flex justify-center items-center py-20">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-4 ${isDarkMode ? 'border-kakao-yellow-light' : 'border-kakao-yellow'}`}></div>
          </div>
        ) : (
          <div className="space-y-4">
            {todayNews.map((news, index) => (
              <article
                key={index}
                onClick={() => window.open(news.url, '_blank')}
                className={`group cursor-pointer rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 ${
                  isDarkMode
                    ? 'bg-kakao-bg-dark-secondary hover:bg-kakao-bg-dark-tertiary shadow-md hover:shadow-2xl'
                    : 'bg-white hover:bg-kakao-bg-cream border-2 border-kakao-border-light hover:border-kakao-yellow shadow-sm hover:shadow-xl'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs font-bold px-3 py-1 rounded-xl ${
                        news.category === '정책'
                          ? isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          : news.category === '테크'
                          ? isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {news.category}
                    </Badge>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                    news.sentiment === 'positive'
                      ? isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
                      : isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                  }`}>
                    {news.sentiment === 'positive' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    <span className={`text-xs font-bold ${news.sentiment === 'positive' ? 'text-red-500' : 'text-blue-500'}`}>
                      {news.sentiment === 'positive' ? '상승' : '하락'}
                    </span>
                  </div>
                </div>

                <h3 className={`font-bold text-lg mb-3 line-clamp-2 leading-tight ${isDarkMode ? 'text-white' : 'text-kakao-brown-dark'}`}>
                  {news.title}
                </h3>

                <p className={`text-sm mb-4 line-clamp-2 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-kakao-brown-light'}`}>
                  {news.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-kakao-brown-light'}`}>
                    <span className="font-semibold">{news.source}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(news.published_at)}</span>
                  </div>

                  <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-2 ${isDarkMode ? 'text-gray-600' : 'text-kakao-brown-light'}`} />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Help Button - Kakao Style */}
      <button className={`fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 ${
        isDarkMode
          ? 'bg-gradient-to-br from-kakao-yellow-light to-kakao-yellow-dark text-kakao-brown-dark hover:shadow-kakao-yellow-light/50'
          : 'bg-gradient-to-br from-kakao-yellow to-kakao-yellow-dark text-kakao-brown-dark hover:shadow-kakao-yellow/50'
      }`}>
        ?
      </button>
    </div>
  );
}
