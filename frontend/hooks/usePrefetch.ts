"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Link Prefetch Hook
 * 링크 위에 마우스를 올리면 페이지를 프리페치합니다.
 */
export function useLinkPrefetch() {
  const router = useRouter();
  const prefetchedUrls = useRef(new Set<string>());

  const prefetch = useCallback(
    (url: string) => {
      if (prefetchedUrls.current.has(url)) return;

      prefetchedUrls.current.add(url);
      router.prefetch(url);
    },
    [router]
  );

  const createPrefetchHandlers = useCallback(
    (url: string) => ({
      onMouseEnter: () => prefetch(url),
      onFocus: () => prefetch(url),
    }),
    [prefetch]
  );

  return { prefetch, createPrefetchHandlers };
}

interface QueryPrefetchOptions {
  staleTime?: number;
}

/**
 * Query Prefetch Hook
 * 데이터를 미리 페칭합니다.
 */
export function useQueryPrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    async <T>(
      queryKey: unknown[],
      queryFn: () => Promise<T>,
      options: QueryPrefetchOptions = {}
    ) => {
      const { staleTime = 60000 } = options;

      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    },
    [queryClient]
  );

  const prefetchInfiniteQuery = useCallback(
    async <T>(
      queryKey: unknown[],
      queryFn: ({ pageParam }: { pageParam: number }) => Promise<T>,
      options: QueryPrefetchOptions = {}
    ) => {
      const { staleTime = 60000 } = options;

      await queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn,
        staleTime,
        initialPageParam: 0,
      });
    },
    [queryClient]
  );

  return { prefetchQuery, prefetchInfiniteQuery };
}

/**
 * Viewport Prefetch Hook
 * 뷰포트에 진입하면 데이터를 프리페치합니다.
 */
export function useViewportPrefetch<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: {
    threshold?: number;
    staleTime?: number;
  } = {}
) {
  const { threshold = 0.1, staleTime = 60000 } = options;
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const elementRef = useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!element) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasPrefetched.current) {
            hasPrefetched.current = true;
            queryClient.prefetchQuery({
              queryKey,
              queryFn,
              staleTime,
            });
          }
        },
        { threshold }
      );

      observerRef.current.observe(element);
    },
    [queryClient, queryKey, queryFn, staleTime, threshold]
  );

  return { elementRef };
}

/**
 * Hover Prefetch Hook
 * 요소에 마우스를 올리면 데이터를 프리페치합니다.
 */
export function useHoverPrefetch<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: {
    delay?: number;
    staleTime?: number;
  } = {}
) {
  const { delay = 100, staleTime = 60000 } = options;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (hasPrefetched.current) return;

    timeoutRef.current = setTimeout(() => {
      hasPrefetched.current = true;
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    }, delay);
  }, [queryClient, queryKey, queryFn, staleTime, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
  };
}

/**
 * Stock Data Prefetch Hook
 * 주식 데이터를 미리 페칭합니다.
 */
export function useStockPrefetch() {
  const { prefetchQuery } = useQueryPrefetch();
  const { prefetch: prefetchLink } = useLinkPrefetch();

  const prefetchStockData = useCallback(
    async (symbol: string) => {
      // 대시보드 페이지 프리페치
      prefetchLink(`/dashboard/${symbol}`);

      // TODO: API 클라이언트 연결 시 활성화
      // await prefetchQuery(
      //   ["stock", symbol, "price"],
      //   () => apiClient.getStockPrice(symbol),
      //   { staleTime: 30000 }
      // );
    },
    [prefetchLink]
  );

  return { prefetchStockData };
}
