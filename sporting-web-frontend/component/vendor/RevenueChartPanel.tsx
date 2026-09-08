import React from 'react';
import { TrendingUp, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BackendVendor } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';

interface RevenueChartPanelProps {
  selectedVendor: BackendVendor | null;
  bookings: BackendBooking[];
  onViewAnalytics?: () => void;
}

export const RevenueChartPanel: React.FC<RevenueChartPanelProps> = ({ selectedVendor, bookings, onViewAnalytics }) => {
  const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const monthlyRevenues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const sportTotals: Record<string, number> = {};

  bookings.forEach((b) => {
    const isPaid = String(b.status || '').toLowerCase() === 'paid';
    const bVendorId = b.yard?.vendor?.id ? Number(b.yard.vendor.id) : null;

    const matchesVendor = !selectedVendor || (bVendorId !== null && Number(selectedVendor.id) === bVendorId);

    const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
    const effectiveDate = b.startDate
      ? new Date(b.startDate)
      : b.createdAt
      ? new Date(b.createdAt)
      : new Date(b.startTime);

    if (isPaid && matchesVendor && !isNaN(effectiveDate.getTime())) {
      const monthIdx = effectiveDate.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        let amount = Number(b.priced || 0);
        if (!isMonthly && (!amount || isNaN(amount))) {
          const start = new Date(b.startTime).getTime();
          const end = new Date(b.endTime).getTime();
          const hours = (end - start) / (1000 * 60 * 60);
          const calcHours = hours > 0 ? hours : 1;
          amount = Math.round(calcHours * Number(b.yard?.price || 0));
        }

        monthlyRevenues[monthIdx] += amount;

        const sName = b.yard?.sportType?.sportName || 'Bóng đá';
        sportTotals[sName] = (sportTotals[sName] || 0) + amount;
      }
    }
  });

  const chartTotalRevenue = monthlyRevenues.reduce((acc, curr) => acc + curr, 0);
  const hasRealData = chartTotalRevenue > 0;
  const maxVal = Math.max(...monthlyRevenues, 100000);

  const width = 600;
  const height = 180;
  const paddingX = 45;
  const paddingY = 25;

  const points = monthlyRevenues.map((val, idx) => {
    const x = paddingX + (idx / (MONTHS.length - 1)) * (width - 2 * paddingX);
    const y = hasRealData
      ? height - paddingY - (val / maxVal) * (height - 2 * paddingY)
      : height - paddingY;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, '');

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const currentMonthIdx = new Date().getMonth();
  const currentMonthRev = monthlyRevenues[currentMonthIdx] || 0;
  const prevMonthRev = monthlyRevenues[currentMonthIdx - 1] || 0;

  let growthText = '0.0% Tăng Trưởng';
  if (prevMonthRev > 0) {
    const rate = (((currentMonthRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1);
    growthText = `${Number(rate) >= 0 ? '+' : ''}${rate}% Tăng Trưởng`;
  } else if (currentMonthRev > 0) {
    growthText = '+100% Tăng Trưởng';
  }

  const activeSports = Object.keys(sportTotals);

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-4 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F0EB]">
        <div>
          <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#006241]" />
            <span>
              Biểu Đồ Doanh Thu: {selectedVendor ? selectedVendor.vendorName : 'Tất Cả Cụm Sân'}
            </span>
          </h3>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Tổng doanh thu đã xác nhận:{' '}
            <strong className="text-[#006241] font-mono font-extrabold">
              {chartTotalRevenue.toLocaleString('vi-VN')}đ
            </strong>
            {!hasRealData && (
              <span className="text-[#6F7E72] font-normal ml-1">
                (Cụm sân này chưa có lượt đặt sân paid)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          {hasRealData ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-[#006241] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {growthText}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 flex items-center gap-1 font-mono text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Chưa có đơn paid
            </span>
          )}

          {onViewAnalytics && (
            <button
              type="button"
              onClick={onViewAnalytics}
              className="px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] hover:bg-[#006241] hover:text-white transition-all cursor-pointer text-xs font-extrabold flex items-center gap-1"
            >
              <span>Phân Tích Chi Tiết</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

            <div className="w-full overflow-x-auto relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[220px]">
          <defs>
            <linearGradient id="realRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006241" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#006241" stopOpacity="0.0" />
            </linearGradient>
          </defs>

                    {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * (height - 2 * paddingY);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#E6E2D8"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

                    <path d={fillD} fill="url(#realRevenueGrad)" />

                    <path
            d={pathD}
            fill="none"
            stroke={hasRealData ? '#006241' : '#94A3B8'}
            strokeWidth="3"
            strokeLinecap="round"
          />

                    {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.val > 0 ? '5' : '3'}
                fill={pt.val > 0 ? '#006241' : '#94A3B8'}
                stroke="#FBF8F0"
                strokeWidth="2"
              />
            </g>
          ))}

                    {points.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={height - 4}
              fontSize="9"
              fontWeight="700"
              fill={pt.val > 0 ? '#1E3932' : '#94A3B8'}
              textAnchor="middle"
              fontFamily="JetBrains Mono"
            >
              T{idx + 1}
            </text>
          ))}
        </svg>

        {!hasRealData && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <div className="px-4 py-2 rounded-2xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs text-[#1E3932] font-semibold flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-[#006241]" />
              <span>Cụm sân này chưa ghi nhận lượt đặt sân đã thanh toán (status: paid).</span>
            </div>
          </div>
        )}
      </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-[#F2F0EB] text-xs font-bold text-[#1E3932]">
        {activeSports.length > 0 ? (
          activeSports.map((sName, idx) => {
            const colors = ['#006241', '#0284C7', '#7C3AED', '#D97706', '#E11D48'];
            const color = colors[idx % colors.length];
            return (
              <div key={sName} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span>
                  {sName} ({sportTotals[sName].toLocaleString('vi-VN')}đ)
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-[#6F7E72] font-mono">
            ✦ Dữ liệu tính toán 100% từ Database API
          </div>
        )}
      </div>
    </div>
  );
};
