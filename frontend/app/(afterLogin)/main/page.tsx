"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { TickerTapeWidget } from "@/features/main/components/TickerTape";
import apiClient from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { AnimatedSection } from "@/shared/components/ProgressiveLoader";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

// Lazy load heavy components
const ImprovedStockList = lazy(() =>
  import("@/features/main/components/StockList").then(mod => ({ default: mod.ImprovedStockList }))
);
const NewsSection = lazy(() =>
  import("@/features/main/components/NewsSection").then(mod => ({ default: mod.NewsSection }))
);

export default function MainPage() {
  const [supportedStocks, setSupportedStocks] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // Fetch supported stocks and categories
  useEffect(() => {
    const loadSupportedStocks = async () => {
      try {
        logger.info('[MainPage] Loading WebSocket supported stocks...');
        const response = await apiClient.getSupportedStocks();

        if (response.all_symbols && Array.isArray(response.all_symbols)) {
          setSupportedStocks(response.all_symbols);
          logger.info(`[MainPage] Loaded ${response.all_symbols.length} stocks`);
        }

        if (response.categories && typeof response.categories === 'object') {
          setCategories(response.categories);
          logger.info(`[MainPage] Loaded ${Object.keys(response.categories).length} categories`);
        }

        setIsLoadingStocks(false);
      } catch (error) {
        logger.error('[MainPage] Failed to load stocks:', error);
        setIsLoadingStocks(false);
      }
    };

    loadSupportedStocks();
  }, []);

  return (
    <div className="w-full px-3 py-4 md:px-6 md:py-6 lg:px-8 mx-auto max-w-[1600px]">
      {/* TradingView Ticker Tape */}
      {/* <AnimatedSection animation="fade-in" duration={300}>
        <TickerTapeWidget />
      </AnimatedSection> */}

      {/* Main Content Grid - News first on all devices (뉴스 분석이 메인) */}
      <div className="flex flex-col gap-4 md:gap-6 lg:grid lg:grid-cols-3 lg:gap-8">
        {/* News Section - Always first (2/3 width) */}
        <AnimatedSection animation="fade-up" delay={100} className="lg:col-span-2">
          <Suspense fallback={
            <div className="flex items-center justify-center py-16 bg-card rounded-lg border">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <NewsSection
              availableStocks={supportedStocks}
              isLoadingStocks={isLoadingStocks}
              categories={categories}
            />
          </Suspense>
        </AnimatedSection>

        {/* Stock List - Always second (1/3 width, sticky) */}
        <AnimatedSection animation="fade-up" delay={200} className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Suspense fallback={
              <div className="flex items-center justify-center py-16 bg-card rounded-lg border">
                <LoadingSpinner size="lg" />
              </div>
            }>
              <ImprovedStockList
                supportedStocks={supportedStocks}
                isLoadingStocks={isLoadingStocks}
              />
            </Suspense>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
