"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileChartHeaderProps {
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  isLoading: boolean;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
}

export function MobileChartHeader({
  symbol,
  companyName,
  currentPrice,
  priceChange,
  priceChangePercent,
  isLoading,
  isInWatchlist,
  onToggleWatchlist,
}: MobileChartHeaderProps) {
  const isPositive = (priceChange ?? 0) >= 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-lg font-semibold">
          {symbol}
          {companyName && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {companyName}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            ${currentPrice?.toFixed(2) || "0.00"}
          </span>
          {priceChange !== undefined && priceChangePercent !== undefined && (
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-stock-up" : "text-stock-down"
              }`}
            >
              {isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleWatchlist}
        className="min-h-[44px] min-w-[44px]"
      >
        <Star
          className={`h-5 w-5 ${
            isInWatchlist ? "fill-yellow-400 text-yellow-400" : ""
          }`}
        />
      </Button>
    </div>
  );
}
