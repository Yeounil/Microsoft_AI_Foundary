"use client";

import { use } from 'react';
import { NewsReport } from '@/components/news-analysis/NewsReport';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function NewsReportPage({ params }: PageProps) {
  const { id } = use(params);
  return <NewsReport newsId={id} />;
}
