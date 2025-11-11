import { StockChart } from '@/features/main/components/StockChart';
import { StockList } from '@/features/main/components/StockList';
import { NewsSection } from '@/features/main/components/NewsSection';

export default function MainPage() {
  return (
    <div className="container px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Side - Chart and Stock List (65%) */}
        <div className="space-y-6">
          <StockChart />
          <StockList />
        </div>

        {/* Right Side - News (35%) */}
        <div>
          <NewsSection />
        </div>
      </div>
    </div>
  );
}