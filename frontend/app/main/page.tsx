"use client";

import { useState } from "react";
import { RealtimeStockChart } from "@/features/main/components/RealtimeStockChart";
import { ImprovedStockList } from "@/features/main/components/ImprovedStockList";
import { NewsSection } from "@/features/main/components/NewsSection";

export default function MainPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");

  return (
    <div className="container px-4 py-6 m-auto">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Side - Chart and Stock List (65%) */}
        <div className="space-y-6">
          <RealtimeStockChart symbol={selectedSymbol} />
          <ImprovedStockList onSelectStock={setSelectedSymbol} selectedSymbol={selectedSymbol} />
        </div>

        {/* Right Side - News (35%) */}
        <div>
          <NewsSection />
        </div>
      </div>
    </div>
  );
}
