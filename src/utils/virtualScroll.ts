/**
 * Virtual scrolling utilities for rendering large lists efficiently
 */

interface VirtualScrollState {
  offset: number;
  limit: number;
}

/**
 * Calculate visible items in a virtual scroll window
 */
export function calculateVisibleItems(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan = 3
): VirtualScrollState {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems, startIndex + visibleCount + overscan * 2);

  return {
    offset: startIndex,
    limit: endIndex - startIndex,
  };
}

/**
 * Get visible slice with virtual scroll
 */
export function getVisibleSlice<T>(
  items: T[],
  offset: number,
  limit: number
): { items: T[]; startIndex: number } {
  return {
    items: items.slice(offset, offset + limit),
    startIndex: offset,
  };
}
