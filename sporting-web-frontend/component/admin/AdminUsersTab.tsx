import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, MoreVertical, Users, Bell, Search, RefreshCw, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminUser, getUserRoleName, getUserRoleLabel, adminService } from '../../services/adminService';
import { accountAvatarCache } from '../../services/userProfileService';
import { AuthUser } from '../../types/auth';
import { AdminNotificationsTab } from './notifications/AdminNotificationsTab';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import { CustomSelect } from '../common/CustomSelect';

export interface AdminUsersTabProps {
  filteredUsers: AdminUser[];
  allUsers?: AdminUser[];
  currentUser?: AuthUser | null;
  userRoleFilter: 'ALL' | 'admin' | 'vendor' | 'user';
  setUserRoleFilter: (filter: 'ALL' | 'admin' | 'vendor' | 'user') => void;
  openActionMenuId: string | null;
  setOpenActionMenuId: (id: string | null) => void;
  handleOpenUserModal: (user?: AdminUser) => void;
  handleDeleteUser: (id: number) => void;
  onRefreshData?: () => void;
}

interface DropdownPos {
  top?: number;
  bottom?: number;
  right: number;
}

const UserActionMenu: React.FC<{
  user: AdminUser;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  handleOpenUserModal: (u: AdminUser) => void;
  handleDeleteUser: (id: number) => void;
  onRefreshData?: () => void;
}> = ({ user: u, openId, setOpenId, handleOpenUserModal, handleDeleteUser, onRefreshData }) => {
  const menuKey = `user-${u.id}`;
  const isOpen = openId === menuKey;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<DropdownPos>({ right: 0 });

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

  const handleRestoreUser = async () => {
    const tid = toast.loading(`Đang khôi phục tài khoản #${u.id}...`);
    try {
      const res = await adminService.restoreUser(u.id);
      if (res.success) {
        toast.success(`Đã khôi phục tài khoản #${u.id} (${u.username}) thành công!`, { id: tid });
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.message || 'Không thể khôi phục tài khoản', { id: tid });
      }
    } catch {
      toast.error('Lỗi khi khôi phục tài khoản', { id: tid });
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-8 h-8 rounded-full hover:bg-[#F2F0EB] active:bg-[#E6E2D8] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center ml-auto focus:outline-none focus:ring-2 focus:ring-[#006241]"
        title="Thao tác quản lý"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4 text-[#1E3932]" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
            <div
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <button
                onClick={() => {
                  handleOpenUserModal(u);
                  setOpenId(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Chỉnh Sửa Thông Tin</span>
              </button>

              <div className="h-px bg-[#F2F0EB] mx-2" />

              {u.ondeleted ? (
                <button
                  onClick={() => {
                    handleRestoreUser();
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors duration-150 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Khôi Phục Tài Khoản</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleDeleteUser(u.id);
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors duration-150 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Xóa Tài Khoản Này</span>
                </button>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

const RoleBadge: React.FC<{ roleName: string; roleLabel: string; ondeleted?: string | null }> = ({ roleName, roleLabel, ondeleted }) => {
  if (ondeleted)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-black text-[10px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
        Đã Xóa
      </span>
    );
  if (roleName === 'admin')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] font-extrabold text-[10px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-[#006241]" />
        {roleLabel}
      </span>
    );
  if (roleName === 'vendor')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[10px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        {roleLabel}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#6F7E72] font-bold text-[10px] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-[#9B9B9B]" />
      {roleLabel}
    </span>
  );
};

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  filteredUsers,
  allUsers,
  currentUser,
  userRoleFilter,
  setUserRoleFilter,
  openActionMenuId,
  setOpenActionMenuId,
  handleOpenUserModal,
  handleDeleteUser,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'notifications'>('accounts');
  const userListForNotifications = allUsers && allUsers.length > 0 ? allUsers : filteredUsers;

  const {
    paginatedData,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    sortField,
    sortDirection,
    globalSearch,
    columnFilters,
    setCurrentPage,
    setPageSize,
    setGlobalSearch,
    setColumnFilter,
    clearColumnFilters,
    handleSort,
  } = useDataTable<AdminUser>({
    data: filteredUsers,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: ['username', 'email', (u) => u.detailUser?.name || '', (u) => u.detailUser?.phone || ''],
    sortAccessors: {
      role: (u) => getUserRoleName(u),
      name: (u) => u.detailUser?.name || '',
      isOnline: (u) => (u.isOnline ? 1 : 0),
    },
    storageKey: 'sporting_admin_users_page_size',
  });

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sub-tab Navigation Pill Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E6E2D8] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('accounts')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all cursor-pointer shrink-0 ${activeSubTab === 'accounts'
              ? 'bg-[#1E3932] text-white shadow-md'
              : 'bg-white text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB] border border-[#E6E2D8]'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản Lý Tài Khoản User</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeSubTab === 'accounts'
                ? 'bg-white/20 text-white'
                : 'bg-[#F2F0EB] text-[#1E3932]'
              }`}
          >
            {userListForNotifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('notifications')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all cursor-pointer shrink-0 ${activeSubTab === 'notifications'
              ? 'bg-[#1E3932] text-white shadow-md'
              : 'bg-white text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB] border border-[#E6E2D8]'
            }`}
        >
          <Bell className="w-4 h-4" />
          <span>Quản Lý Thông Báo Gửi User</span>
        </button>
      </div>

      {/* Sub-tab 1: User Account Management */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#1E3932]">Quản Lý Tất Cả Tài Khoản User</h2>
              <p className="text-[11px] text-[#6F7E72] font-medium mt-0.5">
                Thêm, sửa, xóa thông tin người dùng và phân quyền chi tiết.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Global Search */}
              <div className="relative flex-1 md:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Tìm username, email, họ tên..."
                  className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>

              <CustomSelect
                options={[
                  { value: 'ALL', label: 'Tất cả Vai Trò' },
                  { value: 'admin', label: 'Quản Trị Viên (Admin)' },
                  { value: 'vendor', label: 'Đối Tác (Vendor)' },
                  { value: 'user', label: 'Người Chơi (User)' },
                ]}
                value={userRoleFilter}
                onChange={(val) => setUserRoleFilter(val as any)}
                className="w-full sm:w-48 shrink-0"
                buttonClassName="bg-[#F2F0EB] rounded-full border-[#E6E2D8] text-[11px]"
              />

              {(globalSearch || Object.keys(columnFilters).length > 0) && (
                <button
                  onClick={clearColumnFilters}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                  title="Đặt lại bộ lọc"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => handleOpenUserModal()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#006241] hover:bg-[#007a52] active:bg-[#005234] text-white font-extrabold text-[11px] shadow-sm transition-colors duration-150 cursor-pointer border border-white/10 ml-auto md:ml-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo User Mới</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-[#E6E2D8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1E3932] border-collapse" style={{ minWidth: 780 }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '6%' }} />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#E6E2D8] bg-[#F8F7F4]">
                    <DataTableHeader
                      label="Tài Khoản"
                      field="username"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      filterValue={columnFilters.username}
                      onFilterChange={(val) => setColumnFilter('username', val)}
                      filterPlaceholder="Lọc username..."
                    />
                    <DataTableHeader
                      label="Trạng Thái"
                      field="isOnline"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <DataTableHeader
                      label="Email Liên Hệ"
                      field="email"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      filterValue={columnFilters.email}
                      onFilterChange={(val) => setColumnFilter('email', val)}
                      filterPlaceholder="Lọc email..."
                    />
                    <DataTableHeader
                      label="Họ và Tên"
                      field="detailUser"
                      sortable={false}
                    />
                    <DataTableHeader
                      label="Vai Trò"
                      field="role"
                      sortable={false}
                    />
                    <DataTableHeader
                      label="Số Điện Thoại"
                      field="phone"
                      sortable={false}
                    />
                    <DataTableHeader label="Thao Tác" align="center" sortable={false} />
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F2F0EB]">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-[#6F7E72] text-xs font-semibold">
                        Không tìm thấy tài khoản người dùng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((u) => {
                      const roleName = getUserRoleName(u);
                      const roleLabel = getUserRoleLabel(u);
                      const userAvatar = u.avatar || accountAvatarCache.getAvatar(u.username);
                      return (
                        <tr key={u.id} className="hover:bg-[#F9F8F5] transition-colors duration-100">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                {userAvatar ? (
                                  <img
                                    src={userAvatar}
                                    alt={u.username}
                                    className="w-7 h-7 rounded-full object-cover select-none shadow-xs border border-[#1E3932]/10"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#1E3932] text-white font-black text-[11px] flex items-center justify-center select-none">
                                    {u.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${u.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                />
                              </div>
                              <span className="font-extrabold text-[11px] text-[#1E3932] truncate max-w-[120px]">
                                {u.username}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {u.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Offline
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-mono text-[11px] text-[#6F7E72] truncate max-w-[188px]" title={u.email}>
                              {u.email}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-[11px] text-[#1E3932] truncate" style={{ maxWidth: 180 }}>
                              {u.detailUser?.name || <span className="text-[#9B9B9B] italic">Chưa cập nhật</span>}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <RoleBadge roleName={roleName} roleLabel={roleLabel} ondeleted={u.ondeleted} />
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] whitespace-nowrap text-[#1E3932]">
                              {u.detailUser?.phone || <span className="text-[#9B9B9B]">N/A</span>}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <UserActionMenu
                              user={u}
                              openId={openActionMenuId}
                              setOpenId={setOpenActionMenuId}
                              handleOpenUserModal={handleOpenUserModal}
                              handleDeleteUser={handleDeleteUser}
                              onRefreshData={onRefreshData}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="tài khoản người dùng"
            />
          </div>
        </div>
      )}

      {/* Sub-tab 2: Notification Management */}
      {activeSubTab === 'notifications' && (
        <div className="animate-fade-in">
          <AdminNotificationsTab
            users={userListForNotifications}
            currentUser={currentUser || null}
          />
        </div>
      )}
    </div>
  );
};

