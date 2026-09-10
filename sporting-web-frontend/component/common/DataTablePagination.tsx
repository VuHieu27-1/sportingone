import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface DataTablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  itemLabel = 'bản ghi',
  className = '',
}) => {
  if (totalItems === 0) return null;

  const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): Array<number | string> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: Array<number | string> = [1];
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
    }

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-2 border-t border-[#E6E2D8]/60 bg-[#FBF8F0]/30 rounded-b-2xl font-['Plus_Jakarta_Sans',sans-serif] ${className}`}
    >
      {/* Left side: Items per page selector & record status */}
      <div className="flex flex-wrap items-center gap-3.5 text-xs text-[#6F7E72]">
        <CustomSelect
          options={pageSizeOptions.map((option) => ({
            value: option,
            label: `${option} dòng / trang`,
          }))}
          value={pageSize}
          onChange={(val) => onPageSizeChange(Number(val))}
          prefixLabel="Hiển thị:"
          size="sm"
          placement="top"
          buttonClassName="bg-white border-[#E6E2D8] shadow-2xs"
        />

        <p className="font-medium">
          Hiển thị <span className="font-extrabold text-[#1E3932]">{startIndex}</span> -{' '}
          <span className="font-extrabold text-[#1E3932]">{endIndex}</span> trên tổng số{' '}
          <span className="font-extrabold text-[#006241]">{totalItems}</span> {itemLabel}
        </p>
      </div>

      {/* Right side: Page navigation controls */}
      <div className="flex items-center gap-1.5">
        {/* First Page Button */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="Trang đầu"
          className="p-1.5 rounded-xl border border-[#E6E2D8] bg-white text-[#1E3932] hover:bg-[#F2F0EB] hover:text-[#006241] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page Button */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E6E2D8] bg-white text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] hover:text-[#006241] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#006241]" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Mobile Compact Page Indicator */}
        <div className="flex sm:hidden items-center px-2 text-xs font-mono font-black text-[#1E3932]">
          {currentPage} / {totalPages}
        </div>

        {/* Page Number Buttons - Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs font-bold text-[#6F7E72]">
                  ...
                </span>
              );
            }

            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#006241] text-[#FBF8F0] shadow-sm scale-105'
                    : 'bg-white border border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] hover:border-[#006241]/30'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E6E2D8] bg-white text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] hover:text-[#006241] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#006241]" />
        </button>

        {/* Last Page Button */}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Trang cuối"
          className="p-1.5 rounded-xl border border-[#E6E2D8] bg-white text-[#1E3932] hover:bg-[#F2F0EB] hover:text-[#006241] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
