"use client";

import { useState, useEffect } from "react";
import { RealtimeStockChart } from "@/features/main/components/Chart";
import { ImprovedStockList } from "@/features/main/components/StockList";
import { NewsSection } from "@/features/main/components/NewsSection";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import apiClient from "@/lib/api-client";

export default function MainPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [supportedStocks, setSupportedStocks] = useState<string[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // Fetch supported stocks once for both ImprovedStockList and NewsSection
  useEffect(() => {
    const loadSupportedStocks = async () => {
      try {
        console.log('[MainPage] Loading WebSocket supported stocks...');
        const response = await apiClient.getSupportedStocks();

        if (response.all_symbols && Array.isArray(response.all_symbols)) {
          setSupportedStocks(response.all_symbols);
          console.log(`[MainPage] ✅ Loaded ${response.all_symbols.length} stocks`);
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
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Side - Chart and Stock List (65%) */}
        <div className="space-y-6">
          {selectedSymbol ? (
            <RealtimeStockChart symbol={selectedSymbol} />
          ) : (
            <Card>
              <CardHeader>
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-[450px] bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          )}
          <ImprovedStockList
            onSelectStock={setSelectedSymbol}
            selectedSymbol={selectedSymbol}
            supportedStocks={supportedStocks}
            isLoadingStocks={isLoadingStocks}
          />
        </div>

        {/* Right Side - News (35%) */}
        <div>
          <NewsSection
            availableStocks={supportedStocks}
            isLoadingStocks={isLoadingStocks}
          />
        </div>
      </div>
    </div>
  );
}
