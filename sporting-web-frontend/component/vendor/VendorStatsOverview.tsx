import React from 'react';
import {
  DollarSign,
  Building2,
  Grid,
  CalendarCheck2,
  TrendingUp,
  Percent,
  Flame,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { BackendVendor, BackendYardItem } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';

interface VendorStatsOverviewProps {
  vendors: BackendVendor[];
  yards?: BackendYardItem[];
  bookings: BackendBooking[];
  selectedVendor: BackendVendor | null;
  onNavigateToAnalytics?: () => void;
}

export const VendorStatsOverview: React.FC<VendorStatsOverviewProps> = ({
  vendors,
  yards = [],
  bookings,
  selectedVendor,
  onNavigateToAnalytics,
}) => {
  const activeVendorsCount = vendors.filter((v) => v.status === 'active').length;

  let totalYards = 0;
  vendors.forEach((v) => {
    if (!selectedVendor || selectedVendor.id === v.id) {
      totalYards += v.yards?.length || 0;
    }
  });

  // Calculate synchronized financial & operations overview metrics
  let grossRevenue = 0;
  let refundedAmount = 0;
  let paidOrdersCount = 0;
  let unpaidOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let refundedOrdersCount = 0;
  let totalBookedHours = 0;

  bookings.forEach((b) => {
    const st = String(b.status || '').toLowerCase().trim();
    const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
    let calcHours = 1;
    let amount = Number(b.priced || 0);

    if (isMonthly) {
      if (
        typeof b.startTime === 'string' &&
        typeof b.endTime === 'string' &&
        b.startTime.includes(':') &&
        b.endTime.includes(':')
      ) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        calcHours = (diff > 0 ? diff / 60 : 1) * 30;
      }
    } else {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      calcHours = hours > 0 ? hours : 1;
      if (!amount || isNaN(amount)) {
        amount = Math.round(calcHours * Number(b.yard?.price || 0));
      }
    }

    if (st === 'paid') {
      grossRevenue += amount;
      paidOrdersCount += 1;
      totalBookedHours += calcHours;
    } else if (st === 'refunded') {
      refundedOrdersCount += 1;
      refundedAmount += amount;
    } else if (st === 'unpaid') {
      unpaidOrdersCount += 1;
    } else if (st === 'cancelled') {
      cancelledOrdersCount += 1;
    }
  });

  const netRevenue = Math.max(grossRevenue - refundedAmount, 0);
  const aov = paidOrdersCount > 0 ? grossRevenue / paidOrdersCount : 0;
  const totalOrders = bookings.length;

  // Occupancy rate calculation (based on active yards * 16h/day)
  const currentYardsCount = selectedVendor ? yards.length || totalYards : totalYards;
  const totalAvailableHours = Math.max(currentYardsCount * 16, 16);
  const occupancyRate = Math.min((totalBookedHours / totalAvailableHours) * 100, 100);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 4 Synchronized KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Net Revenue */}
        <div className="p-6 rounded-[24px] bg-[#006241] text-white shadow-lg relative overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-100">
              DOANH THU THỰC NHẬN (NET)
            </span>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mb-2 text-white">
              {netRevenue.toLocaleString('vi-VN')}
              <span className="text-sm font-bold text-emerald-200 ml-1">đ</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-100 font-semibold pt-1 border-t border-white/15">
              <span>Gross: {grossRevenue.toLocaleString('vi-VN')}đ</span>
              <span>Hoàn: {refundedAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        {/* 2. Occupancy Rate */}
        <div className="p-6 rounded-[24px] bg-[#0284C7] text-white shadow-lg relative overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-sky-100">
              TỶ LỆ LẤP ĐẦY SÂN
            </span>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Percent className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mb-2 text-white">
              {occupancyRate.toFixed(1)}
              <span className="text-sm font-bold text-sky-200 ml-1">%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-sky-100 font-semibold pt-1 border-t border-white/15">
              <span>Đã thuê {totalBookedHours.toFixed(1)}h</span>
              <span>{totalAvailableHours}h mở cửa</span>
            </div>
          </div>
        </div>

        {/* 3. AOV (Average Order Value) */}
        <div className="p-6 rounded-[24px] bg-[#7C3AED] text-white shadow-lg relative overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-purple-100">
              GIÁ TRỊ ĐƠN TB (AOV)
            </span>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mb-2 text-white">
              {Math.round(aov).toLocaleString('vi-VN')}
              <span className="text-sm font-bold text-purple-200 ml-1">đ</span>
            </div>
            <div className="flex items-center justify-between text-xs text-purple-100 font-semibold pt-1 border-t border-white/15">
              <span>{paidOrdersCount} đơn đã thanh toán</span>
              <span>{totalOrders} tổng đơn</span>
            </div>
          </div>
        </div>

        {/* 4. Yards & Clusters */}
        <div className="p-6 rounded-[24px] bg-[#D97706] text-white shadow-lg relative overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-100">
              CỤM &amp; SÂN CON HOẠT ĐỘNG
            </span>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Grid className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none mb-2 text-white">
              {totalYards} <span className="text-sm font-normal text-amber-100">Sân con</span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-100 font-semibold pt-1 border-t border-white/15">
              <span>{activeVendorsCount} Cụm Sân Active</span>
              <span>{cancelledOrdersCount} đơn hủy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
