import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  Building2,
  Search,
  Store,
  RefreshCw,
  RotateCcw,
  Camera,
  Eye,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminYard, AdminVendor, adminService } from '../../services/adminService';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import { VendorMultiSelectFilter } from './VendorMultiSelectFilter';
import { CompactTableImageCarousel } from '../common/CompactTableImageCarousel';
import { CustomSelect } from '../common/CustomSelect';

interface AdminYardsTabProps {
  yards: AdminYard[];
  vendors?: AdminVendor[];
  openActionMenuId: string | null;
  setOpenActionMenuId: (id: string | null) => void;
  handleOpenYardModal: (yard?: AdminYard, initialTab?: 'info' | 'images' | 'preview') => void;
  handleDeleteYard: (id: number) => void;
  onRefreshData?: () => void;
}

const AdminYardActionMenu: React.FC<{
  yard: AdminYard;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  handleOpenYardModal: (yard: AdminYard, initialTab?: 'info' | 'images' | 'preview') => void;
  handleDeleteYard: (id: number) => void;
  onRefreshData?: () => void;
}> = ({ yard: y, openId, setOpenId, handleOpenYardModal, handleDeleteYard, onRefreshData }) => {
  const menuKey = `yard-${y.id}`;
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

  const handleRestoreYard = async () => {
    const tid = toast.loading(`Đang khôi phục sân #${y.id}...`);
    try {
      const res = await adminService.restoreYard(y.id);
      if (res.success) {
        toast.success(`Đã khôi phục sân #${y.id} (${y.yardName}) thành công!`, { id: tid });
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.message || 'Không thể khôi phục sân', { id: tid });
      }
    } catch {
      toast.error('Lỗi khi khôi phục sân', { id: tid });
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-8 h-8 rounded-full hover:bg-[#F2F0EB] text-[#1E3932] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center ml-auto focus:outline-none focus:ring-2 focus:ring-[#006241]"
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
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-1 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <button
                onClick={() => {
                  handleOpenYardModal(y, 'info');
                  setOpenId(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#006241]" />
                <span>Sửa Thông Tin Sân</span>
              </button>

              <button
                onClick={() => {
                  handleOpenYardModal(y, 'images');
                  setOpenId(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#006241]" />
                <span>Quản Lý Ảnh Thực Tế</span>
              </button>

              <button
                onClick={() => {
                  handleOpenYardModal(y, 'preview');
                  setOpenId(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#006241]" />
                <span>Xem Trước Hiển Thị</span>
              </button>

              {y.ondeleted ? (
                <button
                  onClick={() => {
                    handleRestoreYard();
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border-t border-[#E6E2D8]/50 mt-1 pt-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Khôi Phục Sân</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleDeleteYard(y.id);
                    setOpenId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border-t border-[#E6E2D8]/50 mt-1 pt-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Xóa Sân Thể Thao</span>
                </button>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export const AdminYardsTab: React.FC<AdminYardsTabProps> = ({
  yards,
  vendors = [],
  openActionMenuId,
  setOpenActionMenuId,
  handleOpenYardModal,
  handleDeleteYard,
  onRefreshData,
}) => {
  const [selectedVendorIds, setSelectedVendorIdsState] = useState<number[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('vendorIds') || params.get('vendorId');
      if (urlVal && urlVal !== 'ALL') {
        const ids = urlVal.split(',').map(Number).filter((n) => !isNaN(n));
        if (ids.length > 0) return ids;
      }
      const saved = sessionStorage.getItem('sporting_admin_yards_vendor_filter');
      if (saved && saved !== 'ALL') {
        const ids = saved.split(',').map(Number).filter((n) => !isNaN(n));
        if (ids.length > 0) return ids;
      }
    } catch { }
    return [];
  });

  const [statusFilter, setStatusFilterState] = useState<'ALL' | 'active' | 'deleted'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlStatus = params.get('status');
      if (urlStatus && ['ALL', 'active', 'deleted'].includes(urlStatus)) {
        return urlStatus as any;
      }
      const saved = sessionStorage.getItem('sporting_admin_yards_status_filter');
      if (saved && ['ALL', 'active', 'deleted'].includes(saved)) {
        return saved as any;
      }
    } catch { }
    return 'ALL';
  });

  const setSelectedVendorIds = (val: number[]) => {
    setSelectedVendorIdsState(val);
    try {
      if (val.length === 0) {
        sessionStorage.setItem('sporting_admin_yards_vendor_filter', 'ALL');
      } else {
        sessionStorage.setItem('sporting_admin_yards_vendor_filter', val.join(','));
      }
      const url = new URL(window.location.href);
      if (val.length === 0) {
        url.searchParams.delete('vendorId');
        url.searchParams.delete('vendorIds');
      } else {
        url.searchParams.set('vendorIds', val.join(','));
        url.searchParams.delete('vendorId');
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { }
  };

  const setStatusFilter = (val: 'ALL' | 'active' | 'deleted') => {
    setStatusFilterState(val);
    try {
      sessionStorage.setItem('sporting_admin_yards_status_filter', val);
      const url = new URL(window.location.href);
      if (val === 'ALL') {
        url.searchParams.delete('status');
      } else {
        url.searchParams.set('status', val);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { }
  };

  // Counts for summary
  const counts = useMemo(() => {
    const total = yards.length;
    const active = yards.filter((y) => !y.ondeleted).length;
    const deleted = yards.filter((y) => Boolean(y.ondeleted)).length;
    return { total, active, deleted };
  }, [yards]);

  // Extract list of vendors for dropdown options
  const vendorList = useMemo(() => {
    if (vendors && vendors.length > 0) {
      return vendors;
    }
    const map = new Map<number, AdminVendor>();
    yards.forEach((y) => {
      if (y.vendor && y.vendor.id) {
        map.set(y.vendor.id, y.vendor);
      }
    });
    return Array.from(map.values());
  }, [yards, vendors]);

  // Filtered by selected vendors and status before passing to useDataTable
  const filteredYards = useMemo(() => {
    return yards.filter((y) => {
      if (selectedVendorIds.length > 0) {
        const vId = Number(y.vendor?.id || y.vendorId);
        if (!selectedVendorIds.includes(vId)) return false;
      }
      if (statusFilter === 'active') {
        return !y.ondeleted;
      }
      if (statusFilter === 'deleted') {
        return Boolean(y.ondeleted);
      }
      return true;
    });
  }, [yards, selectedVendorIds, statusFilter]);

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
  } = useDataTable<AdminYard>({
    data: filteredYards,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: ['id', 'yardName', 'price', (y) => y.vendor?.vendorName || ''],
    sortAccessors: {
      vendor: (y) => y.vendor?.vendorName || '',
      status: (y) => (y.ondeleted ? 'deleted' : 'active'),
      price: (y) => y.price,
      peakHourPrice: (y) => y.peakHourPrice,
    },
    storageKey: 'sporting_admin_yards_page_size',
  });

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner Header */}
      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#1E3932]">Quản Lý Sân Thể Thao</h2>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Quản lý toàn bộ danh sách sân, trạng thái hoạt động / xóa mềm, lọc theo Vendor và bảng giá.
          </p>
        </div>

        <button
          onClick={() => handleOpenYardModal()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-extrabold text-xs shadow-md transition-all cursor-pointer border border-white/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Sân Mới</span>
        </button>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-[24px] bg-white border border-[#E6E2D8] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Global Search Input (Compact, width-controlled) */}
        <div className="relative w-full sm:w-64 md:w-72 lg:w-80 shrink-0">
          <Search className="w-4 h-4 text-[#6F7E72] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Tìm theo tên sân, mã sân (#YARD-)..."
            className="w-full h-10 pl-10 pr-8 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] font-medium placeholder-[#6F7E72]/70 focus:outline-none focus:ring-2 focus:ring-[#006241] focus:bg-white transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6F7E72] hover:text-[#1E3932] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Actions: Status Filter, Multi-Select Vendor Filter, Reset */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end flex-1">
          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-56 md:w-60 shrink-0">
            <CustomSelect
              options={[
                { value: 'ALL', label: `Tất cả (${counts.total})` },
                { value: 'active', label: `Hoạt động (${counts.active})` },
                { value: 'deleted', label: `Đã xóa (${counts.deleted})` },
              ]}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
              prefixLabel="Trạng thái:"
              icon={<Filter className="w-3.5 h-3.5 text-[#006241]" />}
              buttonClassName="rounded-xl bg-[#FAF8F5] border-[#E6E2D8]"
            />
          </div>

          {/* Multi-Select Vendor Filter */}
          <VendorMultiSelectFilter
            vendors={vendorList}
            selectedVendorIds={selectedVendorIds}
            onChange={(ids) => {
              setSelectedVendorIds(ids);
              setCurrentPage(1);
            }}
          />

          {/* Reset Filter Button */}
          {(selectedVendorIds.length > 0 || statusFilter !== 'ALL' || globalSearch || Object.keys(columnFilters).length > 0) && (
            <button
              onClick={() => {
                setSelectedVendorIds([]);
                setStatusFilter('ALL');
                setGlobalSearch('');
                clearColumnFilters();
              }}
              className="h-10 px-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#E6F4EA] text-[#6F7E72] hover:text-[#006241] border border-[#E6E2D8] hover:border-[#006241]/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150"
              title="Đặt lại toàn bộ bộ lọc về mặc định"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[28px] border border-[#E6E2D8] shadow-xs overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1E3932]">
            <thead className="bg-[#FBF8F0] border-b border-[#E6E2D8]">
              <tr>
                <DataTableHeader
                  label="Mã Sân"
                  field="id"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="Tên Sân Thể Thao"
                  field="yardName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.yardName}
                  onFilterChange={(val) => setColumnFilter('yardName', val)}
                  filterPlaceholder="Lọc tên..."
                />
                <DataTableHeader
                  label="Cơ Sở Vendor"
                  field="vendor"
                  sortable={false}
                />
                <DataTableHeader
                  label="Trạng Thái"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader label="Ảnh Thực Tế" sortable={false} />
                <DataTableHeader
                  label="Giá Thường (/Giờ)"
                  field="price"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="Giá Cao Điểm"
                  field="peakHourPrice"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader label="Thao Tác" align="right" sortable={false} />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0EB] font-semibold">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#6F7E72]">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-[#1E3932]">Không tìm thấy sân thể thao nào</p>
                      <p className="text-xs">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái / Vendor.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((y) => {
                  const vendorName = y.vendor?.vendorName || '—';

                  return (
                    <tr
                      key={y.id}
                      className={`transition-colors ${y.ondeleted
                        ? 'bg-rose-50/40 hover:bg-rose-50/70 opacity-90'
                        : 'hover:bg-[#F2F0EB]/50'
                        }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-[#6F7E72]">
                        YARD-{y.id}
                      </td>

                      <td className="px-5 py-3.5 font-extrabold text-[#1E3932]">
                        <div className="flex items-center gap-2">
                          <span className={y.ondeleted ? 'line-through text-gray-500' : ''}>
                            {y.yardName}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {vendorName !== '—' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#006241]/10 border border-[#006241]/20 flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-[#006241]" />
                            </div>
                            <span className="font-bold text-[#1E3932] text-xs">{vendorName}</span>
                          </div>
                        ) : (
                          <span className="text-[#6F7E72] italic text-xs">Chưa liên kết</span>
                        )}
                      </td>

                      {/* Trạng Thái Column */}
                      <td className="px-5 py-3.5">
                        {y.ondeleted ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] whitespace-nowrap shadow-2xs"
                            title={`Đã xóa lúc: ${new Date(y.ondeleted).toLocaleString('vi-VN')}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Đã Xóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt Động
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-2.5">
                        <CompactTableImageCarousel
                          images={(y as any).images}
                          title={y.yardName}
                          onEditImages={() => handleOpenYardModal(y, 'images')}
                        />
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[#006241] font-extrabold">
                        {Number(y.price || y.pricePerHour || 100000).toLocaleString('vi-VN')} VNĐ
                      </td>

                      <td className="px-5 py-3.5 font-mono text-amber-700 font-extrabold">
                        {y.peakHourPrice !== undefined && y.peakHourPrice !== null
                          ? `${Number(y.peakHourPrice).toLocaleString('vi-VN')} VNĐ`
                          : `${Number(Math.round(Number(y.price || y.pricePerHour || 100000) * 1.5)).toLocaleString('vi-VN')} VNĐ`}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <AdminYardActionMenu
                          yard={y}
                          openId={openActionMenuId}
                          setOpenId={setOpenActionMenuId}
                          handleOpenYardModal={handleOpenYardModal}
                          handleDeleteYard={handleDeleteYard}
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

        {/* Data Table Pagination */}
        <DataTablePagination
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="sân bóng"
        />
      </div>
    </div>
  );
};

