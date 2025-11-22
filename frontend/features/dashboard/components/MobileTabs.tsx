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
      <TabsList className="grid w-full grid-cols-2 bg-transparent border-b rounded-none p-0 h-auto">
        <TabsTrigger
          value="analysis"
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold min-h-[48px] relative pb-2 rounded-none transition-colors duration-200 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
        >
          종목 분석
        </TabsTrigger>
        <TabsTrigger
          value="news"
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold min-h-[48px] relative pb-2 rounded-none transition-colors duration-200 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
        >
          관련 뉴스
        </TabsTrigger>
      </TabsList>

      <div {...swipeHandlers} className="transition-opacity duration-200">
        <TabsContent value="analysis" className="mt-3 min-h-[400px] animate-in fade-in-0 duration-200">
          <AnalysisSectionContainer symbol={symbol} />
        </TabsContent>

        <TabsContent value="news" className="mt-3 min-h-[400px] animate-in fade-in-0 duration-200">
          <SimpleNewsSection symbol={symbol} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
