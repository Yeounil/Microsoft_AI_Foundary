'use client';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { SearchAutocomplete } from '@/shared/components/SearchAutocomplete';

interface StockSymbolInputProps {
  symbols: string[];
  onChange: (symbols: string[]) => void;
  placeholder?: string;
  maxSymbols?: number;
}

export function StockSymbolInput({
  symbols,
  onChange,
  placeholder = '종목을 검색하여 추가하세요',
  maxSymbols = 10,
}: StockSymbolInputProps) {
  const handleSelect = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();

    if (symbols.includes(upperSymbol)) {
      return; // 이미 추가된 종목 무시
    }

    if (symbols.length >= maxSymbols) {
      alert(`최대 ${maxSymbols}개까지 추가할 수 있습니다`);
      return;
    }

    onChange([...symbols, upperSymbol]);
  };

  const handleRemoveSymbol = (symbol: string) => {
    onChange(symbols.filter((s) => s !== symbol));
  };

  return (
    <div className="space-y-3">
      {/* 자동완성 검색 입력 */}
      <SearchAutocomplete
        placeholder={placeholder}
        defaultFilter="stock"
        showFilters={false}
        onSelect={handleSelect}
        navigateOnSelect={false}
      />

      {/* 선택된 종목 목록 */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <Badge key={symbol} variant="secondary" className="gap-1 pr-1">
              {symbol}
              <button
                type="button"
                onClick={() => handleRemoveSymbol(symbol)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
