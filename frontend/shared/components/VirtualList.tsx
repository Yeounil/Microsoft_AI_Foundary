"use client";

import { ReactNode } from "react";
import { useVirtualScroll, useSimpleVirtualList } from "@/hooks/useVirtualScroll";
import { LoadingSpinner } from "./LoadingSpinner";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  height?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

/**
 * VirtualList Component
 * 가상 스크롤을 사용하여 대량의 아이템을 효율적으로 렌더링합니다.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = 400,
  overscan = 3,
  className = "",
  emptyMessage = "항목이 없습니다",
}: VirtualListProps<T>) {
  const { containerProps, virtualItems, totalHeight } = useVirtualScroll(items, {
    itemHeight,
    overscan,
    containerHeight: height,
  });

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div {...containerProps} className={className}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {virtualItems.map(({ index, item, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface InfiniteListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemsPerPage?: number;
  className?: string;
  emptyMessage?: string;
  loadingMessage?: string;
}

/**
 * InfiniteList Component
 * 무한 스크롤을 사용하여 아이템을 점진적으로 로드합니다.
 */
export function InfiniteList<T>({
  items,
  renderItem,
  itemsPerPage = 30,
  className = "",
  emptyMessage = "항목이 없습니다",
  loadingMessage = "더 불러오는 중...",
}: InfiniteListProps<T>) {
  const {
    items: loadedItems,
    loadMoreRef,
    hasMore,
    loadedCount,
    totalItems,
  } = useSimpleVirtualList(items, { itemsPerPage });

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 text-sm text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {loadedItems.map((item, index) => renderItem(item, index))}

      {/* Load more trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4 gap-2"
        >
          <LoadingSpinner size="sm" />
          <span className="text-sm text-muted-foreground">
            {loadingMessage} ({loadedCount}/{totalItems})
          </span>
        </div>
      )}
    </div>
  );
}
