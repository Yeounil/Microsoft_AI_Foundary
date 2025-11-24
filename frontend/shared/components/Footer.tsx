import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Left: Company Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" color="green" />
              <span className="text-xl font-bold sm:inline text-green-600">
                Green Wire
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              AI 기술을 활용한 금융 데이터 분석 및 실시간 시장 정보 제공 플랫폼
            </p>
          </div>

          {/* Right: Copyright & Investment Warning */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-sm text-muted-foreground">
              © 2025 Green Wire. All rights reserved.
            </p>

            {/* Investment Warning */}
            <p className="text-xs text-muted-foreground max-w-md text-left md:text-right">
              투자 유의사항: 본 서비스는 투자 참고 자료이며, 투자 결정에 대한 책임은 투자자 본인에게 있습니다. 과거 수익률이 미래 수익을 보장하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
