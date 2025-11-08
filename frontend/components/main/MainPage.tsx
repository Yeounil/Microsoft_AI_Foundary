"use client";

import { useState } from "react";
import { NewsSection } from "@/components/main/NewsSection";
import TradingViewWidget from "@/components/main/TradingViewWidget";

interface MainPageProps {
  username: string;
  onLogout: () => void;
  onNavigateToAnalysis: () => void;
  onNavigateToWatchlist: () => void;
}

export function MainPage({ username, onLogout, onNavigateToAnalysis, onNavigateToWatchlist }: MainPageProps) {
  const [widgetExpanded, setWidgetExpanded] = useState(false);

  return (
    <main className="flex-1 container mx-auto px-6 py-6 max-w-[1600px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        {/* 좌측: 시장 현황 위젯 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-gray-900 font-semibold text-lg tracking-tight">
              시장 현황
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              실시간 업데이트
            </span>
          </div>
          <div
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            style={{
              height: widgetExpanded ? "1400px" : "700px",
            }}
          >
            <TradingViewWidget
              onExpandedChange={setWidgetExpanded}
            />
          </div>
        </div>

        {/* 우측: 뉴스 섹션 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-gray-900 font-semibold text-lg tracking-tight">
              뉴스
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              AI 감성 분석
            </span>
          </div>
          <NewsSection />
        </div>
      </div>
    </main>
  );
}
