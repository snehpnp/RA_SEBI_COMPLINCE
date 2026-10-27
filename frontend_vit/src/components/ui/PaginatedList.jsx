import React from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from './Pagination';
export function PaginatedList({ data, itemsPerPage = 10, children }) {
    const pagination = usePagination(data, itemsPerPage);
    return (<>
      {children(pagination.currentData)}
      <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} itemsPerPage={pagination.itemsPerPage} onPageChange={pagination.goToPage} onItemsPerPageChange={pagination.setItemsPerPage}/>
    </>);
}
