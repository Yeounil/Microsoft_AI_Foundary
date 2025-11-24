"use client";

import { ReactNode, Suspense, lazy, ComponentType } from "react";
import { useProgressiveLoad, useScrollAnimation, useStaggeredAnimation } from "@/hooks/useProgressiveLoad";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProgressiveLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  minHeight?: string;
}

/**
 * Progressive Loader 컴포넌트
 * 뷰포트에 들어올 때 컨텐츠를 로드합니다.
 */
export function ProgressiveLoader({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = "100px",
  className = "",
  minHeight = "200px",
}: ProgressiveLoaderProps) {
  const { elementRef, hasLoaded } = useProgressiveLoad({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  return (
    <div ref={elementRef} className={className} style={{ minHeight: hasLoaded ? "auto" : minHeight }}>
      {hasLoaded ? (
        children
      ) : (
        fallback || (
          <div className="flex items-center justify-center h-full py-8">
            <LoadingSpinner size="md" />
          </div>
        )
      )}
    </div>
  );
}

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale";
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
}

/**
 * Animated Section 컴포넌트
 * 스크롤 시 애니메이션을 적용합니다.
 */
export function AnimatedSection({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 500,
  className = "",
  threshold = 0.1,
}: AnimatedSectionProps) {
  const { elementRef, isAnimated } = useScrollAnimation({
    threshold,
    triggerOnce: true,
  });

  const animationStyles = {
    "fade-up": {
      initial: "opacity-0 translate-y-8",
      animated: "opacity-100 translate-y-0",
    },
    "fade-in": {
      initial: "opacity-0",
      animated: "opacity-100",
    },
    "slide-left": {
      initial: "opacity-0 -translate-x-8",
      animated: "opacity-100 translate-x-0",
    },
    "slide-right": {
      initial: "opacity-0 translate-x-8",
      animated: "opacity-100 translate-x-0",
    },
    scale: {
      initial: "opacity-0 scale-95",
      animated: "opacity-100 scale-100",
    },
  };

  const style = animationStyles[animation];

  return (
    <div
      ref={elementRef}
      className={`transform transition-all ease-out ${
        isAnimated ? style.animated : style.initial
      } ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale";
  className?: string;
  itemClassName?: string;
}

/**
 * Staggered List 컴포넌트
 * 리스트 아이템을 순차적으로 애니메이션합니다.
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  animation = "fade-up",
  className = "",
  itemClassName = "",
}: StaggeredListProps) {
  const { containerRef, isItemVisible } = useStaggeredAnimation(children.length, {
    delay: staggerDelay,
    threshold: 0.1,
  });

  const animationStyles = {
    "fade-up": {
      initial: "opacity-0 translate-y-4",
      animated: "opacity-100 translate-y-0",
    },
    "fade-in": {
      initial: "opacity-0",
      animated: "opacity-100",
    },
    "slide-left": {
      initial: "opacity-0 -translate-x-4",
      animated: "opacity-100 translate-x-0",
    },
    "slide-right": {
      initial: "opacity-0 translate-x-4",
      animated: "opacity-100 translate-x-0",
    },
    scale: {
      initial: "opacity-0 scale-95",
      animated: "opacity-100 scale-100",
    },
  };

  const style = animationStyles[animation];

  return (
    <div ref={containerRef} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transform transition-all duration-300 ease-out ${
            isItemVisible(index) ? style.animated : style.initial
          } ${itemClassName}`}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

interface LazyComponentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

/**
 * Lazy Component 래퍼
 * React.lazy와 Suspense를 결합합니다.
 */
/* eslint-disable */
export function LazyComponent({
  loader,
  fallback,
  props = {},
}: LazyComponentProps) {
  const Component = lazy(loader);

  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )
      }
    >
      <Component {...props} />
    </Suspense>
  );
}
