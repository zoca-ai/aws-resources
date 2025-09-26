"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  className?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  className,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate which items should be visible
  const { startIndex, endIndex, visibleItems, totalHeight } = useMemo(() => {
    const itemsInView = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.floor(itemsInView * 0.5); // 50% buffer

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const end = Math.min(items.length, start + itemsInView + buffer * 2);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end),
      totalHeight: items.length * itemHeight,
    };
  }, [items.length, itemHeight, scrollTop, containerHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);

    // Load more when near the bottom
    if (onLoadMore && hasNextPage && !isFetchingNextPage) {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const threshold = 200; // Load when 200px from bottom

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasNextPage, isFetchingNextPage]);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            width: '100%',
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}

          {/* Loading indicator */}
          {isFetchingNextPage && (
            <div
              className="flex items-center justify-center py-4"
              style={{ height: itemHeight }}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                Loading more...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}