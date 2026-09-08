import React from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ArrowRight,
  Filter,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { ClusterPerformanceItem, KpiSummaryData } from './types';

interface ClusterAndPaymentAnalyticsProps {
  clusters: ClusterPerformanceItem[];
  kpi: KpiSummaryData;
  onSelectCluster?: (vendorId: number) => void;
}

export const ClusterAndPaymentAnalytics: React.FC<ClusterAndPaymentAnalyticsProps> = ({
  clusters,
  kpi,
  onSelectCluster,
}) => {
  const maxClusterRev = Math.max(...clusters.map((c) => c.grossRevenue), 100000);

  const statuses = [
    {
      label: 'Đã Thanh Toán',
      count: kpi.paidOrdersCount,
      color: '#006241',
      bgColor: 'bg-emerald-500/10 text-[#006241]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    {
      label: 'Chờ Thanh Toán',
      count: kpi.unpaidOrdersCount,
      color: '#D97706',
      bgColor: 'bg-amber-500/10 text-amber-800',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    {
      label: 'Đã Hủy',
      count: kpi.cancelledOrdersCount,
      color: '#E11D48',
      bgColor: 'bg-rose-500/10 text-rose-700',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    {
      label: 'Chờ Hoàn Tiền',
      count: kpi.refundOrdersCount,
      color: '#F59E0B',
      bgColor: 'bg-amber-500/10 text-amber-800',
      icon: <RotateCcw className="w-3.5 h-3.5 text-amber-600" />,
    },
    {
      label: 'Đã Hoàn Tiền',
      count: kpi.refundedOrdersCount,
      color: '#64748B',
      bgColor: 'bg-slate-500/10 text-slate-700',
      icon: <RotateCcw className="w-3.5 h-3.5 text-slate-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Box 1: Cluster Comparison (if clusters > 1) */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
          <div>
            <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#006241]" />
              <span>Hiệu Suất Theo Cụm Sân</span>
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
              So sánh quy mô và doanh thu giữa các cơ sở cụm sân đang vận hành.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {clusters.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6F7E72]">
              Chưa có dữ liệu cụm sân.
            </div>
          ) : (
            clusters.map((c) => {
              const pct = maxClusterRev > 0 ? (c.grossRevenue / maxClusterRev) * 100 : 0;
              return (
                <div
                  key={c.vendorId}
                  onClick={() => onSelectCluster && onSelectCluster(c.vendorId)}
                  className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] hover:border-[#006241] transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[#1E3932]">
                        {c.vendorName}
                      </div>
                      <div className="text-[11px] text-[#6F7E72]">
                        {c.yardsCount} sân con · {c.ordersCount} đơn paid
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-[#006241]">
                        {c.grossRevenue.toLocaleString('vi-VN')}đ
                      </div>
                      <div className="text-[11px] text-[#6F7E72]">
                        Công suất:{' '}
                        <strong className="text-[#1E3932] font-mono font-bold">
                          {c.occupancyRate.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#E6E2D8] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#006241] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Box 2: Payment Status & Funnel */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
            <div>
              <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#006241]" />
                <span>Trạng Thái Đơn & Phễu Chuyển Đổi</span>
              </h3>
              <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
                Tỷ lệ hoàn tất thanh toán và kiểm soát rủi ro hủy / hoàn tiền.
              </p>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {statuses.map((st) => (
              <div
                key={st.label}
                className="p-3 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] space-y-1"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6F7E72]">
                  {st.icon}
                  <span className="truncate">{st.label}</span>
                </div>
                <div className="text-lg font-black font-mono text-[#1E3932]">
                  {st.count}
                  <span className="text-[11px] font-sans font-normal text-[#6F7E72] ml-1">
                    đơn
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Funnel Visualization */}
          <div className="mt-4 p-4 rounded-2xl bg-[#F2F0EB]/60 border border-[#E6E2D8] space-y-2">
            <div className="text-xs font-bold text-[#1E3932]">Phễu Đặt Sân (Conversion Funnel)</div>
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex-1 text-center p-2 rounded-xl bg-white shadow-xs">
                <div className="text-[10px] text-[#6F7E72]">1. Tạo đơn</div>
                <div className="font-bold font-mono text-[#1E3932]">{kpi.totalOrders}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-[#6F7E72] shrink-0" />

              <div className="flex-1 text-center p-2 rounded-xl bg-white shadow-xs border border-emerald-200">
                <div className="text-[10px] text-emerald-700 font-semibold">2. Đã thanh toán</div>
                <div className="font-bold font-mono text-[#006241]">{kpi.paidOrdersCount}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-[#6F7E72] shrink-0" />

              <div className="flex-1 text-center p-2 rounded-xl bg-white shadow-xs">
                <div className="text-[10px] text-[#6F7E72]">3. Hoàn tất sân</div>
                <div className="font-bold font-mono text-[#1E3932]">{kpi.paidOrdersCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer rates */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-[#F2F0EB]">
          <span className="text-[#6F7E72]">
            Tỷ lệ thanh toán thành công:{' '}
            <strong className="text-[#006241] font-mono font-bold">
              {kpi.paymentSuccessRate.toFixed(1)}%
            </strong>
          </span>
          <span className="text-[#6F7E72]">
            Tỷ lệ hủy:{' '}
            <strong className="text-rose-600 font-mono font-bold">
              {kpi.cancellationRate.toFixed(1)}%
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
