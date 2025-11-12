'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { AnalysisSection } from '@/features/dashboard/components/AnalysisSection';
import { NewsSection } from '@/features/main/components/NewsSection';
import { useStockStore } from '@/store/stock-store';

export default function DashboardPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const { selectStock } = useStockStore();

  useEffect(() => {
    if (symbol) {
      selectStock(symbol.toUpperCase());
    }
  }, [symbol, selectStock]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Chart at top - full width */}
        <DashboardChart symbol={symbol.toUpperCase()} />

        {/* Analysis and News side by side - 5:5 (50:50) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Side - Analysis (50%) */}
          <div>
            <AnalysisSection symbol={symbol.toUpperCase()} />
          </div>

          {/* Right Side - News (50%) */}
          <div>
            <NewsSection />
          </div>
        </div>
      </div>
    </div>
  );
}