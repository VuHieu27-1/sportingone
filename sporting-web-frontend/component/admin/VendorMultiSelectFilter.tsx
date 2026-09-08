import React, { useState, useRef, useEffect } from 'react';
import { Store, ChevronDown, Check, Search, X } from 'lucide-react';

export interface VendorOption {
  id: number;
  vendorName?: string;
}

interface VendorMultiSelectFilterProps {
  vendors: VendorOption[];
  selectedVendorIds: number[]; // Empty array means ALL selected
  onChange: (selectedIds: number[]) => void;
}

export const VendorMultiSelectFilter: React.FC<VendorMultiSelectFilterProps> = ({
  vendors,
  selectedVendorIds,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const name = v.vendorName || `Vendor #${v.id}`;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isAllSelected = selectedVendorIds.length === 0 || (vendors.length > 0 && selectedVendorIds.length === vendors.length);

  const isVendorChecked = (id: number) => {
    if (isAllSelected) return true;
    return selectedVendorIds.includes(id);
  };

  const handleToggleVendor = (id: number) => {
    if (isAllSelected) {
      // Khi đang chọn tất cả mà người dùng click bỏ chọn 1 vendor
      // -> Chọn tất cả các vendor còn lại ngoại trừ vendor này
      const allIds = vendors.map((v) => v.id);
      const next = allIds.filter((item) => item !== id);
      onChange(next);
    } else {
      if (selectedVendorIds.includes(id)) {
        const next = selectedVendorIds.filter((item) => item !== id);
        onChange(next);
      } else {
        const next = [...selectedVendorIds, id];
        // Nếu user đã tick chọn đủ toàn bộ vendor -> reset về [] (Tất cả)
        if (next.length === vendors.length) {
          onChange([]);
        } else {
          onChange(next);
        }
      }
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  // Button label summary text
  const getButtonText = () => {
    if (isAllSelected) {
      return `Tất cả cơ sở Vendor (${vendors.length})`;
    }
    if (selectedVendorIds.length === 1) {
      const found = vendors.find((v) => v.id === selectedVendorIds[0]);
      return found?.vendorName || `Vendor #${selectedVendorIds[0]}`;
    }
    return `Đã chọn (${selectedVendorIds.length} Vendor)`;
  };

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto" ref={dropdownRef}>
      <div className="flex items-center gap-1.5 shrink-0">
        <Store className="w-4 h-4 text-[#006241] shrink-0" />
        <span className="text-xs font-bold text-[#6F7E72] whitespace-nowrap">Lọc theo Vendor:</span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs font-bold text-[#1E3932] hover:bg-white hover:border-[#006241] focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer flex items-center justify-between gap-2.5 w-full sm:w-auto sm:min-w-[200px] max-w-full transition-all"
      >
        <span className="truncate">{getButtonText()}</span>
        <ChevronDown className={`w-4 h-4 text-[#6F7E72] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Multi-Select Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(calc(100vw-2rem),18rem)] bg-white rounded-2xl border border-[#E6E2D8] shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Quick Search */}
          <div className="p-3 bg-[#FBF8F0] border-b border-[#E6E2D8] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1E3932]">Chọn Vendor ({vendors.length})</span>
              {!isAllSelected && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-[#006241] hover:underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
              )}
            </div>

            {vendors.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên vendor..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-[#E6E2D8] text-xs text-[#1E3932] placeholder-[#6F7E72]/70 focus:outline-none focus:ring-1 focus:ring-[#006241]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6F7E72] hover:text-[#1E3932]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Vendors List with Checkboxes */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {/* "Tất cả cơ sở Vendor" option */}
            <label
              onClick={handleSelectAll}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                isAllSelected
                  ? 'bg-[#E6F4EA] text-[#006241]'
                  : 'text-[#1E3932] hover:bg-[#FAF8F5]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isAllSelected
                    ? 'bg-[#006241] border-[#006241] text-white'
                    : 'border-[#CCCCCC] bg-white'
                }`}
              >
                {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="truncate flex-1">Tất cả cơ sở Vendor ({vendors.length})</span>
            </label>

            <div className="my-1 border-t border-[#E6E2D8]" />

            {/* Individual Vendor Options */}
            {filteredVendors.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#6F7E72] italic">
                Không tìm thấy Vendor
              </div>
            ) : (
              filteredVendors.map((v) => {
                const checked = isVendorChecked(v.id);
                return (
                  <label
                    key={v.id}
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleVendor(v.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#E6F4EA] text-[#006241] font-bold'
                        : 'text-[#1E3932] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        checked
                          ? 'bg-[#006241] border-[#006241] text-white'
                          : 'border-[#CCCCCC] bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate flex-1">{v.vendorName || `Vendor #${v.id}`}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
