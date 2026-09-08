import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  XCircle,
  Search,
  Calendar,
  AlertTriangle,
  Building2,
  Coins,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { BackendBooking } from '../../services/bookingService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';

interface VendorRefundCancelledTabProps {
  bookings: BackendBooking[];
}

export const VendorRefundCancelledTab: React.FC<VendorRefundCancelledTabProps> = ({
  bookings,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'refunded' | 'cancelled'>('all');

  // Filter only cancelled or refunded bookings (strictly exclude pending 'refund' bookings)
  const relevantBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = String(b.status || '').toLowerCase().trim();
      if (filterType === 'refunded') return st === 'refunded';
      if (filterType === 'cancelled') return st === 'cancelled';
      return st === 'refunded' || st === 'cancelled';
    });
  }, [bookings, filterType]);

  // Overall calculations
  const stats = useMemo(() => {
    let totalRefundAmount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;

    bookings.forEach((b) => {
      const st = String(b.status || '').toLowerCase().trim();
      const startMs = new Date(b.startTime).getTime();
      const endMs = new Date(b.endTime).getTime();
      const hours = (endMs - startMs) / (1000 * 60 * 60);
      const calcHours = hours > 0 ? hours : 1;
      const priceNum =
        b.priced && Number(b.priced) > 0
          ? Number(b.priced)
          : Math.round(calcHours * Number(b.yard?.price || 0));

      if (st === 'refunded') {
        refundedCount += 1;
        totalRefundAmount += priceNum;
      } else if (st === 'cancelled') {
        cancelledCount += 1;
      }
    });

    return {
      totalCount: refundedCount + cancelledCount,
      refundedCount,
      cancelledCount,
      totalRefundAmount,
    };
  }, [bookings]);

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
    handleSort,
  } = useDataTable<BackendBooking>({
    data: relevantBookings,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: [
      'id',
      'status',
      (b) => b.user?.username || '',
      (b) => b.user?.email || '',
      (b) => b.yard?.yardName || '',
      (b) => b.yard?.sportType?.sportName || '',
      (b) => b.yard?.vendor?.vendorName || '',
    ],
    sortAccessors: {
      user: (b) => b.user?.username || '',
      yard: (b) => b.yard?.yardName || '',
      vendor: (b) => b.yard?.vendor?.vendorName || '',
      priced: (b) => Number(b.priced || b.yard?.price || 0),
    },
    storageKey: 'sporting_vendor_refund_cancelled_page_size',
  });

  const renderStatusBadge = (status: string) => {
    const st = String(status || '').toLowerCase().trim();
    if (st === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 text-xs font-black border border-purple-500/30 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          Đã Hoàn Tiền
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-black border border-rose-500/30 shadow-2xs">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Đã Hủy
      </span>
    );
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Tổng Đơn Huỷ / Hoàn
            </span>
            <div className="text-2xl font-black text-[#1E3932] font-mono mt-0.5">
              {stats.totalCount}{' '}
              <span className="text-xs font-sans font-bold text-[#6F7E72]">đơn</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Tổng Tiền Đã Hoàn
            </span>
            <div className="text-2xl font-black text-purple-700 font-mono mt-0.5">
              {stats.totalRefundAmount.toLocaleString('vi-VN')}
              <span className="text-xs font-sans font-bold text-purple-600/70 ml-1">đ (Xu)</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Đã Hoàn Tiền
            </span>
            <div className="text-2xl font-black text-purple-700 font-mono mt-0.5">
              {stats.refundedCount}{' '}
              <span className="text-xs font-sans font-bold text-[#6F7E72]">đơn</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Đơn Đã Hủy (Cancelled)
            </span>
            <div className="text-2xl font-black text-rose-700 font-mono mt-0.5">
              {stats.cancelledCount}{' '}
              <span className="text-xs font-sans font-bold text-[#6F7E72]">đơn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-5">
        {/* Table Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F2F0EB]">
          <div>
            <h3 className="text-lg font-extrabold text-[#1E3932] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-700">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span>Danh Sách Đơn Huỷ & Hoàn Tiền (Cancelled & Refunded Orders)</span>
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium mt-1">
              Báo cáo đầy đủ thông tin tất cả các đơn đặt sân bị hủy bởi khách hàng hoặc được hệ thống hoàn tiền vào ví.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#FAF8F5] border border-[#E6E2D8]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${filterType === 'all'
                  ? 'bg-[#006241] text-white shadow-2xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
                  }`}
              >
                Tất Cả ({stats.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('refunded')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${filterType === 'refunded'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
                  }`}
              >
                Đã Hoàn Tiền ({stats.refundedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('cancelled')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${filterType === 'cancelled'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
                  }`}
              >
                Đã Hủy ({stats.cancelledCount})
              </button>
            </div>

            {/* Global Search Input */}
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Tìm mã đơn, khách, sân..."
                className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>
          </div>
        </div>

        {relevantBookings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#FAF8F5] border border-dashed border-[#E6E2D8] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-extrabold text-[#1E3932]">Không có đơn hủy hay hoàn tiền nào</h4>
            <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
              Tuyệt vời! Hiện tại cụm sân của bạn không có đơn đặt sân nào trong trạng thái đã hủy hoặc chờ hoàn tiền.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8]">
              <table className="w-full text-left text-xs border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[#1E3932] uppercase font-mono text-[11px] tracking-wider">
                    <DataTableHeader
                      label="ORDER ID"
                      field="id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="p-3.5 pl-5"
                    />
                    <DataTableHeader
                      label="KHÁCH HÀNG"
                      field="user"
                      sortable={false}
                      className="p-3.5"
                    />
                    <DataTableHeader
                      label="SÂN & MÔN THỂ THAO"
                      field="yard"
                      sortable={false}
                      className="p-3.5"
                    />
                    <DataTableHeader
                      label="CỤM SÂN & ĐỊA CHỈ"
                      field="vendor"
                      sortable={false}
                      className="p-3.5"
                    />
                    <DataTableHeader
                      label="KHUNG GIỜ ĐẶT"
                      field="startTime"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="p-3.5"
                    />
                    <DataTableHeader
                      label="SỐ TIỀN HOÀN / HUỶ"
                      field="priced"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      align="right"
                      className="p-3.5"
                    />
                    <DataTableHeader
                      label="TRẠNG THÁI"
                      field="status"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      align="right"
                      filterValue={columnFilters.status}
                      onFilterChange={(val) => setColumnFilter('status', val)}
                      filterOptions={[
                        { label: 'Đã Hoàn Tiền', value: 'refunded' },
                        { label: 'Đã Hủy', value: 'cancelled' },
                      ]}
                      className="p-3.5 pr-5"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932] font-semibold">
                  {paginatedData.map((b) => {
                    const customerName = b.user?.username || b.user?.email || 'Khách Vãng Lai';
                    const yardName = b.yard?.yardName || (b.yard?.id || (b as any).yardId ? `Sân #${b.yard?.id || (b as any).yardId}` : 'Sân Sporting');
                    const sportName = b.yard?.sportType?.sportName || 'Thể Thao';
                    const typeName = b.yard?.typeYard?.typeName || 'Sân tiêu chuẩn';
                    const vendorName = b.yard?.vendor?.vendorName || 'Cụm Sân';
                    const vendorAddress = b.yard?.vendor?.vendorAddress || 'Chưa cập nhật địa chỉ';
                    const startTimeStr = formatTimeAMPM(b.startTime);
                    const endTimeStr = formatTimeAMPM(b.endTime);
                    const dateStr = new Date(b.startTime).toLocaleDateString('vi-VN');

                    const startMs = new Date(b.startTime).getTime();
                    const endMs = new Date(b.endTime).getTime();
                    const hours = (endMs - startMs) / (1000 * 60 * 60);
                    const calcHours = hours > 0 ? hours : 1;
                    const priceNum =
                      b.priced && Number(b.priced) > 0
                        ? Number(b.priced)
                        : Math.round(calcHours * Number(b.yard?.price || 0));
                    const priceFormatted = priceNum.toLocaleString('vi-VN') + 'đ';

                    return (
                      <tr key={b.id} className="hover:bg-[#FBF8F0] transition-colors">
                        {/* Order ID */}
                        <td className="p-3.5 pl-5 font-mono font-extrabold text-[#006241]">
                          #LA-{b.id}
                        </td>

                        {/* Customer */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-[#1E3932]">{customerName}</div>
                          <div className="text-[10px] text-[#6F7E72] font-mono">{b.user?.email || ''}</div>
                        </td>

                        {/* Yard & Sport */}
                        <td className="p-3.5">
                          <div
                            onClick={() => b.yard?.id && window.open(`/yard/${b.yard.id}`, '_blank')}
                            className={`font-bold text-[#1E3932] transition-colors ${b.yard?.id ? 'hover:text-[#006241] cursor-pointer' : ''
                              }`}
                            title="Xem chi tiết sân"
                          >
                            {yardName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-mono font-bold">
                              {sportName}
                            </span>
                            <span className="text-[10px] text-[#6F7E72] font-medium">({typeName})</span>
                          </div>
                        </td>

                        {/* Vendor & Address */}
                        <td className="p-3.5 text-[#6F7E72] font-medium">
                          <div className="font-bold text-[#1E3932]">{vendorName}</div>
                          <div className="text-[10px] truncate max-w-[180px]" title={vendorAddress}>
                            {vendorAddress}
                          </div>
                        </td>

                        {/* Booking Time */}
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-[#1E3932]">
                            {startTimeStr} - {endTimeStr}
                          </div>
                          <div className="text-[10px] text-[#6F7E72]">{dateStr}</div>
                        </td>

                        {/* Amount */}
                        <td className="p-3.5 text-right font-mono font-black text-sm text-purple-700">
                          {priceFormatted}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 pr-5 text-right">{renderStatusBadge(b.status)}</td>
                      </tr>
                    );
                  })}
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
              itemLabel="đơn hủy / hoàn"
            />
          </div>
        )}
      </div>
    </div>
  );
};
