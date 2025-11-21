"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StockAnalysis } from "@/types";
import { useDevice } from "@/hooks/useDevice";

interface BasicDataCardProps {
  analysis: StockAnalysis;
}

const DATA_ITEMS = [
  { key: "marketCap", label: "시가총액", value: "$2.8T", description: "현재 주가와 발행 주식수를 기반으로 한 회사의 총 가치" },
  { key: "peRatio", label: "P/E 비율", getValue: (a: StockAnalysis) => a.financial_ratios?.pe_ratio || "N/A", description: "주가수익비율로 주가가 수익 대비 얼마나 높은지 나타내는 지표" },
  { key: "high52", label: "52주 최고가", value: "$315.49", description: "지난 52주간 기록한 최고 주가" },
  { key: "low52", label: "52주 최저가", value: "$224.96", description: "지난 52주간 기록한 최저 주가" },
  { key: "avgVolume", label: "평균 거래량", value: "58.2M", description: "일일 평균 거래량" },
  { key: "dividend", label: "배당 수익률", value: "0.52%", description: "주가 대비 연간 배당금 비율" },
];

export const BasicDataCard = memo(function BasicDataCard({ analysis }: BasicDataCardProps) {
  const { isMobile } = useDevice();

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">기본 데이터</CardTitle>
        <CardDescription className="text-xs">
          주요 재무 및 시장 지표
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center">
        {isMobile ? (
          <Accordion type="single" collapsible className="w-full">
            {DATA_ITEMS.map((item) => {
              const value = item.getValue ? item.getValue(analysis) : item.value;
              return (
                <AccordionItem key={item.key} value={item.key}>
                  <AccordionTrigger className="py-3">
                    <div className="flex justify-between w-full pr-2">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm font-semibold">{value}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="grid gap-2 grid-cols-2 w-full">
            {DATA_ITEMS.map((item) => {
              const value = item.getValue ? item.getValue(analysis) : item.value;
              return <DataItem key={item.key} label={item.label} value={value} />;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

function DataItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
