"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface UseVirtualScrollOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

interface VirtualItem<T> {
  index: number;
  item: T;
  style: React.CSSProperties;
}

/**
 * Virtual Scroll Hook
 * 대량의 리스트 아이템을 효율적으로 렌더링합니다.
 */
export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
) {
  const { itemHeight, overscan = 3, containerHeight: fixedHeight } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(fixedHeight || 400);

  // Container 높이 업데이트
  useEffect(() => {
    if (fixedHeight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContainerHeight(fixedHeight);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fixedHeight]);

  // 스크롤 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 가시 영역 계산
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight;

    // 보이는 아이템 인덱스 계산
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleCount + overscan * 2
    );

    // 가상 아이템 생성
    const virtualItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        item: items[i],
        style: {
          position: "absolute",
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }

    return { virtualItems, totalHeight, startIndex, endIndex };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // 특정 인덱스로 스크롤
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container) return;

      const targetTop = index * itemHeight;
      container.scrollTo({
        top: targetTop,
        behavior,
      });
    },
    [itemHeight]
  );

  return {
    containerRef,
    containerProps: {
      ref: containerRef,
      onScroll: handleScroll,
      style: {
        height: fixedHeight || "100%",
        overflow: "auto",
        position: "relative" as const,
      },
    },
    virtualItems,
    totalHeight,
    scrollToIndex,
    visibleRange: { startIndex, endIndex },
  };
}

/**
 * Simple Virtual List Hook
 * 더 간단한 가상 스크롤 구현
 */
export function useSimpleVirtualList<T>(
  items: T[],
  options: {
    itemsPerPage?: number;
    initialPage?: number;
  } = {}
) {
  const { itemsPerPage = 50, initialPage = 1 } = options;
  const [page, setPage] = useState(initialPage);
  const [loadedItems, setLoadedItems] = useState<T[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 현재까지 로드된 아이템
  useEffect(() => {
    const endIndex = page * itemsPerPage;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadedItems(items.slice(0, endIndex));
  }, [items, page, itemsPerPage]);

  // 더 많은 아이템 로드
  const loadMore = useCallback(() => {
    const maxPage = Math.ceil(items.length / itemsPerPage);
    if (page < maxPage) {
      setPage((prev) => prev + 1);
    }
  }, [items.length, itemsPerPage, page]);

  // 더 로드할 아이템이 있는지
  const hasMore = loadedItems.length < items.length;

  // Intersection Observer로 자동 로드
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [loadMore, hasMore]);

  // 리셋
  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    items: loadedItems,
    loadMoreRef,
    hasMore,
    loadMore,
    reset,
    totalItems: items.length,
    loadedCount: loadedItems.length,
  };
}
