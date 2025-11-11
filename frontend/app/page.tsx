import Link from "next/link"
import { ChevronDown, TrendingUp, Sparkles, BookOpen, BarChart3, Shield, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            AI 금융 분석에
            <br />
            오신 것을 환영합니다
          </h1>

          <p className="text-pretty text-lg text-muted-foreground sm:text-xl md:text-2xl">
            주식 시장 분석을 위한 원스톱 솔루션입니다
          </p>

          <div className="flex justify-center pt-4">
            <ChevronDown className="h-8 w-8 animate-bounce text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Real-time Charts Feature */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <TrendingUp className="h-4 w-4" />
                실시간 데이터
              </div>

              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                실시간 주식 차트
              </h2>

              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                인터랙티브한 실시간 차트로 시장 동향을 한눈에 파악하세요. 다양한 기간과 인터벌 설정으로 원하는 정보를
                정확하게 확인할 수 있습니다.
              </p>

              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">1D-1Y</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">기간 선택</p>
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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">자동</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">새로고침</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <div className="flex h-full items-center justify-center p-8">
                <div className="space-y-4 text-center">
                  <BarChart3 className="h-16 w-16 mx-auto text-primary/30" />
                  <p className="text-sm text-muted-foreground">
                    실시간 주식 차트 미리보기
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-12">
            <ChevronDown className="h-6 w-6 animate-bounce text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* AI Analysis Feature */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Image/Illustration */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-lg">
                <div className="flex h-full items-center justify-center p-8">
                  <div className="space-y-4 text-center">
                    <Sparkles className="h-20 w-20 mx-auto text-primary/30" />
                    <p className="text-sm text-muted-foreground">AI 분석 시스템</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="order-1 space-y-6 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                AI 기술
              </div>

              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                AI 기반 분석 및 뉴스
              </h2>

              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                선택한 주식에 대한 최신 뉴스를 AI가 자동으로 수집하고 분석합니다. 관심 종목을 등록하면 맞춤형 뉴스
                추천을 받을 수 있습니다.
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
      <section className="border-t border-border bg-muted/30 px-4 py-20">
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
