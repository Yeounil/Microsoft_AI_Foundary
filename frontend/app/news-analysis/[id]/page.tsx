"use client";

import { use } from 'react';
import { NewsAnalysisPage } from '@/components/news-analysis/NewsAnalysisPage';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function NewsAnalysis({ params }: PageProps) {
  const { id } = use(params);
  return <NewsAnalysisPage newsId={id} />;
}
