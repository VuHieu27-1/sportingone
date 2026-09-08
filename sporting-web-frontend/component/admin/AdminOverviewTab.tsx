import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Store,
  Building2,
  Clock,
  Shield,
  Plus,
  Wifi,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AdminUser, AdminVendor, AdminYard, getUserRoleName } from '../../services/adminService';
import { accountAvatarCache } from '../../services/userProfileService';
import { AdminTab } from './AdminSidebar';

const OverviewVendorActionMenu: React.FC<{
  vendor: AdminVendor;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  handleQuickChangeVendorStatus: (id: number, status: 'active' | 'pending' | 'reject') => void;
}> = ({ vendor, openId, setOpenId, handleQuickChangeVendorStatus }) => {
  const menuKey = `ov-vendor-${vendor.id}`;
  const isOpen = openId === menuKey;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(8, window.innerWidth - rect.right);

    if (spaceBelow < 120) {
      setPos({ bottom: window.innerHeight - rect.top + 6, right });
    } else {
      setPos({ top: rect.bottom + 6, right });
    }
  }, []);

  const handleToggle = () => {
    if (!isOpen) recalcPos();
    setOpenId(isOpen ? null : menuKey);
  };

  useEffect(() => {
    if (!isOpen) return;
    recalcPos();
    const sync = () => recalcPos();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [isOpen, recalcPos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-7 h-7 rounded-full hover:bg-[#F2F0EB] active:bg-[#E6E2D8] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#006241]/40"
        title="Thao tác duyệt"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-3.5 h-3.5 text-[#1E3932]" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
            <div
              className="fixed z-[9999] w-48 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7E72] border-b border-[#F2F0EB] truncate">
                {vendor.vendorName}
              </div>

              <button
                onClick={() => {
                  setOpenId(null);
                  handleQuickChangeVendorStatus(vendor.id, 'active');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#006241] hover:bg-emerald-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Phê Duyệt Vendor</span>
              </button>

              <button
                onClick={() => {
                  setOpenId(null);
                  handleQuickChangeVendorStatus(vendor.id, 'reject');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Từ Chối Vendor</span>
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

interface AdminOverviewTabProps {
  users: AdminUser[];
  vendors: AdminVendor[];
  yards: AdminYard[];
  activeVendorCount: number;
  pendingVendorCount: number;
  adminCount: number;
  setActiveTab: (tab: AdminTab) => void;
  handleQuickChangeVendorStatus: (id: number, status: 'active' | 'pending' | 'reject') => void;
  handleOpenPromoteModal: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  users,
  vendors,
  yards,
  activeVendorCount,
  pendingVendorCount,
  adminCount,
  setActiveTab,
  handleQuickChangeVendorStatus,
  handleOpenPromoteModal,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Tổng Số User</span>
            <div className="text-3xl font-black text-[#1E3932] tracking-tight">{users.length}</div>
            <span className="text-xs text-[#006241] font-bold block">{adminCount} Tài khoản Quản trị</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

                <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Vendor Đã Duyệt</span>
            <div className="text-3xl font-black text-[#1E3932] tracking-tight">{activeVendorCount}</div>
            <span className="text-xs text-amber-700 font-bold block">{pendingVendorCount} Đơn đang chờ duyệt</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
        </div>

                <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Tổng Sân Thể Thao</span>
            <div className="text-3xl font-black text-[#1E3932] tracking-tight">{yards.length}</div>
            <span className="text-xs text-[#6F7E72] font-bold block">Quản lý trên toàn hệ thống</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

                {(() => {
          const onlineUsersCount = users.filter((u) => {
            if ((u as any).isOnline) return true;
            if (!u.statusTime) return false;
            const statusDate = new Date(u.statusTime).getTime();
            if (isNaN(statusDate)) return false;
            const diffMinutes = (Date.now() - statusDate) / (1000 * 60);
            return diffMinutes <= 15;
          }).length || 1;

          return (
            <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">User Đang Online</span>
                </div>
                <div className="text-3xl font-black text-[#1E3932] tracking-tight">{onlineUsersCount}</div>
                <span className="text-xs text-[#006241] font-bold block">Tài khoản trực tuyến gần đây</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
                <Wifi className="w-6 h-6" />
              </div>
            </div>
          );
        })()}
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
            <h3 className="font-extrabold text-[#1E3932] text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Đơn Đăng Ký Vendor Chờ Duyệt ({pendingVendorCount})
            </h3>
            <button
              onClick={() => setActiveTab('vendors')}
              className="text-xs text-[#006241] font-bold hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          {vendors.filter((v) => v.status === 'pending').length === 0 ? (
            <p className="text-xs text-[#6F7E72] py-8 text-center font-medium">Không có đơn đăng ký Vendor nào đang chờ duyệt.</p>
          ) : (
            <div className="divide-y divide-[#F2F0EB]">
              {vendors
                .filter((v) => v.status === 'pending')
                .map((vendor) => (
                  <div key={vendor.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-extrabold text-xs text-[#1E3932]">{vendor.vendorName}</h4>
                      <p className="text-[11px] text-[#6F7E72] font-medium">{vendor.vendorAddress || 'Chưa cập nhật địa chỉ'}</p>
                    </div>
                    <div className="shrink-0">
                      <OverviewVendorActionMenu
                        vendor={vendor}
                        openId={openMenuId}
                        setOpenId={setOpenMenuId}
                        handleQuickChangeVendorStatus={handleQuickChangeVendorStatus}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

                <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
            <h3 className="font-extrabold text-[#1E3932] text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#006241]" />
              Danh Sách Quản Trị Viên (Admin Users)
            </h3>
            <button
              onClick={handleOpenPromoteModal}
              className="text-xs text-[#006241] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Admin
            </button>
          </div>

          <div className="divide-y divide-[#F2F0EB]">
            {users
              .filter((u) => getUserRoleName(u) === 'admin')
              .map((u) => {
                const adminAv = u.avatar || accountAvatarCache.getAvatar(u.username);
                return (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {adminAv ? (
                        <img
                          src={adminAv}
                          alt={u.username}
                          className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-[#1E3932]/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#1E3932] text-[#FBF8F0] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-xs text-[#1E3932]">{u.username}</h4>
                        <p className="text-[11px] text-[#6F7E72] font-mono">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#006241] bg-[#006241]/10 px-3 py-1 rounded-full border border-[#006241]/20">
                      Super Admin
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
