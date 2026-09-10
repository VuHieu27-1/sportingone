import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Building2,
  Grid,
  CalendarCheck2,
  TrendingUp,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Trash2,
  Store,
  LayoutTemplate,
  RotateCcw,
  X,
} from 'lucide-react';
import { AuthUser } from '../../types/auth';
import { tokenManager } from '../../utils/tokenManager';
import { useAccounts } from '../../hooks/useAccounts';
import { accountAvatarCache } from '../../services/userProfileService';

export type VendorTabType = 'dashboard' | 'vendors' | 'yards' | 'bookings' | 'refunds' | 'analytics';

interface VendorSidebarProps {
  currentUser: AuthUser | null;
  activeTab: VendorTabType;
  setActiveTab: (tab: VendorTabType) => void;
  vendorsCount: number;
  yardsCount: number;
  bookingsCount: number;
  refundsCount?: number;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const VendorSidebar: React.FC<VendorSidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  vendorsCount,
  yardsCount,
  bookingsCount,
  refundsCount = 0,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const savedAccounts = useAccounts();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const displayName = currentUser?.fullName || currentUser?.username || 'Chủ Vendor';
  const displayEmail = currentUser?.email || 'vendor@sporting.vn';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const activeAvatar =
    currentUser?.avatarUrl ||
    accountAvatarCache.getAvatar(displayName) ||
    accountAvatarCache.getAvatar(currentUser?.username || '');

  const NAV_ITEMS: Array<{
    id: VendorTabType;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'vendors', label: 'Quản Lý Cụm Sân', icon: Building2, count: vendorsCount },
    { id: 'yards', label: 'Quản Lý Sân Con', icon: Grid, count: yardsCount },
    { id: 'bookings', label: 'Đơn Đặt Sân', icon: CalendarCheck2, count: bookingsCount },
    { id: 'refunds', label: 'Đơn Huỷ & Hoàn Tiền', icon: RotateCcw, count: refundsCount },
    { id: 'analytics', label: 'Báo Cáo Doanh Thu', icon: TrendingUp },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E6E2D8] flex items-center justify-between bg-white/40 shrink-0">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (isMobile) onCloseMobile?.();
            }}
            className="flex items-center gap-3 cursor-pointer group"
            title="Về Trang Chủ Vendor Dashboard"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#006241] flex items-center justify-center text-white shadow-md border border-emerald-400/30 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Store className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[#1E3932] tracking-wider uppercase font-mono leading-none">
                SPORTING ONE
              </h1>
              <span className="text-[10px] font-bold text-[#006241] font-mono tracking-wider block mt-0.5">
                VENDOR PORTAL
              </span>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl border border-[#E6E2D8] text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-mono font-extrabold text-[#6F7E72] uppercase tracking-wider px-3 mb-3">
            MENU QUẢN TRỊ
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all text-left cursor-pointer group ${
                  isActive
                    ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md border border-[#1E3932]'
                    : 'text-[#1E3932] hover:bg-[#F2F0EB] hover:text-[#006241]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-[#006241] group-hover:text-[#006241]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-[#E6E2D8] text-[#1E3932]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3.5 m-3 rounded-[24px] bg-white border border-[#E6E2D8] shadow-sm space-y-3 relative shrink-0">
        <button
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          className="w-full flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-[#F2F0EB]/60 transition-all cursor-pointer text-left"
          title="Bấm để chuyển đổi tài khoản"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {activeAvatar && (
              <img
                src={activeAvatar}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border-2 border-[#FBF8F0]"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fb) fb.style.display = 'flex';
                }}
              />
            )}
            <div
              style={{ display: activeAvatar ? 'none' : 'flex' }}
              className="w-10 h-10 rounded-full bg-[#006241] items-center justify-center text-sm font-black text-white shadow-sm shrink-0 border-2 border-[#FBF8F0]"
            >
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-extrabold text-[#1E3932] truncate leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-[#6F7E72] font-mono truncate leading-tight">
                {displayEmail}
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 mt-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-[#006241] shrink-0" />
                <span>Chủ Vendor Active</span>
              </div>
            </div>
          </div>

          <div className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0 self-center">
            {accountMenuOpen ? (
              <ChevronUp className="w-4 h-4 text-[#6F7E72]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6F7E72]" />
            )}
          </div>
        </button>

        {accountMenuOpen && (
          <div className="p-2 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] shadow-xl space-y-2 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
              Danh sách tài khoản ({savedAccounts.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {savedAccounts.map((acc) => {
                const accAvatar = (acc.isActive && currentUser?.avatarUrl) || accountAvatarCache.getAvatar(acc.username);
                return (
                  <div
                    key={acc.username}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      acc.isActive
                        ? 'bg-[#006241]/10 border border-[#006241]/30'
                        : 'hover:bg-white cursor-pointer border border-transparent'
                    }`}
                    onClick={() => {
                      if (!acc.isActive) {
                        setAccountMenuOpen(false);
                        tokenManager.switchAccountInNewTab(acc.username);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {accAvatar ? (
                        <img
                          src={accAvatar}
                          alt={acc.username}
                          className="w-5 h-5 rounded-full object-cover shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#006241] text-[#FBF8F0] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {acc.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="truncate text-xs font-bold text-[#1E3932]">{acc.username}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {acc.isActive && (
                        <span className="px-1.5 py-0.5 bg-[#006241] text-[#FBF8F0] text-[8px] font-bold rounded-full">
                          Đang dùng
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`Đã xóa tài khoản ${acc.username}!`, { id: `logout-${acc.username}` });
                          if (acc.isActive) {
                            tokenManager.handleActiveLogoutOrAutoSwitch(acc.username, onLogout);
                          } else {
                            tokenManager.removeAccountToken(acc.username);
                          }
                        }}
                        className="p-1 text-[#6F7E72] hover:text-red-600 transition-colors cursor-pointer"
                        title={`Đăng xuất và xóa tài khoản ${acc.username}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setAccountMenuOpen(false);
                navigate('/add-account');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[#006241] hover:bg-[#006241]/10 text-xs font-bold transition-all cursor-pointer border border-dashed border-[#006241]/30 bg-white"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#006241]" />
              <span>Thêm tài khoản mới</span>
            </button>
          </div>
        )}

        <div className="pt-2.5 border-t border-[#F2F0EB] flex items-center justify-between gap-2">
          <button
            onClick={() => navigate('/user/profile')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer"
            title="Quay lại Hồ sơ cá nhân"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="truncate">Trang Người Dùng</span>
          </button>

          <button
            onClick={() => {
              tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, onLogout);
            }}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer shrink-0 border border-rose-200/60"
            title="Đăng xuất tài khoản"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-72 bg-[#FBF8F0] border-r border-[#E6E2D8] flex-col justify-between shrink-0 font-['Plus_Jakarta_Sans',sans-serif] h-screen sticky top-0 self-start overflow-hidden selection:bg-[#006241] selection:text-white">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden font-['Plus_Jakarta_Sans',sans-serif]">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#FBF8F0] border-r border-[#E6E2D8] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
