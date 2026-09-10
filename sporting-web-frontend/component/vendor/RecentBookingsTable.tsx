import React, { useState, useMemo } from 'react';
import { CalendarCheck2, CheckCircle2, Clock, XCircle, Search, RotateCcw } from 'lucide-react';
import { BackendBooking } from '../../services/bookingService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';

interface RecentBookingsTableProps {
  bookings: BackendBooking[];
}

export const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings }) => {
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
    data: bookings,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: ['id', 'status', (b) => b.user?.username || '', (b) => b.yard?.yardName || '', (b) => b.yard?.sportType?.sportName || ''],
    sortAccessors: {
      user: (b) => b.user?.username || '',
      yard: (b) => b.yard?.yardName || '',
      vendor: (b) => b.yard?.vendor?.vendorName || '',
      priced: (b) => Number(b.priced || b.yard?.price || 0),
    },
    storageKey: 'sporting_vendor_recent_bookings_page_size',
  });

  const statusCounts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let refund = 0;
    let refunded = 0;
    let cancelled = 0;

    bookings.forEach((b) => {
      const st = String(b.status || 'unpaid').toLowerCase().trim();
      if (st === 'paid') paid++;
      else if (st === 'unpaid') unpaid++;
      else if (st === 'refund') refund++;
      else if (st === 'refunded') refunded++;
      else if (st === 'cancelled') cancelled++;
    });

    return {
      all: bookings.length,
      paid,
      unpaid,
      refund,
      refunded,
      cancelled,
    };
  }, [bookings]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-extrabold border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã Thanh Toán
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-extrabold border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Chờ Thanh Toán
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-extrabold border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Đã Hủy
          </span>
        );
      case 'refund':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-extrabold border border-amber-500/20">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            Chờ Hoàn Tiền
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 text-[11px] font-extrabold border border-purple-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Đã Hoàn Tiền
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F0EB]">
        <div>
          <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-[#006241]" />
            <span>Lịch Đặt Sân Gần Đây</span>
          </h3>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Danh sách tất cả lượt khách hàng đặt sân trực tuyến qua Sporting ONE.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm đơn, khách hàng..."
              className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <span className="text-xs font-mono font-bold text-[#006241] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
            {totalItems} Lượt Đặt
          </span>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center flex-nowrap overflow-x-auto gap-2 py-1 scrollbar-none border-b border-[#F2F0EB] pb-3">
        {[
          { key: '', label: 'Tất Cả', count: statusCounts.all, activeColor: 'bg-[#006241] text-white' },
          { key: 'paid', label: 'Đã Thanh Toán', count: statusCounts.paid, activeColor: 'bg-emerald-700 text-white' },
          { key: 'unpaid', label: 'Chờ Thanh Toán', count: statusCounts.unpaid, activeColor: 'bg-amber-700 text-white' },
          { key: 'refund', label: 'Chờ Hoàn Tiền', count: statusCounts.refund, activeColor: 'bg-amber-600 text-white' },
          { key: 'refunded', label: 'Đã Hoàn Tiền', count: statusCounts.refunded, activeColor: 'bg-purple-700 text-white' },
          { key: 'cancelled', label: 'Đã Hủy', count: statusCounts.cancelled, activeColor: 'bg-rose-700 text-white' },
        ].map((item) => {
          const isSelected = (columnFilters.status || '') === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setColumnFilter('status', item.key)}
              className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                isSelected
                  ? `${item.activeColor} shadow-2xs`
                  : 'bg-[#FAF8F5] text-[#6F7E72] hover:bg-[#F2F0EB] hover:text-[#1E3932] border border-[#E6E2D8]'
              }`}
            >
              {item.label} ({item.count})
            </button>
          );
        })}
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#F2F0EB]/50 text-xs text-[#6F7E72] font-medium">
          Chưa có đơn đặt sân nào trên hệ thống.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8]">
            <table className="w-full min-w-[750px] text-left text-xs border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
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
                    label="VỊ TRÍ / CỤM SÂN"
                    field="vendor"
                    sortable={false}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="THỜI GIAN KHUNG GIỜ"
                    field="startTime"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="SỐ TIỀN"
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
                      { label: 'Tất Cả', value: '' },
                      { label: 'Đã Thanh Toán', value: 'paid' },
                      { label: 'Chờ Thanh Toán', value: 'unpaid' },
                      { label: 'Chờ Hoàn Tiền', value: 'refund' },
                      { label: 'Đã Hoàn Tiền', value: 'refunded' },
                      { label: 'Đã Hủy', value: 'cancelled' },
                    ]}
                    className="p-3.5 pr-5"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932] font-semibold">
                {paginatedData.map((b) => {
                  const isMonthly = (b as any).itemType === 'monthly' || Boolean((b as any).startDate);
                  const customerName = b.user?.username || b.user?.email || 'Khách Vãng Lai';
                  const yardName = b.yard?.yardName || 'Sân Sporting';
                  const sportName = b.yard?.sportType?.sportName || 'Thể Thao';
                  const vendorName = b.yard?.vendor?.vendorName || 'Cụm Sân';
                  
                  const startTimeStr = isMonthly ? (b as any).startTime : formatTimeAMPM(b.startTime);
                  const endTimeStr = isMonthly ? (b as any).endTime : formatTimeAMPM(b.endTime);
                  const dateStr = isMonthly
                    ? `${String((b as any).startDate).split('T')[0]} đến ${String((b as any).endDate).split('T')[0]}`
                    : new Date(b.startTime).toLocaleDateString('vi-VN');

                  const priceNum = Number(b.priced || 0);
                  const priceFormatted = priceNum.toLocaleString('vi-VN') + 'đ';

                  return (
                    <tr key={`${isMonthly ? 'bm' : 'bk'}-${b.id}`} className="hover:bg-[#FBF8F0] transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-extrabold text-[#006241]">
                        <div className="flex items-center gap-1.5">
                          <span>{isMonthly ? `#BM-${b.id}` : `#LA-${b.id}`}</span>
                          {isMonthly && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                              Gói Tháng
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-extrabold text-[#1E3932]">{customerName}</div>
                        <div className="text-[10px] text-[#6F7E72] font-mono">{b.user?.email || ''}</div>
                      </td>

                      <td className="p-3.5">
                        <div
                          onClick={() => b.yard?.id && window.open(`/yard/${b.yard.id}`, '_blank')}
                          className="font-bold text-[#1E3932] hover:text-[#006241] cursor-pointer transition-colors"
                          title="Bấm để xem thông tin chi tiết sân"
                        >
                          {yardName}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-mono font-bold mt-0.5">
                          {sportName}
                        </span>
                      </td>

                      <td className="p-3.5 text-[#6F7E72] font-medium">
                        <div className="font-bold text-[#1E3932]">{vendorName}</div>
                        <div className="text-[10px] truncate max-w-[160px]">
                          {b.yard?.vendor?.vendorAddress || ''}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-[#1E3932]">
                          {startTimeStr} - {endTimeStr} {isMonthly && <span className="text-[10px] text-[#6F7E72] font-normal">(hàng ngày)</span>}
                        </div>
                        <div className="text-[10px] text-[#6F7E72]">{dateStr}</div>
                      </td>

                      <td className="p-3.5 text-right font-mono font-extrabold text-sm text-[#006241]">
                        {priceFormatted}
                      </td>

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
            itemLabel="lượt đặt sân"
          />
        </div>
      )}
    </div>
  );
};
