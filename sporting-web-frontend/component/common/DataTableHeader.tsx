import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, Filter, X } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface DataTableHeaderProps {
  label: string;
  field?: string;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  filterOptions?: Array<{ label: string; value: string }>;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  filterValue = '',
  onFilterChange,
  filterPlaceholder = 'Lọc...',
  filterOptions,
  className = '',
  align = 'left',
  sortable = true,
}) => {
  const [showFilterInput, setShowFilterInput] = useState(Boolean(filterValue));

  const isSorted = field && sortField === field;
  const canSort = sortable && field && onSort;
  const canFilter = field && onFilterChange;

  const alignClass =
    align === 'center' ? 'text-center justify-center' : align === 'right' ? 'text-right justify-end' : 'text-left justify-start';

  return (
    <th
      className={`px-4 py-3 font-extrabold text-[11px] uppercase tracking-wider text-[#6F7E72] select-none ${className}`}
    >
      <div className={`flex flex-col gap-1.5 ${align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start'}`}>
        {/* Top bar: Header Label & Sort/Filter Icons */}
        <div className={`flex items-center gap-1.5 ${alignClass} w-full`}>
          <span
            onClick={() => canSort && onSort(field!)}
            className={`inline-flex items-center gap-1 ${
              canSort ? 'cursor-pointer hover:text-[#006241] transition-colors' : ''
            } ${isSorted ? 'text-[#006241] font-black' : ''}`}
          >
            {label}

            {canSort && (
              <span className="inline-flex">
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-[#006241]" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-[#006241]" />
                  )
                ) : (
                  <ChevronsUpDown className="w-3 h-3 text-[#A3B1A6] opacity-60 hover:opacity-100" />
                )}
              </span>
            )}
          </span>

          {canFilter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterInput(!showFilterInput);
              }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                filterValue
                  ? 'text-[#006241] bg-[#006241]/10 font-bold'
                  : 'text-[#94A3B8] hover:text-[#006241] hover:bg-[#F2F0EB]'
              }`}
              title={showFilterInput ? 'Ẩn bộ lọc' : 'Mở bộ lọc cột'}
            >
              <Filter className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Bottom bar: Column Filter Control */}
        {canFilter && showFilterInput && (
          <div className="w-full mt-1 relative font-normal text-normal">
            {filterOptions ? (
              <CustomSelect
                options={[
                  { value: '', label: 'Tất cả' },
                  ...filterOptions.map((opt) => ({ value: opt.value, label: opt.label })),
                ]}
                value={filterValue}
                onChange={(val) => onFilterChange(String(val))}
                size="sm"
                buttonClassName="w-full bg-white border-[#006241]/30"
              />
            ) : (
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => onFilterChange(e.target.value)}
                  placeholder={filterPlaceholder}
                  className="w-full text-xs font-medium py-1 px-2 pr-5 rounded-lg border border-[#006241]/30 bg-white text-[#1E3932] outline-none focus:ring-1 focus:ring-[#006241] placeholder:text-[#94A3B8] placeholder:font-normal"
                />
                {filterValue && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('')}
                    className="absolute right-1.5 p-0.5 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
};
