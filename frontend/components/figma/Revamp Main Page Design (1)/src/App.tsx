import { useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { NewsSection } from "./components/NewsSection";
import TradingViewWidget from "./components/TradingViewWidget";

export default function App() {
  const [widgetExpanded, setWidgetExpanded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-6 py-8 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
          {/* 좌측: 시장 현황 위젯 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground">시장 현황</h2>
              <p className="text-sm text-muted-foreground">
                실시간 업데이트
              </p>
            </div>
            <div
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300"
              style={{
                height: widgetExpanded ? "1000px" : "700px",
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
              <h2 className="text-foreground">뉴스</h2>
              <p className="text-sm text-muted-foreground">
                AI 감성 분석
              </p>
            </div>
            <NewsSection />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}