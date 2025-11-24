import { renderHook, act } from "@testing-library/react";
import { useVirtualScroll, useSimpleVirtualList } from "../useVirtualScroll";

describe("useVirtualScroll", () => {
  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  describe("basic functionality", () => {
    it("should return empty virtualItems for empty array", () => {
      const { result } = renderHook(() =>
        useVirtualScroll([], { itemHeight: 50 })
      );

      expect(result.current.virtualItems).toHaveLength(0);
      expect(result.current.totalHeight).toBe(0);
    });

    it("should calculate correct total height", () => {
      const items = createItems(100);
      const itemHeight = 50;

      const { result } = renderHook(() =>
        useVirtualScroll(items, { itemHeight })
      );

      expect(result.current.totalHeight).toBe(items.length * itemHeight);
    });

    it("should return virtual items with correct styles", () => {
      const items = createItems(10);
      const itemHeight = 50;

      const { result } = renderHook(() =>
        useVirtualScroll(items, { itemHeight, containerHeight: 200 })
      );

      result.current.virtualItems.forEach((virtualItem) => {
        expect(virtualItem.style.position).toBe("absolute");
        expect(virtualItem.style.height).toBe(itemHeight);
        expect(virtualItem.style.top).toBe(virtualItem.index * itemHeight);
      });
    });

    it("should include overscan items", () => {
      const items = createItems(100);
      const { result } = renderHook(() =>
        useVirtualScroll(items, {
          itemHeight: 50,
          containerHeight: 200,
          overscan: 5,
        })
      );

      // With containerHeight 200 and itemHeight 50, visible count is 4
      // With overscan 5, we should have more items rendered
      expect(result.current.virtualItems.length).toBeGreaterThan(4);
    });

    it("should return container props", () => {
      const { result } = renderHook(() =>
        useVirtualScroll([], { itemHeight: 50, containerHeight: 300 })
      );

      expect(result.current.containerProps).toBeDefined();
      expect(result.current.containerProps.style.height).toBe(300);
      expect(result.current.containerProps.style.overflow).toBe("auto");
      expect(result.current.containerProps.style.position).toBe("relative");
    });
  });

  describe("visible range calculation", () => {
    it("should calculate correct visible range", () => {
      const items = createItems(100);

      const { result } = renderHook(() =>
        useVirtualScroll(items, {
          itemHeight: 50,
          containerHeight: 200,
          overscan: 0,
        })
      );

      expect(result.current.visibleRange.startIndex).toBe(0);
      // With 200px container and 50px items, we can see 4 items
      expect(result.current.visibleRange.endIndex).toBeLessThanOrEqual(4);
    });
  });

  describe("scrollToIndex", () => {
    it("should provide scrollToIndex function", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(createItems(100), { itemHeight: 50 })
      );

      expect(typeof result.current.scrollToIndex).toBe("function");
    });
  });

  describe("update behavior", () => {
    it("should update when items change", () => {
      const { result, rerender } = renderHook(
        ({ items }) => useVirtualScroll(items, { itemHeight: 50 }),
        { initialProps: { items: createItems(10) } }
      );

      expect(result.current.totalHeight).toBe(500);

      rerender({ items: createItems(20) });

      expect(result.current.totalHeight).toBe(1000);
    });
  });
});

describe("useSimpleVirtualList", () => {
  const createItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  describe("basic functionality", () => {
    it("should return first page of items", () => {
      const items = createItems(100);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10 })
      );

      expect(result.current.items).toHaveLength(10);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.totalItems).toBe(100);
      expect(result.current.loadedCount).toBe(10);
    });

    it("should load more items when loadMore is called", () => {
      const items = createItems(100);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10 })
      );

      expect(result.current.items).toHaveLength(10);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.items).toHaveLength(20);
    });

    it("should respect initial page", () => {
      const items = createItems(100);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10, initialPage: 3 })
      );

      expect(result.current.items).toHaveLength(30);
    });

    it("should set hasMore to false when all items are loaded", () => {
      const items = createItems(15);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10 })
      );

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
      expect(result.current.items).toHaveLength(15);
    });

    it("should not load more than available items", () => {
      const items = createItems(15);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10 })
      );

      act(() => {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      });

      expect(result.current.items).toHaveLength(15);
    });

    it("should reset to first page", () => {
      const items = createItems(100);

      const { result } = renderHook(() =>
        useSimpleVirtualList(items, { itemsPerPage: 10 })
      );

      act(() => {
        result.current.loadMore();
        result.current.loadMore();
      });

      expect(result.current.items).toHaveLength(30);

      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toHaveLength(10);
    });
  });

  describe("update behavior", () => {
    it("should update when items array changes", () => {
      const { result, rerender } = renderHook(
        ({ items }) => useSimpleVirtualList(items, { itemsPerPage: 10 }),
        { initialProps: { items: createItems(50) } }
      );

      expect(result.current.totalItems).toBe(50);

      rerender({ items: createItems(100) });

      expect(result.current.totalItems).toBe(100);
    });
  });

  describe("loadMoreRef", () => {
    it("should provide loadMoreRef", () => {
      const { result } = renderHook(() =>
        useSimpleVirtualList(createItems(100))
      );

      expect(result.current.loadMoreRef).toBeDefined();
    });
  });
});
