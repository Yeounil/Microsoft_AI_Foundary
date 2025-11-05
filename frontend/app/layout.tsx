'use client';

import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { useState } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <html lang="ko">
      <head>
        <title>I NEED RED - 금융 종목 분석</title>
        <meta name="description" content="AI 기반 금융 종목 분석 및 뉴스 서비스" />
      </head>
      <body>
        <Providers>
          <Header isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
