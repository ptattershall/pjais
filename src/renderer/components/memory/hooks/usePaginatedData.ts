import { useState, useMemo } from 'react';

export function usePaginatedData<T>(data: T[], pageSize: number) {
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.ceil(data.length / pageSize);

  const page = useMemo(
    () => data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [data, pageIndex, pageSize]
  );

  return { page, pageIndex, totalPages, setPageIndex };
} 