import React from 'react';
import { Plus, Grid, CalendarCheck2, Settings, ChevronRight } from 'lucide-react';

interface QuickAccessPanelProps {
  onAddVendor: () => void;
  onAddYard: () => void;
  onViewBookings: () => void;
  onRefresh?: () => void;
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({
  onAddVendor,
  onAddYard,
  onViewBookings,
}) => {
  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      <h3 className="text-base font-extrabold text-[#1E3932] pb-3 border-b border-[#F2F0EB]">
        Quick Access (Thao Tác Nhanh)
      </h3>

      <div className="space-y-3">
                <button
          onClick={onAddVendor}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#E6E2D8] hover:border-[#006241] bg-[#FBF8F0] hover:bg-[#006241] text-[#1E3932] hover:text-white transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <Plus className="w-4 h-4 text-[#006241] group-hover:text-white" />
            <span>Đăng Ký Cụm Sân Mới</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        </button>

                <button
          onClick={onAddYard}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#E6E2D8] hover:border-[#006241] bg-[#FBF8F0] hover:bg-[#006241] text-[#1E3932] hover:text-white transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <Grid className="w-4 h-4 text-[#006241] group-hover:text-white" />
            <span>Thêm Sân Con Mới</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        </button>

                <button
          onClick={onViewBookings}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#E6E2D8] hover:border-[#006241] bg-[#FBF8F0] hover:bg-[#006241] text-[#1E3932] hover:text-white transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <CalendarCheck2 className="w-4 h-4 text-[#006241] group-hover:text-white" />
            <span>Lịch Đặt Sân (Orders)</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        </button>

                <button
          onClick={onAddVendor}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#E6E2D8] hover:border-[#006241] bg-[#FBF8F0] hover:bg-[#006241] text-[#1E3932] hover:text-white transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3 text-xs font-extrabold">
            <Settings className="w-4 h-4 text-[#006241] group-hover:text-white" />
            <span>Cài Đặt Cụm Sân</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};
