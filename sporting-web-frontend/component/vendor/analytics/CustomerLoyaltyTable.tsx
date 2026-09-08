import React, { useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Calendar,
  Building2,
  CreditCard,
  Search,
  CheckCircle2,
  CalendarCheck2,
  TrendingUp,
  UserCheck,
  Award,
  Layers,
} from 'lucide-react';
import { BackendBooking } from '../../../services/bookingService';
import { CustomerLoyaltyItem } from './types';
import { useDataTable } from '../../../hooks/useDataTable';
import { DataTableHeader } from '../../common/DataTableHeader';
import { DataTablePagination } from '../../common/DataTablePagination';

interface CustomerLoyaltyTableProps {
  bookings: BackendBooking[];
}

export const CustomerLoyaltyTable: React.FC<CustomerLoyaltyTableProps> = ({ bookings }) => {
  // Aggregate unique customer metrics from unified bookings (daily + monthly)
  const customersData: CustomerLoyaltyItem[] = useMemo(() => {
    const map = new Map<
      number,
      {
        userId: number;
        username: string;
        email: string;
        totalOrders: number;
        paidOrders: number;
        hourlyBookingsCount: number;
        monthlyBookingsCount: number;
        totalSpent: number;
        vendorsSet: Set<string>;
        yardsFreq: Record<string, number>;
        sportsFreq: Record<string, number>;
        lastDateMs: number;
        lastDateStr: string;
        hasMonthly: boolean;
      }
    >();

    bookings.forEach((b) => {
      const uId = b.user?.id || 0;
      if (!uId) return;

      const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
      const isPaid = String(b.status || '').toLowerCase().trim() === 'paid';
      const amount = Number(b.priced || 0);

      // Date of booking
      const bDate = b.createdAt
        ? new Date(b.createdAt)
        : b.startDate
        ? new Date(b.startDate)
        : new Date(b.startTime);
      const dateMs = !isNaN(bDate.getTime()) ? bDate.getTime() : 0;
      const dateStr = !isNaN(bDate.getTime()) ? bDate.toLocaleDateString('vi-VN') : '—';

      const vendorName = b.yard?.vendor?.vendorName || 'Cụm Sân';
      const yardName = b.yard?.yardName || 'Sân Sporting';
      const sportName = b.yard?.sportType?.sportName || 'Thể Thao';

      if (!map.has(uId)) {
        map.set(uId, {
          userId: uId,
          username: b.user?.username || `User #${uId}`,
          email: b.user?.email || '',
          totalOrders: 0,
          paidOrders: 0,
          hourlyBookingsCount: 0,
          monthlyBookingsCount: 0,
          totalSpent: 0,
          vendorsSet: new Set<string>(),
          yardsFreq: {},
          sportsFreq: {},
          lastDateMs: 0,
          lastDateStr: '—',
          hasMonthly: false,
        });
      }

      const item = map.get(uId)!;
      item.totalOrders += 1;
      if (isPaid) {
        item.paidOrders += 1;
        item.totalSpent += amount;
      }

      if (isMonthly) {
        item.monthlyBookingsCount += 1;
        item.hasMonthly = true;
      } else {
        item.hourlyBookingsCount += 1;
      }

      item.vendorsSet.add(vendorName);
      item.yardsFreq[yardName] = (item.yardsFreq[yardName] || 0) + 1;
      item.sportsFreq[sportName] = (item.sportsFreq[sportName] || 0) + 1;

      if (dateMs > item.lastDateMs) {
        item.lastDateMs = dateMs;
        item.lastDateStr = dateStr;
      }
    });

    // Convert map to list and classify tiers
    return Array.from(map.values()).map((raw) => {
      // Find top yard and top sport
      let topYard = '—';
      let topYardCount = 0;
      Object.entries(raw.yardsFreq).forEach(([yName, count]) => {
        if (count > topYardCount) {
          topYard = yName;
          topYardCount = count;
        }
      });

      let topSport = 'Thể Thao';
      let topSportCount = 0;
      Object.entries(raw.sportsFreq).forEach(([sName, count]) => {
        if (count > topSportCount) {
          topSport = sName;
          topSportCount = count;
        }
      });

      // Customer tier classification
      let tier: 'vip' | 'regular' | 'new' = 'new';
      if (raw.paidOrders >= 5 || raw.totalSpent >= 1500000 || raw.hasMonthly) {
        tier = 'vip';
      } else if (raw.paidOrders >= 2 || raw.totalSpent >= 300000) {
        tier = 'regular';
      }

      return {
        userId: raw.userId,
        username: raw.username,
        email: raw.email,
        totalOrders: raw.totalOrders,
        paidOrders: raw.paidOrders,
        hourlyBookingsCount: raw.hourlyBookingsCount,
        monthlyBookingsCount: raw.monthlyBookingsCount,
        totalSpent: raw.totalSpent,
        vendorNames: Array.from(raw.vendorsSet),
        favoriteYardName: topYard,
        favoriteSportName: topSport,
        lastBookingDate: raw.lastDateStr,
        customerTier: tier,
        hasMonthlyBooking: raw.hasMonthly,
      };
    });
  }, [bookings]);

  // Data table hook for pagination, search, sorting
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
  } = useDataTable<CustomerLoyaltyItem>({
    data: customersData,
    initialPageSize: 10,
    initialSortField: 'totalSpent',
    initialSortDirection: 'desc',
    searchFields: [
      'username',
      'email',
      'favoriteYardName',
      'favoriteSportName',
      (c) => c.vendorNames.join(' '),
    ],
    sortAccessors: {
      username: (c) => c.username,
      totalOrders: (c) => c.totalOrders,
      paidOrders: (c) => c.paidOrders,
      totalSpent: (c) => c.totalSpent,
      customerTier: (c) => c.customerTier,
      lastBookingDate: (c) => c.lastBookingDate,
    },
    storageKey: 'sporting_vendor_customer_loyalty_page_size',
  });

  // KPI calculations
  const statsOverview = useMemo(() => {
    const totalUsers = customersData.length;
    let vipCount = 0;
    let regularCount = 0;
    let newCount = 0;
    let totalRevenue = 0;
    let repeatCustomers = 0;

    customersData.forEach((c) => {
      if (c.customerTier === 'vip') vipCount++;
      else if (c.customerTier === 'regular') regularCount++;
      else newCount++;

      totalRevenue += c.totalSpent;
      if (c.paidOrders >= 2) repeatCustomers++;
    });

    const repeatRate = totalUsers > 0 ? (repeatCustomers / totalUsers) * 100 : 0;
    const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    return {
      totalUsers,
      vipCount,
      regularCount,
      newCount,
      totalRevenue,
      repeatRate,
      arpu,
    };
  }, [customersData]);

  const renderTierBadge = (tier: 'vip' | 'regular' | 'new') => {
    switch (tier) {
      case 'vip':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-900 font-extrabold text-[11px] border border-amber-300">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            Khách VIP
          </span>
        );
      case 'regular':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 font-extrabold text-[11px] border border-emerald-500/20">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Khách Thân Thiết
          </span>
        );
      case 'new':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
            <UserPlus className="w-3.5 h-3.5 text-slate-600" />
            Khách Mới
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-5">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F0EB]">
        <div>
          <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#006241]" />
            <span>Quản Lý Khách Hàng & Khách Quen Đặt Sân</span>
          </h3>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Thống kê lượt đặt theo từng khách hàng, số lượng sân đã thuê theo cụm sân/vendor nhỏ và phân hạng khách quen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm khách hàng, email, sân..."
              className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-full bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <span className="text-xs font-mono font-bold text-[#006241] bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 shrink-0">
            {totalItems} Khách Hàng
          </span>
        </div>
      </div>

      {/* 4 Summary Stat Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Tổng Khách Hàng</p>
            <p className="text-lg font-black font-mono text-[#1E3932] mt-0.5">{statsOverview.totalUsers}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center">
            <Users className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Khách VIP & Thân Thiết</p>
            <p className="text-lg font-black font-mono text-amber-900 mt-0.5">
              {statsOverview.vipCount + statsOverview.regularCount}
              <span className="text-xs font-normal text-amber-700 ml-1.5 font-sans">
                ({statsOverview.vipCount} VIP)
              </span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <Award className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Tỷ Lệ Đặt Lại</p>
            <p className="text-lg font-black font-mono text-emerald-900 mt-0.5">
              {statsOverview.repeatRate.toFixed(1)}%
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Chi Tiêu TB / Khách</p>
            <p className="text-lg font-black font-mono text-[#006241] mt-0.5">
              {Math.round(statsOverview.arpu).toLocaleString('vi-VN')}đ
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#F2F0EB]">
        {[
          { key: '', label: 'Tất Cả Khách', count: statsOverview.totalUsers },
          { key: 'vip', label: 'Khách VIP', count: statsOverview.vipCount, icon: Award },
          { key: 'regular', label: 'Khách Thân Thiết', count: statsOverview.regularCount, icon: UserCheck },
          { key: 'new', label: 'Khách Mới', count: statsOverview.newCount, icon: UserPlus },
        ].map((tab) => {
          const isSelected = (columnFilters.customerTier || '') === tab.key;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setColumnFilter('customerTier', tab.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#006241] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#6F7E72] hover:bg-[#F2F0EB] hover:text-[#1E3932] border border-[#E6E2D8]'
              }`}
            >
              {IconComp && <IconComp className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#E6E2D8]/60 text-[#6F7E72]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {customersData.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#F2F0EB]/50 text-xs text-[#6F7E72] font-medium">
          Chưa có dữ liệu khách hàng đặt sân.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8]">
            <table className="w-full text-left text-xs border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[#1E3932] uppercase font-mono text-[11px] tracking-wider">
                  <DataTableHeader
                    label="KHÁCH HÀNG"
                    field="username"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5 pl-5"
                  />
                  <DataTableHeader
                    label="PHÂN HẠNG"
                    field="customerTier"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="LƯỢT ĐẶT SÂN"
                    field="totalOrders"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="TỔNG CHI TIÊU"
                    field="totalSpent"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="CỤM SÂN & SÂN YÊU THÍCH"
                    field="vendor"
                    sortable={false}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="LẦN ĐẶT GẦN NHẤT"
                    field="lastBookingDate"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                    className="p-3.5 pr-5"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932] font-semibold">
                {paginatedData.map((c) => {
                  return (
                    <tr key={c.userId} className="hover:bg-[#FBF8F0] transition-colors">
                      {/* Customer Info */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#006241]/10 text-[#006241] font-bold text-xs flex items-center justify-center border border-[#006241]/20 shrink-0">
                            {c.username ? c.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#1E3932] flex items-center gap-1.5">
                              <span>{c.username}</span>
                              {c.hasMonthlyBooking && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                  Có Gói Tháng
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#6F7E72] font-mono">{c.email || 'Chưa cập nhật email'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="p-3.5">{renderTierBadge(c.customerTier)}</td>

                      {/* Orders Count Breakdown */}
                      <td className="p-3.5 font-mono">
                        <div className="font-extrabold text-[#1E3932] text-sm">
                          {c.totalOrders} lượt
                        </div>
                        <div className="text-[10px] text-[#6F7E72]">
                          {c.paidOrders} đơn thành công ({c.hourlyBookingsCount}h, {c.monthlyBookingsCount} tháng)
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="p-3.5 text-right font-mono">
                        <div className="font-extrabold text-sm text-[#006241]">
                          {c.totalSpent.toLocaleString('vi-VN')}đ
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {c.paidOrders > 0
                            ? `~${Math.round(c.totalSpent / c.paidOrders).toLocaleString('vi-VN')}đ/đơn`
                            : 'Chưa thanh toán'}
                        </div>
                      </td>

                      {/* Vendors & Favorite Yard */}
                      <td className="p-3.5">
                        <div className="space-y-0.5 max-w-[240px]">
                          <div className="font-bold text-[#1E3932] flex items-center gap-1 truncate">
                            <Building2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                            <span className="truncate">{c.favoriteYardName}</span>
                            <span className="text-[10px] text-[#006241] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                              {c.favoriteSportName}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#6F7E72] flex items-center gap-1 truncate">
                            <Layers className="w-3 h-3 text-[#6F7E72] shrink-0" />
                            <span className="truncate">Cụm: {c.vendorNames.join(', ') || 'Cụm chính'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Last Booking Date */}
                      <td className="p-3.5 pr-5 text-right font-mono">
                        <div className="font-bold text-[#1E3932] flex items-center justify-end gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                          <span>{c.lastBookingDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
};
