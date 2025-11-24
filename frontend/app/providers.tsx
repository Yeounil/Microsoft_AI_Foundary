'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

// Service Worker 등록
function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }
  }, []);
}

// 클라이언트 생성 함수 (SSR-safe)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 캐싱 전략
        staleTime: 5 * 60 * 1000, // 5분 (차트 데이터는 자주 변하지 않음)
        gcTime: 30 * 60 * 1000, // 30분 (가비지 컬렉션 시간 증가)

        // Refetch 전략
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true, // 네트워크 재연결 시 refetch

        // 재시도 전략
        retry: (failureCount, error) => {
          // 4xx 에러는 재시도하지 않음
          const axiosError = error as { response?: { status?: number } };
          if (axiosError?.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            return false;
          }
          // 서버 에러는 2번까지 재시도
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

// 브라우저에서는 싱글톤 사용
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 서버에서는 항상 새 클라이언트 생성
    return makeQueryClient();
  } else {
    // 브라우저에서는 싱글톤 사용
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // 클라이언트를 한 번만 생성 (useState 초기값으로)
  const [queryClient] = useState(getQueryClient);

  // Service Worker 등록
  useServiceWorker();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" richColors closeButton />
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}