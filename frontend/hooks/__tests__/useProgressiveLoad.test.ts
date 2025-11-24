import { renderHook } from "@testing-library/react";
import { useProgressiveLoad, useScrollAnimation, useStaggeredAnimation } from "../useProgressiveLoad";

// IntersectionObserver mock
beforeEach(() => {
  const mockIntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe("useProgressiveLoad", () => {
  it("초기 상태가 올바르게 설정됨", () => {
    const { result } = renderHook(() => useProgressiveLoad());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.elementRef.current).toBe(null);
  });

  it("기본 옵션이 적용됨", () => {
    const { result } = renderHook(() => useProgressiveLoad());

    expect(result.current.elementRef).toBeDefined();
    expect(result.current.isVisible).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
  });

  it("커스텀 옵션이 적용됨", () => {
    const { result } = renderHook(() =>
      useProgressiveLoad({
        threshold: 0.5,
        rootMargin: "100px",
        triggerOnce: false,
      })
    );

    expect(result.current.elementRef).toBeDefined();
  });
});

describe("useScrollAnimation", () => {
  it("초기 상태가 올바르게 설정됨", () => {
    const { result } = renderHook(() => useScrollAnimation());

    expect(result.current.isAnimated).toBe(false);
    expect(result.current.elementRef.current).toBe(null);
  });

  it("커스텀 옵션이 적용됨", () => {
    const { result } = renderHook(() =>
      useScrollAnimation({
        threshold: 0.5,
        rootMargin: "100px",
        triggerOnce: false,
      })
    );

    expect(result.current.isAnimated).toBe(false);
    expect(result.current.elementRef).toBeDefined();
  });
});

describe("useStaggeredAnimation", () => {
  it("초기 상태가 올바르게 설정됨", () => {
    const { result } = renderHook(() => useStaggeredAnimation(5));

    expect(result.current.containerRef.current).toBe(null);
    expect(result.current.visibleItems).toEqual([]);
  });

  it("isItemVisible 함수가 올바르게 동작", () => {
    const { result } = renderHook(() => useStaggeredAnimation(3));

    // 초기에는 모든 아이템이 보이지 않음
    expect(result.current.isItemVisible(0)).toBe(false);
    expect(result.current.isItemVisible(1)).toBe(false);
    expect(result.current.isItemVisible(2)).toBe(false);
  });

  it("커스텀 옵션이 적용됨", () => {
    const { result } = renderHook(() =>
      useStaggeredAnimation(3, { delay: 200, threshold: 0.5 })
    );

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.visibleItems).toEqual([]);
  });
});
