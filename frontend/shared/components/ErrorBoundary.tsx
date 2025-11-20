'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 에러 로깅
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 외부 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);

    // TODO: Sentry 등 에러 트래킹 서비스로 전송
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/main';
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>오류가 발생했습니다</CardTitle>
              <CardDescription>
                페이지를 표시하는 중 문제가 발생했습니다.
                <br />
                잠시 후 다시 시도해 주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
                <Button onClick={this.handleGoHome} size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  홈으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// 함수형 컴포넌트를 위한 HOC
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
