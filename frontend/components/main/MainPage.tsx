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
    <main className="flex-1 bg-gray-50">
      <div className="container mx-auto px-6 py-6 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
          {/* 좌측: 시장 현황 위젯 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900 font-bold text-base">
                시장 현황
              </h2>
              <span className="text-xs text-gray-500">
                실시간 업데이트
              </span>
            </div>
            <div
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900 font-bold text-base">
                AI 뉴스 분석
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-700 font-medium">AI 감성 분석</span>
              </div>
            </div>
            <NewsSection />
          </div>
        </div>
      </div>
    </main>
  );
}
