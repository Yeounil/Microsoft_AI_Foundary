import { renderHook, act } from "@testing-library/react";
import { useHoverPrefetch } from "../usePrefetch";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock timer
jest.useFakeTimers();

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useHoverPrefetch", () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it("should return event handlers", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () => useHoverPrefetch(["test-key"], mockQueryFn),
      { wrapper: createWrapper() }
    );

    expect(result.current.onMouseEnter).toBeDefined();
    expect(result.current.onMouseLeave).toBeDefined();
    expect(result.current.onFocus).toBeDefined();
    expect(result.current.onBlur).toBeDefined();
  });

  it("should prefetch data after delay on mouse enter", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () =>
        useHoverPrefetch(["test-key"], mockQueryFn, {
          delay: 100,
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    // Before delay
    expect(mockQueryFn).not.toHaveBeenCalled();

    // After delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockQueryFn).toHaveBeenCalledTimes(1);
  });

  it("should cancel prefetch on mouse leave before delay", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () =>
        useHoverPrefetch(["test-key"], mockQueryFn, {
          delay: 100,
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    // Leave before delay completes
    act(() => {
      jest.advanceTimersByTime(50);
      result.current.onMouseLeave();
    });

    // Complete remaining time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockQueryFn).not.toHaveBeenCalled();
  });

  it("should only prefetch once", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () =>
        useHoverPrefetch(["test-key"], mockQueryFn, {
          delay: 100,
        }),
      { wrapper: createWrapper() }
    );

    // First hover
    act(() => {
      result.current.onMouseEnter();
      jest.advanceTimersByTime(100);
    });

    // Second hover
    act(() => {
      result.current.onMouseLeave();
      result.current.onMouseEnter();
      jest.advanceTimersByTime(100);
    });

    // Should only be called once
    expect(mockQueryFn).toHaveBeenCalledTimes(1);
  });

  it("should use default delay if not specified", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () => useHoverPrefetch(["test-key"], mockQueryFn),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    // Default delay is 100ms
    act(() => {
      jest.advanceTimersByTime(99);
    });

    expect(mockQueryFn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(mockQueryFn).toHaveBeenCalledTimes(1);
  });

  it("should trigger on focus event", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () =>
        useHoverPrefetch(["test-key"], mockQueryFn, {
          delay: 100,
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onFocus();
      jest.advanceTimersByTime(100);
    });

    expect(mockQueryFn).toHaveBeenCalledTimes(1);
  });

  it("should cancel on blur event", () => {
    const mockQueryFn = jest.fn().mockResolvedValue({ data: "test" });

    const { result } = renderHook(
      () =>
        useHoverPrefetch(["test-key"], mockQueryFn, {
          delay: 100,
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.onFocus();
      jest.advanceTimersByTime(50);
      result.current.onBlur();
      jest.advanceTimersByTime(100);
    });

    expect(mockQueryFn).not.toHaveBeenCalled();
  });
});
