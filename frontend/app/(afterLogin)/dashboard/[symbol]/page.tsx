'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardChartContainer } from '@/features/dashboard/containers/DashboardChartContainer';
import { AnalysisSectionContainer } from '@/features/dashboard/containers/AnalysisSectionContainer';
import { SimpleNewsSection } from '@/features/main/components/NewsSection/SimpleNewsSection';
import { MobileTabs } from '@/features/dashboard/components/MobileTabs';
import { useStockStore } from '@/store/stock-store';
import { useDevice } from '@/hooks/useDevice';
import { AnimatedSection } from '@/shared/components/ProgressiveLoader';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const { selectStock } = useStockStore();
  const { isMobile } = useDevice();

  useEffect(() => {
    if (symbol) {
      selectStock(symbol.toUpperCase());
    }
  }, [symbol, selectStock]);

  return (
    <div className="container mx-auto px-3 py-4 md:px-4 md:py-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 min-h-[44px] px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Chart at top - full width */}
        <AnimatedSection animation="fade-in" duration={300}>
          <DashboardChartContainer symbol={symbol.toUpperCase()} />
        </AnimatedSection>

        {/* 모바일: 탭 레이아웃 */}
        {isMobile ? (
          <MobileTabs symbol={symbol.toUpperCase()} />
        ) : (
          /* 태블릿/데스크탑: 그리드 레이아웃 */
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Left Side - Analysis (50%) */}
            <AnimatedSection animation="fade-up" delay={100}>
              <AnalysisSectionContainer symbol={symbol.toUpperCase()} />
            </AnimatedSection>

            {/* Right Side - News (50%) */}
            <AnimatedSection animation="fade-up" delay={200}>
              <SimpleNewsSection symbol={symbol.toUpperCase()} />
            </AnimatedSection>
          </div>
        )}
      </div>
    </div>
  );
}