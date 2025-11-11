'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { AnalysisSection } from '@/features/dashboard/components/AnalysisSection';
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
        <DashboardChart symbol={symbol.toUpperCase()} />
        <AnalysisSection symbol={symbol.toUpperCase()} />
      </div>
    </div>
  );
}