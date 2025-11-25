import { RefObject } from "react";
import { Search, X, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface StockInfo {
  symbol: string;
  name: string;
}

interface SearchBarProps {
  searchQuery: string;
  selectedStock: string | null;
  showDropdown: boolean;
  highlightedIndex: number;
  filteredStocks: StockInfo[];
  isLoadingStocks: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onInputFocus: () => void;
  onSelectStock: (stock: string) => void;
  onClearStock: () => void;
  onHighlightChange: (index: number) => void;
}

/**
 * SearchBar Component
 * 종목 검색 입력과 자동완성 dropdown을 표시합니다.
 */
export function SearchBar({
  searchQuery,
  selectedStock,
  showDropdown,
  highlightedIndex,
  filteredStocks,
  isLoadingStocks,
  dropdownRef,
  inputRef,
  onInputChange,
  onInputFocus,
  onSelectStock,
  onClearStock,
  onHighlightChange,
}: SearchBarProps) {
  return (
    <div className="pt-4 relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="종목 심볼 검색 (예: AAPL, TSLA)..."
          value={searchQuery}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onInputFocus}
          className="pl-9 pr-8"
          disabled={isLoadingStocks}
        />
        {selectedStock && (
          <button
            onClick={onClearStock}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && filteredStocks.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
            검색 결과 ({filteredStocks.length})
          </div>
          {filteredStocks.map((stock, index) => (
            <button
              key={stock.symbol}
              onClick={() => onSelectStock(stock.symbol)}
              className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-accent text-left transition-colors ${
                highlightedIndex === index ? "bg-accent" : ""
              }`}
              onMouseEnter={() => onHighlightChange(index)}
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    종목
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {stock.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
