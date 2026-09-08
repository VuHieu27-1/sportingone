import React from 'react';
import {
  DollarSign,
  Wallet,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Activity,
  XCircle,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import { KpiSummaryData } from './types';

interface AnalyticsKpiCardsProps {
  kpi: KpiSummaryData;
  timeRangeLabel: string;
  onKpiClick?: (cardKey: string) => void;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({
  kpi,
  timeRangeLabel,
  onKpiClick,
}) => {
  const renderTrendBadge = (rate: number, inverse: boolean = false) => {
    const isPositive = rate > 0;
    const isZero = rate === 0;

    // For cancellation rate, positive rate is bad (red), negative is good (green)
    let isGood = inverse ? !isPositive : isPositive;
    if (isZero) isGood = true;

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${isZero
            ? 'bg-slate-100 text-slate-600'
            : isGood
              ? 'bg-emerald-500/10 text-[#006241]'
              : 'bg-rose-500/10 text-rose-600'
          }`}
      >
        {isZero ? (
          <span>→ 0.0%</span>
        ) : isPositive ? (
          <>
            <ArrowUpRight className="w-3 h-3" />
            <span>+{rate.toFixed(1)}%</span>
          </>
        ) : (
          <>
            <ArrowDownRight className="w-3 h-3" />
            <span>{rate.toFixed(1)}%</span>
          </>
        )}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Card 1: Gross Revenue */}
      <div
        onClick={() => onKpiClick && onKpiClick('gross_revenue')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Tổng Doanh Thu
          </span>
          <span className="w-8 h-8 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-[#1E3932] tracking-tight font-mono">
            {kpi.grossRevenue.toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-[#6F7E72] ml-0.5">đ</span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            Doanh thu từ đơn đã xác nhận
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          {renderTrendBadge(kpi.grossRevenueGrowth)}
          <span className="text-[11px] text-[#6F7E72]">so với kỳ trước</span>
        </div>
      </div>

      {/* Card 2: Net Revenue */}
      <div
        onClick={() => onKpiClick && onKpiClick('net_revenue')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Doanh Thu Thực Nhận
          </span>
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-[#006241] tracking-tight font-mono">
            {kpi.netRevenue.toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-[#6F7E72] ml-0.5">đ</span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            {kpi.refundedAmount > 0 ? (
              <span className="text-amber-700 font-semibold">
                Đã trừ {kpi.refundedAmount.toLocaleString('vi-VN')}đ hoàn tiền
              </span>
            ) : (
              <span>Thực nhận 100% (Không hoàn tiền)</span>
            )}
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          {renderTrendBadge(kpi.netRevenueGrowth)}
          <span className="text-[11px] text-[#6F7E72]">so với kỳ trước</span>
        </div>
      </div>

      {/* Card 3: Total Orders */}
      <div
        onClick={() => onKpiClick && onKpiClick('orders')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Tổng Đơn Đặt Sân
          </span>
          <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-[#1E3932] tracking-tight font-mono">
            {kpi.paidOrdersCount}
            <span className="text-sm font-bold text-[#6F7E72] ml-1 font-sans">
              / {kpi.totalOrders} lượt
            </span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            {kpi.paidOrdersCount} đơn đã thanh toán thành công
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          {renderTrendBadge(kpi.totalOrdersGrowth)}
          <span className="text-[11px] text-[#6F7E72]">so với kỳ trước</span>
        </div>
      </div>

      {/* Card 4: Average Order Value (AOV) */}
      <div
        onClick={() => onKpiClick && onKpiClick('aov')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Giá Trị Đơn TB (AOV)
          </span>
          <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Percent className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-[#1E3932] tracking-tight font-mono">
            {Math.round(kpi.aov).toLocaleString('vi-VN')}
            <span className="text-sm font-bold text-[#6F7E72] ml-0.5">đ</span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            Doanh thu / Đơn đã thanh toán
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          {renderTrendBadge(kpi.aovGrowth)}
          <span className="text-[11px] text-[#6F7E72]">so với kỳ trước</span>
        </div>
      </div>

      {/* Card 5: Court Utilization / Occupancy Rate */}
      <div
        onClick={() => onKpiClick && onKpiClick('occupancy')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Tỷ Lệ Lấp Đầy Sân
          </span>
          <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-[#1E3932] tracking-tight font-mono">
            {kpi.occupancyRate.toFixed(1)}
            <span className="text-sm font-bold text-[#6F7E72] ml-0.5">%</span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            Đã thuê {kpi.totalBookedHours.toFixed(1)}h / {kpi.totalAvailableHours}h mở cửa ({kpi.totalAvailableHours / 16 >= 1 ? `${Math.round(kpi.totalAvailableHours / 16)} sân × 16h` : `${kpi.totalAvailableHours}h`})
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          {renderTrendBadge(kpi.occupancyRateGrowth)}
          <span className="text-[11px] text-[#6F7E72]">so với kỳ trước</span>
        </div>
      </div>

      {/* Card 6: Cancellation Rate */}
      <div
        onClick={() => onKpiClick && onKpiClick('cancellation')}
        className="p-5 rounded-[22px] bg-white border border-[#E6E2D8] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
            Tỷ Lệ Hủy / Hoàn
          </span>
          <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <XCircle className="w-4 h-4" />
          </span>
        </div>
        <div className="space-y-1 my-1">
          <div className="text-2xl xl:text-2xl font-black text-rose-600 tracking-tight font-mono">
            {(kpi.cancellationRate + kpi.refundRate).toFixed(1)}
            <span className="text-sm font-bold text-[#6F7E72] ml-0.5">%</span>
          </div>
          <div className="text-[11px] text-[#6F7E72] font-medium">
            {kpi.cancelledOrdersCount + kpi.refundOrdersCount + kpi.refundedOrdersCount} đơn hủy hoặc hoàn
          </div>
        </div>
        <div className="pt-3 border-t border-[#F2F0EB] flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{kpi.paymentSuccessRate.toFixed(0)}% Thành công</span>
          </span>
        </div>
      </div>
    </div>
  );
};
