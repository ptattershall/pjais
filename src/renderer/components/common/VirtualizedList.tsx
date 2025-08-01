import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ErrorBoundary } from './ErrorBoundary';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  emptyMessage?: string;
  loadingMessage?: string;
  isLoading?: boolean;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  keyExtractor?: (item: T, index: number) => string;
  estimatedItemSize?: number;
  variableHeight?: boolean;
  getItemSize?: (index: number) => number;
}

interface VirtualizedListState {
  scrollTop: number;
  isScrolling: boolean;
  containerHeight: number;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 400,
  overscan = 5,
  emptyMessage = 'No items to display',
  loadingMessage = 'Loading...',
  isLoading = false,
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
  className = '',
  keyExtractor,
  estimatedItemSize,
  variableHeight = false,
  getItemSize
}: VirtualizedListProps<T>) {
  const [state, setState] = useState<VirtualizedListState>({
    scrollTop: 0,
    isScrolling: false,
    containerHeight
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const itemSizeCache = useRef<Map<number, number>>(new Map());

  // Calculate item size based on configuration
  const getItemHeight = useCallback((index: number): number => {
    if (variableHeight && getItemSize) {
      const cached = itemSizeCache.current.get(index);
      if (cached !== undefined) return cached;
      
      const size = getItemSize(index);
      itemSizeCache.current.set(index, size);
      return size;
    }
    return estimatedItemSize || itemHeight;
  }, [variableHeight, getItemSize, estimatedItemSize, itemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (variableHeight && getItemSize) {
      let height = 0;
      for (let i = 0; i < items.length; i++) {
        height += getItemHeight(i);
      }
      return height;
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, variableHeight, getItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 };

    const { scrollTop, containerHeight } = state;
    let start = 0;
    let end = items.length;

    if (variableHeight && getItemSize) {
      let currentHeight = 0;
      let startFound = false;
      let endFound = false;

      for (let i = 0; i < items.length; i++) {
        const itemSize = getItemHeight(i);
        
        if (!startFound && currentHeight + itemSize > scrollTop) {
          start = Math.max(0, i - overscan);
          startFound = true;
        }
        
        if (!endFound && currentHeight > scrollTop + containerHeight) {
          end = Math.min(items.length, i + overscan);
          endFound = true;
          break;
        }
        
        currentHeight += itemSize;
      }
      
      if (!endFound) {
        end = items.length;
      }
    } else {
      start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      end = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
    }

    return { start, end };
  }, [state.scrollTop, state.containerHeight, items.length, itemHeight, overscan, variableHeight, getItemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    
    setState(prev => ({
      ...prev,
      scrollTop,
      isScrolling: true
    }));

    onScroll?.(scrollTop);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after a delay
    scrollTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isScrolling: false }));
    }, 150);

    // Check if we've reached the end
    if (onEndReached) {
      const { scrollHeight, clientHeight } = event.currentTarget;
      const threshold = scrollHeight * endReachedThreshold;
      
      if (scrollTop + clientHeight >= threshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, endReachedThreshold]);

  // Calculate offset for visible items
  const getOffsetForIndex = useCallback((index: number): number => {
    if (variableHeight && getItemSize) {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    }
    return index * itemHeight;
  }, [variableHeight, getItemHeight, itemHeight]);

  // Update container height on resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setState(prev => ({ ...prev, containerHeight: rect.height }));
      }
    };

    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Clear cache when items change
  useEffect(() => {
    itemSizeCache.current.clear();
  }, [items]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    const items_to_render = [];

    for (let i = start; i < end; i++) {
      const item = items[i];
      if (!item) continue;

      const key = keyExtractor ? keyExtractor(item, i) : `item-${i}`;
      const offset = getOffsetForIndex(i);
      const height = getItemHeight(i);

      items_to_render.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            top: offset,
            left: 0,
            right: 0,
            height: height,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ErrorBoundary context={`VirtualizedList-Item-${i}`}>
            {renderItem(item, i)}
          </ErrorBoundary>
        </div>
      );
    }

    return items_to_render;
  }, [visibleRange, items, keyExtractor, getOffsetForIndex, getItemHeight, renderItem]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          gap: 2
        }}
        className={className}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}
        className={className}
      >
        {emptyMessage}
      </Box>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

// Hook for managing virtualized list state
export function useVirtualizedList<T>(
  items: T[],
  options: {
    itemHeight?: number;
    containerHeight?: number;
    overscan?: number;
    variableHeight?: boolean;
  } = {}
) {
  const {
    itemHeight = 50,
    containerHeight = 400,
    overscan = 5,
    variableHeight = false
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const scrollToIndex = useCallback((index: number) => {
    const offset = variableHeight ? 0 : index * itemHeight;
    setScrollTop(offset);
  }, [itemHeight, variableHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    const totalHeight = variableHeight ? 0 : items.length * itemHeight;
    setScrollTop(Math.max(0, totalHeight - containerHeight));
  }, [items.length, itemHeight, containerHeight, variableHeight]);

  return {
    scrollTop,
    isScrolling,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    setScrollTop,
    setIsScrolling
  };
}

// Higher-order component for easy virtualization
export function withVirtualization<T, P extends object>(
  Component: React.ComponentType<P & { items: T[] }>,
  virtualizedProps: Omit<VirtualizedListProps<T>, 'items' | 'renderItem'>
) {
  return function VirtualizedComponent(props: P & { items: T[] }) {
    const { items, ...componentProps } = props;
    
    const renderItem = useCallback((item: T, index: number) => (
      <Component {...(componentProps as P)} items={[item]} />
    ), [componentProps]);

    return (
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        {...virtualizedProps}
      />
    );
  };
}

export default VirtualizedList;