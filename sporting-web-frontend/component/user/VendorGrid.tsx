import React from 'react';
import { Sparkles, ServerCrash, RefreshCw } from 'lucide-react';
import { VendorDisplayItem } from '../../services/vendorService';
import { VendorCard } from './VendorCard';

interface VendorGridProps {
  vendors: VendorDisplayItem[];
  isLoading: boolean;
  errorMessage: string;
  onSelectVendor: (vendor: VendorDisplayItem) => void;
  onRetry?: () => void;
}

export const VendorGrid: React.FC<VendorGridProps> = ({
  vendors,
  isLoading,
  errorMessage,
  onSelectVendor,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-emerald-500 animate-spin" />
          <span className="font-bold text-slate-600 text-sm">Đang tải danh sách Vendor...</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                <div className="h-3 bg-slate-200 rounded-full w-full" />
                <div className="h-3 bg-slate-200 rounded-full w-1/2" />
                <div className="h-8 bg-slate-200 rounded-xl w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <ServerCrash className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg mb-1">Không Thể Tải Dữ Liệu</h3>
          <p className="text-slate-500 text-sm max-w-sm">{errorMessage}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/30"
          >
            <RefreshCw className="w-4 h-4" />
            Thử Lại
          </button>
        )}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-400">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg mb-1">Không Tìm Thấy Kết Quả</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Hiện chưa có Vendor nào phù hợp với tiêu chí lọc. Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {vendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          onSelect={onSelectVendor}
        />
      ))}
    </div>
  );
};
