'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { analysisAPI } from '@/services/api';
import { StockAnalysis as StockAnalysisType } from '@/types/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockAnalysisProps {
  symbol: string;
  market: string;
  companyName: string;
}

export default function StockAnalysis({ symbol, market, companyName }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<StockAnalysisType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleAnalyze = async () => {
    if (!symbol) return;

    setLoading(true);
    setError('');

    try {
      const result = await analysisAPI.analyzeStock(symbol, market, '1y');
      setAnalysis(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'AI 분석 중 오류가 발생했습니다.');
      console.error('분석 오류:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI 투자 분석
          </h2>
          <Button
            onClick={handleAnalyze}
            disabled={loading || !symbol}
            variant="secondary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                AI 분석 시작
              </>
            )}
          </Button>
        </div>

        {!analysis && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-base text-muted-foreground">
              '{companyName || symbol}' 주식에 대한 AI 분석을 시작해보세요.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              OpenAI를 활용한 전문적인 투자 분석을 제공합니다.
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-destructive text-base mb-2">
              {error}
            </p>
            <Button onClick={handleAnalyze} variant="outline" size="sm">
              다시 시도
            </Button>
          </div>
        )}

        {analysis && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {analysis.symbol}
              </Badge>
              <span className="text-sm text-muted-foreground">
                현재가: {analysis.currency === 'KRW' ? '₩' : '$'}
                {analysis.current_price.toLocaleString()}
              </span>
            </div>

            <Card className="bg-background border">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  📊 AI 분석 보고서
                </h3>

                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysis.analysis}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ 본 분석은 AI가 생성한 참고 자료이며, 투자 결정은 신중히 하시기 바랍니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .prose h2 {
          font-size: 1.5rem;
        }
        .prose h3 {
          font-size: 1.25rem;
        }
        .prose p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        .prose ul, .prose ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .prose li {
          margin-bottom: 0.25rem;
        }
        .prose strong {
          font-weight: bold;
        }
        .prose em {
          font-style: italic;
        }
        .prose code {
          background-color: rgba(0,0,0,0.05);
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.875rem;
        }
        .prose pre {
          background-color: rgba(0,0,0,0.05);
          padding: 1rem;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 0.75rem;
        }
      `}</style>
    </Card>
  );
}
