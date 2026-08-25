import { useState, useMemo, useEffect } from 'react';

export function usePagination<T>(data: T[], initialItemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Reset to first page if data length changes or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    currentData,
    nextPage,
    prevPage,
    goToPage,
    totalItems: data.length
  };
}
