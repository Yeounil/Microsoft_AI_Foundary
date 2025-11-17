"use client";

import { useState, useEffect } from "react";
import { ImprovedStockList } from "@/features/main/components/StockList";
import { NewsSection } from "@/features/main/components/NewsSection";
import { TickerTapeWidget } from "@/features/main/components/TickerTape";
import apiClient from "@/lib/api-client";

export default function MainPage() {
  const [supportedStocks, setSupportedStocks] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // Fetch supported stocks and categories
  useEffect(() => {
    const loadSupportedStocks = async () => {
      try {
        console.log('[MainPage] Loading WebSocket supported stocks...');
        const response = await apiClient.getSupportedStocks();

        if (response.all_symbols && Array.isArray(response.all_symbols)) {
          setSupportedStocks(response.all_symbols);
          console.log(`[MainPage] ✅ Loaded ${response.all_symbols.length} stocks`);
        }

        if (response.categories && typeof response.categories === 'object') {
          setCategories(response.categories);
          console.log(`[MainPage] ✅ Loaded ${Object.keys(response.categories).length} categories`);
        }

        setIsLoadingStocks(false);
      } catch (error) {
        console.error('[MainPage] Failed to load stocks:', error);
        setIsLoadingStocks(false);
      }
    };

    loadSupportedStocks();
  }, []);

  return (
    <div className="container px-4 py-6 m-auto">
      {/* TradingView Ticker Tape */}
      <TickerTapeWidget />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[6fr_4fr]">
        {/* Left Side - News (60%) */}
        <div>
          <NewsSection
            availableStocks={supportedStocks}
            isLoadingStocks={isLoadingStocks}
            categories={categories}
          />
        </div>

        {/* Right Side - Stock List (35%) */}
        <div>
          <ImprovedStockList
            supportedStocks={supportedStocks}
            isLoadingStocks={isLoadingStocks}
          />
        </div>
      </div>
    </div>
  );
}
