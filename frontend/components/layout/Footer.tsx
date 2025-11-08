'use client';

import { TrendingUp } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-muted mt-auto">
      <div className="container mx-auto px-6 py-12 max-w-[1280px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* 로고 및 설명 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-foreground font-semibold">AI 증권분석</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI 기술을 활용한 금융 데이터 분석 및<br />
              실시간 시장 정보 제공 플랫폼
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 AI 증권분석. All rights reserved.
            </p>
          </div>

          {/* 투자 유의사항 */}
          <div className="space-y-3">
            <h4 className="text-foreground font-semibold">⚠️ 투자 유의사항</h4>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                본 서비스는 AI 기반 분석 정보를 제공합니다.
              </p>
              <p>
                제공되는 정보는 투자 참고용이며, 투자 결정은 반드시 본인의 판단과 책임 하에 이루어져야 합니다.
              </p>
              <p className="text-destructive">
                AI 분석 결과만으로 투자 결정을 내리지 마시기 바랍니다.
              </p>
            </div>
          </div>

          {/* 기술 스택 */}
          <div className="space-y-3">
            <h4 className="text-foreground font-semibold">기술 정보</h4>
            <div className="space-y-2">
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">데이터 제공</p>
                <p className="text-foreground">• TradingView</p>
                <p className="text-foreground">• 실시간 시장 데이터</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">AI 분석 엔진</p>
                <p className="text-foreground">• 자연어 처리 기술</p>
                <p className="text-foreground">• 감성 분석 모델</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
