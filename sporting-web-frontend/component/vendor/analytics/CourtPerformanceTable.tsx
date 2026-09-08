import React, { useMemo } from 'react';
import {
  Activity,
  Search,
  TrendingUp,
  TrendingDown,
  Building2,
  Trophy,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CourtPerformanceItem } from './types';
import { useDataTable } from '../../../hooks/useDataTable';
import { DataTableHeader } from '../../common/DataTableHeader';
import { DataTablePagination } from '../../common/DataTablePagination';

interface CourtPerformanceTableProps {
  courts: CourtPerformanceItem[];
}

export const CourtPerformanceTable: React.FC<CourtPerformanceTableProps> = ({ courts }) => {
  // Helper to determine court status key
  const getStatusKey = (c: CourtPerformanceItem): 'good' | 'normal' | 'optimize' => {
    if (c.occupancyRate >= 50 || c.grossRevenue >= 300000) return 'good';
    if (c.occupancyRate < 25 && c.grossRevenue === 0) return 'optimize';
    return 'normal';
  };

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
  } = useDataTable<CourtPerformanceItem>({
    data: courts,
    initialPageSize: 10,
    initialSortField: 'grossRevenue',
    initialSortDirection: 'desc',
    searchFields: ['yardName', 'vendorName', 'sportName'],
    sortAccessors: {
      yardName: (c) => c.yardName,
      vendorName: (c) => c.vendorName,
      sportName: (c) => c.sportName,
      grossRevenue: (c) => Number(c.grossRevenue || 0),
      ordersCount: (c) => Number(c.ordersCount || 0),
      bookedHours: (c) => Number(c.bookedHours || 0),
      occupancyRate: (c) => Number(c.occupancyRate || 0),
      aov: (c) => Number(c.aov || 0),
      status: (c) => getStatusKey(c),
    },
    storageKey: 'sporting_vendor_court_performance_page_size',
  });

  const statusCounts = useMemo(() => {
    let good = 0;
    let normal = 0;
    let optimize = 0;

    courts.forEach((c) => {
      const st = getStatusKey(c);
      if (st === 'good') good++;
      else if (st === 'optimize') optimize++;
      else normal++;
    });

    return {
      all: courts.length,
      good,
      normal,
      optimize,
    };
  }, [courts]);

  const uniqueSports = useMemo(() => {
    const set = new Set<string>();
    courts.forEach((c) => {
      if (c.sportName) set.add(c.sportName);
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [courts]);

  const uniqueVendors = useMemo(() => {
    const set = new Set<string>();
    courts.forEach((c) => {
      if (c.vendorName) set.add(c.vendorName);
    });
    return Array.from(set).map((v) => ({ label: v, value: v }));
  }, [courts]);

  const renderStatusBadge = (c: CourtPerformanceItem) => {
    const st = getStatusKey(c);
    if (st === 'good') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-extrabold border border-emerald-500/20">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          Rất Tốt
        </span>
      );
    }
    if (st === 'optimize') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-extrabold border border-rose-500/20">
          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          Cần Tối Ưu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold border border-slate-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
        Ổn Định
      </span>
    );
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      {/* Header & Global Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#F2F0EB]">
        <div>
          <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#006241]" />
            <span>Bảng Hiệu Suất Từng Sân Con</span>
          </h3>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Chi tiết doanh thu, số lượt đặt, độ lấp đầy và giá trị đơn của từng sân.
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
              placeholder="Tìm tên sân, cụm, môn..."
              className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <span className="text-xs font-mono font-bold text-[#006241] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
            {totalItems} Sân Con
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center flex-nowrap overflow-x-auto gap-2 py-1 scrollbar-none border-b border-[#F2F0EB] pb-3">
        {[
          { key: '', label: 'Tất Cả', count: statusCounts.all, activeColor: 'bg-[#006241] text-white' },
          { key: 'good', label: 'Rất Tốt', count: statusCounts.good, activeColor: 'bg-emerald-700 text-white' },
          { key: 'normal', label: 'Ổn Định', count: statusCounts.normal, activeColor: 'bg-slate-700 text-white' },
          { key: 'optimize', label: 'Cần Tối Ưu', count: statusCounts.optimize, activeColor: 'bg-rose-700 text-white' },
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

      {/* Table Body */}
      {courts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#F2F0EB]/50 text-xs text-[#6F7E72] font-medium">
          Chưa có dữ liệu sân nào trên hệ thống.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8]/60 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FBF8F0]/80 border-b border-[#E6E2D8]">
              <tr>
                <DataTableHeader
                  label="SÂN CON"
                  field="yardName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.yardName}
                  onFilterChange={(val) => setColumnFilter('yardName', val)}
                  filterPlaceholder="Lọc tên sân..."
                  className="rounded-tl-2xl pl-5"
                />

                <DataTableHeader
                  label="CỤM SÂN"
                  field="vendorName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.vendorName}
                  onFilterChange={(val) => setColumnFilter('vendorName', val)}
                  filterOptions={uniqueVendors}
                />

                <DataTableHeader
                  label="BỘ MÔN"
                  field="sportName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.sportName}
                  onFilterChange={(val) => setColumnFilter('sportName', val)}
                  filterOptions={uniqueSports}
                />

                <DataTableHeader
                  label="DOANH THU"
                  field="grossRevenue"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />

                <DataTableHeader
                  label="SỐ ĐƠN"
                  field="ordersCount"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />

                <DataTableHeader
                  label="GIỜ ĐÃ ĐẶT"
                  field="bookedHours"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />

                <DataTableHeader
                  label="TỶ LỆ LẤP ĐẦY"
                  field="occupancyRate"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />

                <DataTableHeader
                  label="GIÁ TRỊ TB (AOV)"
                  field="aov"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />

                <DataTableHeader
                  label="TÌNH TRẠNG"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="rounded-tr-2xl pr-5"
                  align="left"
                />
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F2F0EB]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#6F7E72]">
                    Không tìm thấy sân nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedData.map((c) => {
                  return (
                    <tr
                      key={c.yardId}
                      className="hover:bg-[#FAF8F5] transition-colors group"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#006241] shrink-0" />
                          <span className="font-extrabold text-[#1E3932]">
                            {c.yardName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-[#6F7E72] max-w-[160px] truncate">
                        {c.vendorName}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                          {c.sportName}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-black text-[#006241] text-xs">
                        {c.grossRevenue.toLocaleString('vi-VN')}đ
                      </td>

                      <td className="py-3.5 px-3 font-mono font-extrabold text-[#1E3932]">
                        {c.ordersCount} <span className="font-sans font-medium text-[11px] text-[#6F7E72]">đơn</span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[#6F7E72] font-semibold">
                        {c.bookedHours.toFixed(1)}h
                      </td>

                      <td className="py-3.5 px-3 font-mono font-extrabold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                            c.occupancyRate >= 50
                              ? 'bg-emerald-500/10 text-[#006241] border border-emerald-500/20'
                              : c.occupancyRate >= 20
                              ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {c.occupancyRate.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[#1E3932] font-bold">
                        {Math.round(c.aov).toLocaleString('vi-VN')}đ
                      </td>

                      <td className="py-3.5 pl-3 pr-5">
                        {renderStatusBadge(c)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <DataTablePagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="sân con"
      />
    </div>
  );
};
