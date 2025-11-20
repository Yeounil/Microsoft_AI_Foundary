"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseProgressiveLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Progressive Loading Hook
 * Intersection Observer를 사용하여 컴포넌트가 뷰포트에 들어올 때 로드합니다.
 */
export function useProgressiveLoad(options: UseProgressiveLoadOptions = {}) {
  const { threshold = 0.1, rootMargin = "50px", triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { elementRef, isVisible, hasLoaded };
}

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

/**
 * Infinite Scroll Hook
 * 리스트 끝에 도달하면 더 많은 데이터를 로드합니다.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = "100px", enabled = true } = options;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !enabled) return;

    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  }, [onLoadMore, isLoading, enabled]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, handleLoadMore, enabled]);

  return { loadMoreRef, isLoading };
}

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  animationClass?: string;
}

/**
 * Scroll Animation Hook
 * 스크롤 시 애니메이션을 트리거합니다.
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px",
    triggerOnce = true,
  } = options;

  const [isAnimated, setIsAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsAnimated(true);

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsAnimated(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { elementRef, isAnimated };
}

/**
 * Staggered Animation Hook
 * 여러 요소에 순차적 애니메이션을 적용합니다.
 */
export function useStaggeredAnimation(
  itemCount: number,
  options: { delay?: number; threshold?: number } = {}
) {
  const { delay = 100, threshold = 0.1 } = options;
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger animation
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => {
              setVisibleItems((prev) => [...prev, i]);
            }, i * delay);
          }
          observer.unobserve(container);
        }
      },
      { threshold }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [itemCount, delay, threshold]);

  const isItemVisible = useCallback(
    (index: number) => visibleItems.includes(index),
    [visibleItems]
  );

  return { containerRef, isItemVisible, visibleItems };
}
