import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronRight, User, Menu } from 'lucide-react';
import { AdminTab } from './AdminSidebar';

interface AdminHeaderProps {
  activeTab: AdminTab;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoadingData: boolean;
  onRefreshData: () => void;
  onToggleMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  searchQuery,
  setSearchQuery,
  isLoadingData,
  onRefreshData,
  onToggleMobileSidebar,
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-[#FBF8F0] border-b border-[#E6E2D8] px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-30 shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center gap-2 sm:gap-2.5 text-[#1E3932] min-w-0 flex-1">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-white border border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] transition-colors cursor-pointer shrink-0"
            aria-label="Mở Menu Quản Trị"
          >
            <Menu className="w-4 h-4 text-[#006241]" />
          </button>
        )}
        <span className="text-xs text-[#6F7E72] font-semibold hidden md:inline">Trang Quản Trị</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#6F7E72] hidden md:inline shrink-0" />
        <span className="text-xs font-black uppercase tracking-wider text-[#1E3932] truncate">
          {activeTab === 'overview' && 'TỔNG QUAN HỆ THỐNG'}
          {activeTab === 'users' && 'QUẢN LÝ DỮ LIỆU USER'}
          {activeTab === 'vendors' && 'QUẢN LÝ ĐỐI TÁC VENDOR'}
          {activeTab === 'yards' && 'QUẢN LÝ SÂN THỂ THAO'}
          {activeTab === 'approvals' && 'DUYỆT RÚT & REFUND'}
          {activeTab === 'transactions' && 'KIỂM TOÁN GIAO DỊCH'}
          {activeTab === 'settings' && 'CẤU HÌNH PHÂN QUYỀN'}
          {activeTab === 'ai-keys' && 'QUẢN LÝ AI API KEY'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Switch to User Page Button */}
        <button
          onClick={() => navigate('/user')}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all cursor-pointer shadow-sm border border-[#006241]"
          title="Xem trang người dùng (User)"
        >
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
          <span className="hidden sm:inline">Trang User</span>
        </button>

        {/* Search Input */}
        <div className="relative w-36 sm:w-56 md:w-72">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            tabIndex={1}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài khoản, vendor..."
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-full bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-[#006241]"
          />
        </div>

        <button
          onClick={onRefreshData}
          title="Làm mới dữ liệu"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-[#E6E2D8] flex items-center justify-center text-[#1E3932] hover:text-[#006241] hover:border-[#006241] transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};

