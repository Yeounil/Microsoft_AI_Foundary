'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, TrendingUp, X, Newspaper, Tag, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HighlightText } from './HighlightText';
import { fuzzySearch } from '@/lib/fuzzy-search';
import { useSupportedStocks } from '@/hooks/useSupportedStocks';
import { isValidStockSymbol, sanitizeSymbol, sanitizeSearchQuery } from '@/lib/security/sanitize';

type SearchFilterType = 'all' | 'stock' | 'news' | 'category';

interface SearchResult {
  symbol: string;
  name: string;
  type?: 'stock' | 'news' | 'category';
}

interface SearchAutocompleteProps {
  onSelect?: (symbol: string, type?: string) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  defaultFilter?: SearchFilterType;
  navigateOnSelect?: boolean;      // 선택 시 라우팅 여부 (기본: true)
  stocks?: string[];               // 외부에서 종목 데이터 주입 (없으면 API 사용)
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 5;
const EMPTY_RESULTS: SearchResult[] = [];

/**
 * 검색 자동완성 컴포넌트
 */
const FILTER_OPTIONS: { value: SearchFilterType; label: string; icon: typeof Search }[] = [
  { value: 'all', label: '전체', icon: Search },
  { value: 'stock', label: '종목', icon: TrendingUp },
  { value: 'news', label: '뉴스', icon: Newspaper },
  { value: 'category', label: '카테고리', icon: Tag },
];

export function SearchAutocomplete({
  onSelect,
  placeholder = '종목명 및 코드 검색',
  className,
  showFilters = false,
  defaultFilter = 'all',
  navigateOnSelect = true,
  stocks: externalStocks,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<SearchFilterType>(defaultFilter);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // API에서 종목 데이터 로드 (외부 데이터가 없을 때만)
  const { stocks: apiStocks, isLoading: isLoadingStocks } = useSupportedStocks();

  // 외부 데이터가 있으면 외부 데이터 사용, 없으면 API 데이터 사용
  // externalStocks는 string[] 형태, apiStocks는 { symbol, name }[] 형태
  const availableStocks = useMemo(() => {
    if (externalStocks) {
      // 외부에서 string[]로 전달된 경우 변환
      return externalStocks.map((symbol) => ({ symbol, name: symbol }));
    }
    return apiStocks;
  }, [externalStocks, apiStocks]);

  // 검색 히스토리 로드 (마운트 시 한 번만) - 검증 추가
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // 각 항목 검증 - 허용된 문자만 포함된 항목만 허용
          const validated = parsed
            .filter((item): item is string =>
              typeof item === 'string' &&
              item.length <= 20 &&
              /^[a-zA-Z0-9.\-]+$/.test(item)
            )
            .slice(0, MAX_HISTORY);
          setHistory(validated);
        }
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }, []);

  // 검색 히스토리 저장 - 검증 추가
  const saveToHistory = useCallback((symbol: string) => {
    // 입력값 검증 - 허용된 문자만
    const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9.\-]/g, '').toUpperCase();
    if (!sanitizedSymbol || sanitizedSymbol.length > 20) return;

    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== sanitizedSymbol);
      const newHistory = [sanitizedSymbol, ...filtered].slice(0, MAX_HISTORY);
      try {
        sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      } catch {
        // Storage quota exceeded 등 에러 무시
      }
      return newHistory;
    });
  }, []);

  // 검색 결과 필터링 (퍼지 검색)
  useEffect(() => {
    if (query.length < 1) {
      setResults(EMPTY_RESULTS);
      return;
    }

    // API에서 가져온 종목 데이터를 SearchResult 형식으로 변환
    const stockResults: SearchResult[] = availableStocks.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      type: 'stock' as const,
    }));

    // 뉴스 카테고리
    const newsCategories: SearchResult[] = [
      { symbol: 'earnings', name: '실적 발표', type: 'news' },
      { symbol: 'merger', name: '인수합병', type: 'news' },
      { symbol: 'ipo', name: 'IPO', type: 'news' },
      { symbol: 'dividend', name: '배당', type: 'news' },
      { symbol: 'regulation', name: '규제', type: 'news' },
    ];

    // 산업 카테고리
    const industryCategories: SearchResult[] = [
      { symbol: 'tech', name: '기술', type: 'category' },
      { symbol: 'finance', name: '금융', type: 'category' },
      { symbol: 'healthcare', name: '헬스케어', type: 'category' },
      { symbol: 'energy', name: '에너지', type: 'category' },
      { symbol: 'consumer', name: '소비재', type: 'category' },
    ];

    // 필터에 따라 검색 대상 결정
    let searchData: SearchResult[] = [];
    if (activeFilter === 'all') {
      searchData = [...stockResults, ...newsCategories, ...industryCategories];
    } else if (activeFilter === 'stock') {
      searchData = stockResults;
    } else if (activeFilter === 'news') {
      searchData = newsCategories;
    } else if (activeFilter === 'category') {
      searchData = industryCategories;
    }

    // 퍼지 검색 사용
    const fuzzyResults = fuzzySearch(searchData, query, {
      keys: ['symbol', 'name'],
      threshold: 0.3,
      limit: 10,
    });

    setResults(fuzzyResults.map((r) => r.item));
    setSelectedIndex(-1);
  }, [query, activeFilter, availableStocks]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : history.map((h) => ({ symbol: h, name: h }));

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          handleSelect(items[selectedIndex].symbol);
        } else if (query.trim()) {
          handleSelect(query.trim().toUpperCase());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // 선택 처리 - 입력 검증 및 안전한 리다이렉트
  const handleSelect = (symbol: string, type?: string) => {
    // 주식 심볼 검증 (news, category 타입은 별도 검증)
    if (type !== 'news' && type !== 'category') {
      if (!isValidStockSymbol(symbol)) {
        console.warn('Invalid stock symbol blocked:', symbol);
        return;
      }
    }

    // 심볼 새니타이즈
    const safeSymbol = sanitizeSymbol(symbol);
    if (!safeSymbol) return;

    saveToHistory(safeSymbol);
    setQuery('');
    setIsOpen(false);

    if (onSelect) {
      onSelect(safeSymbol, type);
    }

    // navigateOnSelect가 true이고 onSelect가 없을 때만 라우팅
    // (onSelect가 있으면 외부에서 라우팅을 제어)
    if (navigateOnSelect && !onSelect) {
      // 타입에 따라 다른 경로로 이동 (encodeURIComponent로 안전한 URL 생성)
      if (type === 'news') {
        const safeNews = symbol.toLowerCase().replace(/[^a-z]/g, '');
        router.push(`/main?news=${encodeURIComponent(safeNews)}`);
      } else if (type === 'category') {
        const safeCategory = symbol.toLowerCase().replace(/[^a-z]/g, '');
        router.push(`/main?category=${encodeURIComponent(safeCategory)}`);
      } else {
        router.push(`/dashboard/${encodeURIComponent(safeSymbol)}`);
      }
    }
  };

  // 타입별 아이콘 가져오기
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'news':
        return <Newspaper className="h-4 w-4 text-blue-500" />;
      case 'category':
        return <Tag className="h-4 w-4 text-purple-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // 타입별 라벨
  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'news':
        return '뉴스';
      case 'category':
        return '카테고리';
      default:
        return '종목';
    }
  };

  // 히스토리 삭제
  const clearHistory = () => {
    setHistory([]);
    sessionStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const showDropdown = isOpen && (query.length > 0 || history.length > 0);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 필터 버튼 */}
      {showFilters && (
        <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_OPTIONS.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={activeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  'h-7 px-2.5 text-xs whitespace-nowrap transition-all',
                  activeFilter === filter.value && 'shadow-sm'
                )}
              >
                <Icon className="h-3 w-3 mr-1" />
                {filter.label}
              </Button>
            );
          })}
        </div>
      )}

      <div className="relative">
        {isLoadingStocks && !externalStocks ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          type="search"
          placeholder={activeFilter === 'all' ? placeholder : `${FILTER_OPTIONS.find(f => f.value === activeFilter)?.label} 검색`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-4"
          disabled={isLoadingStocks && !externalStocks}
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
          {/* 검색 결과 */}
          {results.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                검색 결과 ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.symbol}`}
                  onClick={() => handleSelect(result.symbol, result.type)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 hover:bg-accent text-left transition-colors cursor-pointer',
                    selectedIndex === index && 'bg-accent'
                  )}
                >
                  {getTypeIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        <HighlightText text={result.symbol} query={query} />
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {getTypeLabel(result.type)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      <HighlightText text={result.name} query={query} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length === 0 && history.length > 0 ? (
            /* 검색 히스토리 */
            <div className="py-1">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  최근 검색
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-auto p-1 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  삭제
                </Button>
              </div>
              {history.map((item, index) => (
                <button
                  key={item}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 hover:bg-accent text-left transition-colors cursor-pointer',
                    selectedIndex === index && 'bg-accent'
                  )}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          ) : (
            /* 결과 없음 */
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
