'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { AnalysisSection } from '@/features/dashboard/components/AnalysisSection';
import { NewsSection } from '@/features/main/components/NewsSection';
import { useStockStore } from '@/store/stock-store';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const { selectStock } = useStockStore();

  useEffect(() => {
    if (symbol) {
      selectStock(symbol.toUpperCase());
    }
  }, [symbol, selectStock]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
      </div>

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