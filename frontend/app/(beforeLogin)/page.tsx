'use client';

import Link from "next/link"
import { ChevronDown, TrendingUp, Sparkles, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image";

export default function Home() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const headerOffset = 64;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    const startPosition = window.pageYOffset;
    const distance = offsetPosition - startPosition;
    const duration = 1000; // 1초
    let start: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            금융 뉴스 분석 서비스
            <br />
            <span className="text-green-500">Green Wire</span>입니다
          </h1>

          <p className="text-pretty text-lg text-muted-foreground sm:text-xl md:text-2xl">
            금융 뉴스 분석 전문 솔루션입니다
          </p>

          <div className="flex justify-center pt-4">
            <button
              onClick={() => scrollToSection('charts-section')}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              aria-label="다음 섹션으로 스크롤"
            >
              <ChevronDown className="h-8 w-8 animate-bounce text-muted-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* Real-time Charts Feature */}
      <section id="charts-section" className="border-border px-4 min-h-[calc(100vh-4rem)] flex items-center scroll-mt-16">
        <div className="container mx-auto max-w-6xl py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <TrendingUp className="h-4 w-4" />
                실시간 주식 차트
              </div>

              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                실시간 주식 차트
              </h2>

              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                인터랙티브한 실시간 차트로 주가 동향을 한눈에 파악하세요. 다양한 기간과 인터벌 설정으로 원하는 정보를
                정확하게 확인할 수 있습니다.
              </p>
    

              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">1D-5Y</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">기간 선택</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Advanced Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">캔들, 라인 차트 지원</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">실시간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">업데이트</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Chart Placeholder */}
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <div className="flex h-full items-center justify-center p-0">
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Image
                      src="/stock.png"
                      alt="실시간 주식 차트"
                      width={550}
                      height={500}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-12">
            <button
              onClick={() => scrollToSection('ai-section')}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              aria-label="다음 섹션으로 스크롤"
            >
              <ChevronDown className="h-6 w-6 animate-bounce text-muted-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* AI Analysis Feature */}
      <section id="ai-section" className="px-4 py-12 scroll-mt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Image/Illustration */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-linear-to-br from-primary/5 via-background to-accent/5 shadow-lg">
                <div className="flex h-full items-center justify-center p-0">
                  <div className="space-y-4 text-center">
                    <Image
                      src="/news.png"
                      alt="실시간 주식 차트"
                      width={550}
                      height={550}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="order-1 space-y-6 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                FinBERT
              </div>

              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                AI 기반 금융 뉴스 감정 분석
              </h2>

              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                주가에 대한 최신 뉴스를 자동으로 수집하고 분석합니다. 관심 종목을 등록하면 맞춤형 뉴스 추천을 받을 수 있습니다.
              </p>

              <div className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">AI 투자 분석</CardTitle>
                        <CardDescription className="text-sm">
                          머신러닝 기반 종합 분석으로 투자 적합도를 평가합니다
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">뉴스 큐레이션</CardTitle>
                        <CardDescription className="text-sm">
                          관심 종목의 최신 뉴스를 AI가 요약하고 분석해드립니다
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 px-4 py-16">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">지금 시작하세요</h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            AI 기반 금융 분석으로 더 나은 투자 결정을 내리세요
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/login">지금 시작하기</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
