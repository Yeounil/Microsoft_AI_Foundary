import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface StockListSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDisabled: boolean;
}

/**
 * StockListSearch Component
 * 종목 검색 입력 필드
 */
export function StockListSearch({
  searchQuery,
  onSearchChange,
  isDisabled,
}: StockListSearchProps) {
  return (
    <div className="relative mt-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="종목 검색..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9"
        disabled={isDisabled}
      />
    </div>
  );
}
