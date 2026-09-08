import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit2, Trash2, CheckCircle2, XCircle, MoreVertical, Search, RefreshCw, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminVendor, adminService } from '../../services/adminService';
import { accountAvatarCache } from '../../services/userProfileService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import { CustomSelect } from '../common/CustomSelect';

interface AdminVendorsTabProps {
  filteredVendors: AdminVendor[];
  vendorStatusFilter: 'ALL' | 'active' | 'pending' | 'reject';
  setVendorStatusFilter: (filter: 'ALL' | 'active' | 'pending' | 'reject') => void;
  openActionMenuId: string | null;
  setOpenActionMenuId: (id: string | null) => void;
  handleOpenVendorModal: (vendor?: AdminVendor) => void;
  handleQuickChangeVendorStatus: (id: number, status: 'active' | 'pending' | 'reject') => void;
  handleDeleteVendor: (id: number) => void;
  onRefreshData?: () => void;
}

interface DropdownPos { top?: number; bottom?: number; right: number }

const VendorActionMenu: React.FC<{
  vendor: AdminVendor;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  handleOpenVendorModal: (v: AdminVendor) => void;
  handleQuickChangeVendorStatus: (id: number, status: 'active' | 'pending' | 'reject') => void;
  handleDeleteVendor: (id: number) => void;
  onRefreshData?: () => void;
}> = ({ vendor: v, openId, setOpenId, handleOpenVendorModal, handleQuickChangeVendorStatus, handleDeleteVendor, onRefreshData }) => {
  const key = `vendor-${v.id}`;
  const isOpen = openId === key;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<DropdownPos>({ right: 0 });

  const recalc = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const right = Math.max(8, window.innerWidth - r.right);

    if (spaceBelow < 180) {
      setPos({ bottom: window.innerHeight - r.top + 4, right });
    } else {
      setPos({ top: r.bottom + 4, right });
    }
  }, []);

  const handleToggle = () => {
    if (!isOpen) recalc();
    setOpenId(isOpen ? null : key);
  };

  useEffect(() => {
    if (!isOpen) return;
    recalc();
    const sync = () => recalc();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [isOpen, recalc]);

  const handleRestore = async () => {
    const tid = toast.loading(`Đang khôi phục cơ sở Vendor #${v.id}...`);
    try {
      const res = await adminService.restoreVendor(v.id);
      if (res.success) {
        toast.success(`Đã khôi phục cơ sở Vendor #${v.id} thành công!`, { id: tid });
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.message || 'Không thể khôi phục cơ sở Vendor', { id: tid });
      }
    } catch {
      toast.error('Lỗi khi khôi phục cơ sở Vendor', { id: tid });
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-8 h-8 rounded-full hover:bg-[#F2F0EB] text-[#1E3932] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center ml-auto"
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
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-1 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              {v.status !== 'active' && !v.ondeleted && (
                <button
                  onClick={() => {
                    handleQuickChangeVendorStatus(v.id, 'active');
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#006241] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Phê Duyệt Vendor
                </button>
              )}
              {v.status !== 'reject' && !v.ondeleted && (
                <button
                  onClick={() => {
                    handleQuickChangeVendorStatus(v.id, 'reject');
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" /> Từ Chối Vendor
                </button>
              )}
              <div className="h-px bg-[#F2F0EB] mx-2" />
              <button
                onClick={() => {
                  handleOpenVendorModal(v);
                  setOpenId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#006241] shrink-0" /> Chỉnh Sửa Thông Tin
              </button>

              {v.ondeleted ? (
                <button
                  onClick={() => {
                    handleRestore();
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Khôi Phục Cơ Sở
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleDeleteVendor(v.id);
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" /> Xóa Cơ Sở Vendor
                </button>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

const StatusBadge: React.FC<{ status: string; ondeleted?: string | null }> = ({ status, ondeleted }) => {
  if (ondeleted)
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-black text-[10px] whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />Đã Xóa</span>;
  if (status === 'active')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px] whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>;
  if (status === 'pending')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[10px] whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pending</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[10px] whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Rejected</span>;
};

export const AdminVendorsTab: React.FC<AdminVendorsTabProps> = ({
  filteredVendors, vendorStatusFilter, setVendorStatusFilter,
  openActionMenuId, setOpenActionMenuId,
  handleOpenVendorModal, handleQuickChangeVendorStatus, handleDeleteVendor, onRefreshData,
}) => {
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
  } = useDataTable<AdminVendor>({
    data: filteredVendors,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: ['id', 'vendorName', 'vendorAddress', 'vendorPhone', (v) => v.user?.username || '', (v) => v.user?.email || ''],
    sortAccessors: {
      user: (v) => v.user?.username || '',
    },
    storageKey: 'sporting_admin_vendors_page_size',
  });

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header & Controls Bar */}
      <div className="px-6 py-4 rounded-[20px] bg-white border border-[#E6E2D8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-[#1E3932] tracking-tight">Quản Lý Đối Tác Vendor</h2>
          <p className="text-[11px] text-[#6F7E72] font-medium mt-0.5">Duyệt, chỉnh sửa và quản lý danh sách cơ sở sân.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Global Table Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm tên, SĐT, tài khoản..."
              className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]/40"
            />
          </div>

          <CustomSelect
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đã Duyệt (Active)' },
              { value: 'pending', label: 'Chờ Duyệt (Pending)' },
              { value: 'reject', label: 'Từ Chối (Rejected)' },
            ]}
            value={vendorStatusFilter}
            onChange={(val) => setVendorStatusFilter(val as any)}
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
            onClick={() => handleOpenVendorModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#006241] hover:bg-[#007a52] text-white font-extrabold text-[11px] transition-colors duration-150 cursor-pointer shadow-sm ml-auto md:ml-0"
          >
            <Plus className="w-3.5 h-3.5" /> Tạo Vendor Mới
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-[20px] border border-[#E6E2D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-xs text-[#1E3932] border-collapse"
            style={{ tableLayout: 'fixed', minWidth: 920 }}
          >
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>

            <thead>
              <tr className="border-b border-[#E6E2D8] bg-[#F8F7F4]">
                <DataTableHeader
                  label="Mã VD"
                  field="id"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="Tên Cơ Sở"
                  field="vendorName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.vendorName}
                  onFilterChange={(val) => setColumnFilter('vendorName', val)}
                  filterPlaceholder="Lọc tên..."
                />
                <DataTableHeader
                  label="Chủ Tài Khoản"
                  field="user"
                  sortable={false}
                />
                <DataTableHeader
                  label="Địa Chỉ Cơ Sở"
                  field="vendorAddress"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.vendorAddress}
                  onFilterChange={(val) => setColumnFilter('vendorAddress', val)}
                  filterPlaceholder="Lọc địa chỉ..."
                />
                <DataTableHeader
                  label="SĐT Hotline"
                  field="vendorPhone"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.vendorPhone}
                  onFilterChange={(val) => setColumnFilter('vendorPhone', val)}
                  filterPlaceholder="Lọc SĐT..."
                />
                <DataTableHeader
                  label="Giờ Mở / Đóng"
                  field="openTime"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="Trạng Thái"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.status}
                  onFilterChange={(val) => setColumnFilter('status', val)}
                  filterOptions={[
                    { label: 'Active', value: 'active' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Rejected', value: 'reject' },
                  ]}
                />
                <DataTableHeader label="Thao Tác" align="center" sortable={false} />
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F2F0EB]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6F7E72] text-xs font-semibold">
                    Không tìm thấy cơ sở Vendor nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedData.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F9F8F5] transition-colors duration-100 group">
                    <td className="px-4 py-3.5 align-middle">
                      <span className="font-mono font-bold text-[11px] text-[#9B9B9B]">VD-{v.id}</span>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-extrabold text-[12px] text-[#1E3932] truncate" title={v.vendorName}>
                        {v.vendorName}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      {(() => {
                        const ownerAvatar = v.user?.avatar || accountAvatarCache.getAvatar(v.user?.username || '');
                        return (
                          <div className="flex items-center gap-2 min-w-0">
                            {ownerAvatar ? (
                              <img
                                src={ownerAvatar}
                                alt={v.user?.username || 'Vendor'}
                                className="w-6 h-6 rounded-full object-cover shrink-0 select-none shadow-xs border border-[#1E3932]/10"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#1E3932] text-white text-[10px] font-black flex items-center justify-center shrink-0 select-none">
                                {(v.user?.username || v.user?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[11px] text-[#1E3932] truncate" title={v.user?.username}>
                                {v.user?.username || (v.userId ? `User #${v.userId}` : '—')}
                              </div>
                              {v.user?.email && (
                                <div className="text-[10px] font-mono text-[#6F7E72] truncate leading-snug" title={v.user.email}>
                                  {v.user.email}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <div className="text-[11px] text-[#4A5568] truncate" title={v.vendorAddress || ''}>
                        {v.vendorAddress || <span className="text-[#C4C4C4] italic">Chưa cập nhật</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <span className="font-mono text-[11px] text-[#1E3932] whitespace-nowrap">
                        {v.vendorPhone || <span className="text-[#C4C4C4]">—</span>}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <span className="font-mono text-[11px] font-bold text-[#006241] whitespace-nowrap bg-[#006241]/10 px-2 py-1 rounded-md">
                        {formatTimeAMPM(v.openTime || '06:00')} - {formatTimeAMPM(v.closeTime || '23:00')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <StatusBadge status={v.status} ondeleted={v.ondeleted} />
                    </td>

                    <td className="px-4 py-3.5 align-middle text-center">
                      <VendorActionMenu
                        vendor={v}
                        openId={openActionMenuId}
                        setOpenId={setOpenActionMenuId}
                        handleOpenVendorModal={handleOpenVendorModal}
                        handleQuickChangeVendorStatus={handleQuickChangeVendorStatus}
                        handleDeleteVendor={handleDeleteVendor}
                        onRefreshData={onRefreshData}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Data Table Pagination */}
        <DataTablePagination
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="cơ sở vendor"
        />
      </div>
    </div>
  );
};

