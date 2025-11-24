import { RefObject } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  searchQuery: string;
  selectedStock: string | null;
  showDropdown: boolean;
  highlightedIndex: number;
  filteredStocks: string[];
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredStocks.map((stock, index) => (
            <button
              key={stock}
              onClick={() => onSelectStock(stock)}
              className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                highlightedIndex === index ? "bg-muted" : ""
              }`}
              onMouseEnter={() => onHighlightChange(index)}
            >
              <span className="font-medium">{stock}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
