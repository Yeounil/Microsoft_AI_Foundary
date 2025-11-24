'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface StockSymbolInputProps {
  symbols: string[];
  onChange: (symbols: string[]) => void;
  placeholder?: string;
  maxSymbols?: number;
}

export function StockSymbolInput({
  symbols,
  onChange,
  placeholder = '종목 코드를 입력하세요',
  maxSymbols = 10,
}: StockSymbolInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddSymbol = () => {
    const trimmedValue = inputValue.trim().toUpperCase();

    if (!trimmedValue) {
      return;
    }

    if (symbols.includes(trimmedValue)) {
      alert('이미 추가된 종목입니다');
      return;
    }

    if (symbols.length >= maxSymbols) {
      alert(`최대 ${maxSymbols}개까지 추가할 수 있습니다`);
      return;
    }

    onChange([...symbols, trimmedValue]);
    setInputValue('');
  };

  const handleRemoveSymbol = (symbol: string) => {
    onChange(symbols.filter((s) => s !== symbol));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSymbol();
    }
  };

  return (
    <div className="space-y-3">
      {/* 입력 필드 */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddSymbol}
          size="icon"
          variant="outline"
          disabled={!inputValue.trim() || symbols.length >= maxSymbols}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

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
