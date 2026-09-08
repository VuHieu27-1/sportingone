import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Users,
  Store,
  Building2,
  Wallet,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthUser } from '../../types/auth';
import { tokenManager } from '../../utils/tokenManager';
import { useAccounts } from '../../hooks/useAccounts';
import { accountAvatarCache } from '../../services/userProfileService';
import { SportLogoIcon } from '../common/SportLogoIcon';

export type AdminTab =
  | 'overview'
  | 'users'
  | 'vendors'
  | 'yards'
  | 'transactions'
  | 'approvals'
  | 'settings'
  | 'ai-keys';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  currentUser: AuthUser | null;
  userCount: number;
  vendorCount: number;
  pendingVendorCount: number;
  yardCount: number;
  pendingApprovalCount?: number;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  userCount,
  vendorCount,
  pendingVendorCount,
  yardCount,
  pendingApprovalCount = 0,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const savedAccounts = useAccounts();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const adminAvatar =
    currentUser?.avatarUrl ||
    accountAvatarCache.getAvatar(currentUser?.username || '') ||
    accountAvatarCache.getAvatar(currentUser?.fullName || '');

  const handleTabSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  const renderContent = (isDrawer: boolean) => (
    <>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <div
            onClick={() => handleTabSelect('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Về Trang Chủ Quản Trị"
          >
            <SportLogoIcon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 group-hover:scale-105 transition-transform duration-300" />
            <div className="flex flex-col justify-center">
              <h1 className="font-extrabold text-base tracking-tight text-[#1E3932] leading-none">SPORTING ONE</h1>
              <span className="text-[10px] font-bold font-mono text-[#006241] bg-[#006241]/10 px-2 py-0.5 rounded-full inline-block mt-1 w-fit">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          {isDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl bg-white border border-[#E6E2D8] text-[#6F7E72] hover:text-[#1E3932] transition-colors cursor-pointer"
              aria-label="Đóng Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="space-y-2">
          <div className="text-[11px] font-extrabold text-[#6F7E72] uppercase tracking-wider px-3 mb-3">
            Hệ Thống Quản Lý
          </div>

          <button
            onClick={() => handleTabSelect('overview')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'overview' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Tổng Quan Hệ Thống</span>
            </div>
          </button>

          <button
            onClick={() => handleTabSelect('users')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Quản Lý User</span>
            </div>
          </button>

          <button
            onClick={() => handleTabSelect('vendors')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Store className={`w-4 h-4 shrink-0 ${activeTab === 'vendors' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Quản Lý Vendor</span>
            </div>
            {pendingVendorCount > 0 && (
              <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-amber-600 text-white shrink-0 ml-2">
                {pendingVendorCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabSelect('yards')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'yards'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'yards' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Quản Lý Sân Bóng</span>
            </div>
          </button>

          <button
            onClick={() => handleTabSelect('approvals')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${activeTab === 'approvals' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Duyệt Rút &amp; Refund</span>
            </div>
            {pendingApprovalCount > 0 && (
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0 ml-2">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabSelect('transactions')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Wallet className={`w-4 h-4 shrink-0 ${activeTab === 'transactions' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Nhật Ký Giao Dịch</span>
            </div>
          </button>

          <button
            onClick={() => handleTabSelect('settings')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Cấu Hình Phân Quyền</span>
            </div>
          </button>

          <button
            onClick={() => handleTabSelect('ai-keys')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left whitespace-nowrap ${
              activeTab === 'ai-keys'
                ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'ai-keys' ? 'text-emerald-400' : 'text-[#006241]'}`} />
              <span className="truncate">Quản Lý AI API Key</span>
            </div>
          </button>
        </nav>
      </div>

            <div className="pt-4 border-t border-[#E6E2D8] space-y-2 relative">
        <button
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          className="w-full p-3 rounded-2xl bg-white hover:bg-[#F2F0EB] border border-[#E6E2D8] flex items-center justify-between gap-2 shadow-xs transition-all cursor-pointer text-left"
          title="Bấm để mở danh sách tài khoản"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {adminAvatar ? (
              <img
                src={adminAvatar}
                alt={currentUser?.username || 'Admin'}
                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-[#1E3932]/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#006241] text-[#FBF8F0] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(currentUser?.username || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <h4 className="font-extrabold text-xs text-[#1E3932] truncate">{currentUser?.username || 'Admin'}</h4>
              <p className="text-[10px] font-bold text-[#006241]">Quản Trị Viên (SuperAdmin)</p>
            </div>
          </div>
          {accountMenuOpen ? (
            <ChevronUp className="w-4 h-4 text-[#6F7E72] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6F7E72] shrink-0" />
          )}
        </button>

                {accountMenuOpen && (
          <div className="p-2 rounded-2xl bg-white border border-[#E6E2D8] shadow-lg space-y-2 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
              Danh sách tài khoản ({savedAccounts.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {savedAccounts.map((acc) => {
                const accAvatar = (acc.isActive && currentUser?.avatarUrl) || accountAvatarCache.getAvatar(acc.username);
                return (
                  <div
                    key={acc.username}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                      acc.isActive
                        ? 'bg-[#006241]/10 border border-[#006241]/30'
                        : 'hover:bg-[#F2F0EB] cursor-pointer'
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
                  <div className="flex items-center gap-1 shrink-0">
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#006241] hover:bg-[#006241]/10 text-xs font-bold transition-all text-left cursor-pointer border border-dashed border-[#006241]/30"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#006241]" />
              Thêm tài khoản mới
            </button>
          </div>
        )}

        <button
          onClick={() => {
            tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, onLogout);
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer border border-rose-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng Xuất Admin</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#FBF8F0] border-r border-[#E6E2D8] p-6 flex-col justify-between shrink-0 shadow-xs font-['Plus_Jakarta_Sans',sans-serif] min-h-screen">
        {renderContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#FBF8F0] p-5 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

