'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, TrendingUp, X, Newspaper, Tag, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HighlightText } from './HighlightText';
import { fuzzySearch } from '@/lib/fuzzy-search';

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
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 5;

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

  // 검색 히스토리 로드
  useEffect(() => {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(JSON.parse(saved));
    }
  }, []);

  // 검색 히스토리 저장
  const saveToHistory = useCallback((symbol: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== symbol);
      const newHistory = [symbol, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // 검색 결과 필터링 (퍼지 검색)
  useEffect(() => {
    if (query.length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    // 인기 종목 목록 (실제로는 API에서 가져와야 함)
    const popularStocks: SearchResult[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
      { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock' },
      { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock' },
      { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock' },
    ];

    // 뉴스 카테고리 (실제로는 API에서 가져와야 함)
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
      searchData = [...popularStocks, ...newsCategories, ...industryCategories];
    } else if (activeFilter === 'stock') {
      searchData = popularStocks;
    } else if (activeFilter === 'news') {
      searchData = newsCategories;
    } else if (activeFilter === 'category') {
      searchData = industryCategories;
    }

    // 퍼지 검색 사용
    const fuzzyResults = fuzzySearch(searchData, query, {
      keys: ['symbol', 'name'],
      threshold: 0.3,
      limit: 8,
    });

    setResults(fuzzyResults.map((r) => r.item));
    setSelectedIndex(-1);
  }, [query, activeFilter]);

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

  // 선택 처리
  const handleSelect = (symbol: string, type?: string) => {
    saveToHistory(symbol);
    setQuery('');
    setIsOpen(false);

    if (onSelect) {
      onSelect(symbol, type);
    } else {
      // 타입에 따라 다른 경로로 이동
      if (type === 'news') {
        router.push(`/main?news=${symbol}`);
      } else if (type === 'category') {
        router.push(`/main?category=${symbol}`);
      } else {
        router.push(`/dashboard/${symbol}`);
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
    localStorage.removeItem(SEARCH_HISTORY_KEY);
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={activeFilter === 'all' ? placeholder : `${FILTER_OPTIONS.find(f => f.value === activeFilter)?.label} 검색`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-4"
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
