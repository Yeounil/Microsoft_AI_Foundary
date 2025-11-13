import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StockAnalysis } from "@/types";

interface BasicDataCardProps {
  analysis: StockAnalysis;
}

export function BasicDataCard({ analysis }: BasicDataCardProps) {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">기본 데이터</CardTitle>
        <CardDescription className="text-xs">
          주요 재무 및 시장 지표
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center">
        <div className="grid gap-3 grid-cols-2 w-full">
          <DataItem label="시가총액" value="$2.8T" />
          <DataItem
            label="P/E 비율"
            value={analysis.financial_ratios?.pe_ratio || "N/A"}
          />
          <DataItem label="52주 최고가" value="$315.49" />
          <DataItem label="52주 최저가" value="$224.96" />
          <DataItem label="평균 거래량" value="58.2M" />
          <DataItem label="배당 수익률" value="0.52%" />
        </div>
      </CardContent>
    </Card>
  );
}

function DataItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}
