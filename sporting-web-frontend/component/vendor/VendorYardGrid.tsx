import React from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { BackendYardItem } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';
import { VendorYardCard } from './VendorYardCard';

interface VendorYardGridProps {
  yards: BackendYardItem[];
  paidBookings?: BackendBooking[];
  timeFilter?: { date: string; startTime: string; endTime: string } | null;
  selectedCategoryName: string;
  vendorName: string;
  isLoading: boolean;
  onBookYard: (yard: BackendYardItem) => void;
}

export const VendorYardGrid: React.FC<VendorYardGridProps> = ({
  yards,
  paidBookings = [],
  timeFilter = null,
  selectedCategoryName,
  vendorName,
  isLoading,
  onBookYard,
}) => {
  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DANH SÁCH SÂN THI ĐẤU</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E3932]">
            {selectedCategoryName === 'Tất cả môn'
              ? 'Tất Cả Sân Thi Đấu'
              : `Dành Cho Sân ${selectedCategoryName}`}
          </h2>
          <p className="text-[#6F7E72] text-xs sm:text-sm mt-1 font-medium">
            Hiển thị <span className="font-extrabold text-[#1E3932]">{yards.length} sân</span> sẵn sàng nhận lịch đặt
          </p>
        </div>
      </div>

            {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#FBF8F0] rounded-[32px] border border-[#E6E2D8]">
          <Loader2 className="w-10 h-10 text-[#006241] animate-spin mb-4" />
          <p className="text-sm font-extrabold text-[#1E3932]">Đang tải danh sách sân thi đấu...</p>
        </div>
      ) : yards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#FBF8F0] rounded-[32px] border border-[#E6E2D8] text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-[#1E3932] mb-1">
            Không có sân nào cho phân loại này
          </h3>
          <p className="text-xs text-[#6F7E72] max-w-md">
            Vendor <span className="font-bold text-[#1E3932]">{vendorName}</span> chưa cập nhật sân thi đấu thuộc phân loại này. Vui lòng chọn phân loại môn khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {yards.map((yard) => (
            <VendorYardCard
              key={yard.id}
              yard={yard}
              vendorName={vendorName}
              paidBookings={paidBookings}
              timeFilter={timeFilter}
              onBookYard={onBookYard}
            />
          ))}
        </div>
      )}
    </section>
  );
};
