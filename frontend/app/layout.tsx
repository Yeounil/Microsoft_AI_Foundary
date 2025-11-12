import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Layout from "@/shared/components/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Finance Analysis - AI 기반 증권 분석 플랫폼",
  description: "AI 기술을 활용한 실시간 주식 시장 분석, 뉴스 요약, 투자 인사이트 제공",
  keywords: "주식, AI 분석, 금융, 투자, 실시간 차트, 뉴스 분석",
  authors: [{ name: "AI Finance Team" }],
  openGraph: {
    title: "AI Finance Analysis",
    description: "AI 기술을 활용한 실시간 주식 시장 분석 플랫폼",
    type: "website",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
