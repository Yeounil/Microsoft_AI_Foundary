"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { AnalysisSectionContainer } from "../containers/AnalysisSectionContainer";
import { SimpleNewsSection } from "@/features/main/components/NewsSection/SimpleNewsSection";

interface MobileTabsProps {
  symbol: string;
}

export function MobileTabs({ symbol }: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState("analysis");

  const handleSwipeLeft = () => {
    if (activeTab === "analysis") setActiveTab("news");
  };

  const handleSwipeRight = () => {
    if (activeTab === "news") setActiveTab("analysis");
  };

  const swipeHandlers = useSwipeGesture(handleSwipeLeft, handleSwipeRight);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 bg-background">
        <TabsTrigger
          value="analysis"
          className="data-[state=active]:font-semibold min-h-[48px] touch-manipulation active:scale-95 transition-transform"
        >
          종목 분석
        </TabsTrigger>
        <TabsTrigger
          value="news"
          className="data-[state=active]:font-semibold min-h-[48px] touch-manipulation active:scale-95 transition-transform"
        >
          관련 뉴스
        </TabsTrigger>
      </TabsList>

      <div {...swipeHandlers}>
        <TabsContent value="analysis" className="mt-4 min-h-[400px]">
          <AnalysisSectionContainer symbol={symbol} />
        </TabsContent>

        <TabsContent value="news" className="mt-4 min-h-[400px]">
          <SimpleNewsSection symbol={symbol} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
