import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-300 dark:border-white/5 bg-white dark:bg-slate-900/30">
      <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mb-3 sm:mb-0">
        <span>Showing {startItem} to {endItem} of {totalItems} entries</span>
        <div className="ml-4 flex items-center space-x-2">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 text-slate-900 dark:text-white rounded-md text-xs py-1 px-2 focus:ring-0 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center space-x-1">
          {/* Simple page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${ currentPage === pageNum ? 'bg-primary-600 text-white ' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800' }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

