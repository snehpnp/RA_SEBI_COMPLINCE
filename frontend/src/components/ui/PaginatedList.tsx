import React from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from './Pagination';

interface PaginatedListProps<T> {
  data: T[];
  itemsPerPage?: number;
  children: (paginatedData: T[]) => React.ReactNode;
}

export function PaginatedList<T>({ data, itemsPerPage = 10, children }: PaginatedListProps<T>) {
  const pagination = usePagination(data, itemsPerPage);

  return (
    <>
      {children(pagination.currentData)}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.goToPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
      />
    </>
  );
}
