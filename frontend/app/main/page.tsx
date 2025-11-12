"use client";

import { useState } from "react";
import { RealtimeStockChart } from "@/features/main/components/RealtimeStockChart";
import { ImprovedStockList } from "@/features/main/components/ImprovedStockList";
import { NewsSection } from "@/features/main/components/NewsSection";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MainPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");

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
