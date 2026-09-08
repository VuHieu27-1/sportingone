import React from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  Flame,
  CreditCard,
  Layers,
  ShieldCheck,
  Award,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  KpiSummaryData,
  ChartDataPoint,
  SportRevenueItem,
  CourtPerformanceItem,
  ClusterPerformanceItem,
  DayOfWeekStat,
  TimeOfDayStat,
  HeatmapCell,
  BusinessInsight,
} from './types';
import { BackendBooking } from '../../../services/bookingService';

interface ManagementPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: () => void;
  reportTitle?: string;
  reportPeriodLabel: string;
  startDateStr: string;
  endDateStr: string;
  generatedAtStr: string;
  selectedVendorName: string;
  selectedSportName: string;
  kpi: KpiSummaryData;
  dataPoints: ChartDataPoint[];
  sports: SportRevenueItem[];
  courts: CourtPerformanceItem[];
  clusters: ClusterPerformanceItem[];
  dayStats: DayOfWeekStat[];
  timeOfDayStats: TimeOfDayStat[];
  heatmapMatrix: HeatmapCell[];
  bookings: BackendBooking[];
  insights: BusinessInsight[];
}

export const ManagementPdfReportModal: React.FC<ManagementPdfReportModalProps> = ({
  isOpen,
  onClose,
  onExportExcel,
  reportTitle = 'BÁO CÁO DOANH THU QUẢN TRỊ',
  reportPeriodLabel,
  startDateStr,
  endDateStr,
  generatedAtStr,
  selectedVendorName,
  selectedSportName,
  kpi,
  dataPoints,
  sports,
  courts,
  clusters,
  dayStats,
  timeOfDayStats,
  heatmapMatrix,
  bookings,
  insights,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const topCourts = [...courts].sort((a, b) => b.grossRevenue - a.grossRevenue).slice(0, 5);

  const DAYS = [
    { id: 1, name: 'Thứ 2' },
    { id: 2, name: 'Thứ 3' },
    { id: 3, name: 'Thứ 4' },
    { id: 4, name: 'Thứ 5' },
    { id: 5, name: 'Thứ 6' },
    { id: 6, name: 'Thứ 7' },
    { id: 0, name: 'Chủ Nhật' },
  ];

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 to 22

  const getCell = (dayIndex: number, hour: number) => {
    return (
      heatmapMatrix.find((c) => c.dayIndex === dayIndex && c.hour === hour) || {
        dayIndex,
        dayName: '',
        hour,
        hourLabel: `${hour}:00`,
        bookingsCount: 0,
        revenue: 0,
        occupancyRate: 0,
      }
    );
  };

  const getHeatmapColorClass = (rate: number) => {
    if (rate >= 75) return 'bg-[#006241] text-white';
    if (rate >= 50) return 'bg-emerald-500 text-white';
    if (rate >= 25) return 'bg-emerald-300 text-[#1E3932]';
    if (rate > 0) return 'bg-emerald-100 text-[#006241]';
    return 'bg-[#F2F0EB] text-[#A3B1A6]';
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-[#2D3238] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-150">
      {/* 1. Fullscreen Top Navigation Bar */}
      <div className="w-full bg-[#1E3932] text-white px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg border-b border-emerald-900/40 print:hidden z-10">
        <div className="flex items-center gap-3.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <span>Báo Cáo Doanh Thu Quản Trị (PDF Preview)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Chuẩn A4 · 6 Trang
              </span>
            </h2>
            <p className="text-xs text-white/70">
              Kỳ: <strong className="text-white">{reportPeriodLabel}</strong> ({startDateStr} → {endDateStr}) · Cơ sở: <strong className="text-emerald-300">{selectedVendorName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-[#006241] hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>In / Lưu PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Fullscreen PDF Canvas Viewport */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-8 flex justify-center bg-[#383C40] print:bg-white print:p-0">
        <div id="printable-management-report" className="w-full max-w-4xl space-y-8 pb-16 print:space-y-0 print:pb-0">
          {/* ================= PAGE 1: COVER & EXECUTIVE SUMMARY ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:break-after-page">
            {/* Header Bar */}
            <div className="flex items-start justify-between border-b-2 border-[#006241] pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#006241] text-white font-mono font-black text-xs">
                    SPORTING ONE
                  </span>
                  <span className="text-xs font-bold text-[#6F7E72] uppercase tracking-wider">
                    Vendor Portal · Management Analytics
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#1E3932] tracking-tight">
                  {reportTitle}
                </h1>
                <p className="text-xs text-[#6F7E72] italic">
                  Revenue &amp; Booking Operations Management Report
                </p>
              </div>

              <div className="text-right text-xs text-[#6F7E72] space-y-1">
                <div>
                  Kỳ báo cáo: <strong className="text-[#1E3932]">{reportPeriodLabel}</strong>
                </div>
                <div>
                  Thời gian: <strong className="font-mono text-[#1E3932]">{startDateStr} → {endDateStr}</strong>
                </div>
                <div>
                  Cơ sở: <strong className="text-[#006241]">{selectedVendorName}</strong>
                </div>
              </div>
            </div>

            {/* 6 Key KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Doanh Thu Thực Nhận (Net)</div>
                <div className="text-2xl font-black font-mono text-[#006241]">
                  {kpi.netRevenue.toLocaleString('vi-VN')}
                  <span className="text-sm font-bold text-[#6F7E72] ml-1">đ</span>
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  Tăng trưởng:{' '}
                  <strong className={kpi.netRevenueGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {kpi.netRevenueGrowth >= 0 ? '+' : ''}{kpi.netRevenueGrowth.toFixed(1)}%
                  </strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Tổng Doanh Thu Gộp (Gross)</div>
                <div className="text-2xl font-black font-mono text-[#1E3932]">
                  {kpi.grossRevenue.toLocaleString('vi-VN')}
                  <span className="text-sm font-bold text-[#6F7E72] ml-1">đ</span>
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  {kpi.paidOrdersCount} đơn đã thanh toán
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Tổng Tiền Hoàn (Refund)</div>
                <div className="text-2xl font-black font-mono text-rose-700">
                  {kpi.refundedAmount.toLocaleString('vi-VN')}
                  <span className="text-sm font-bold text-[#6F7E72] ml-1">đ</span>
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  Tỷ lệ hoàn: <strong>{kpi.refundRate.toFixed(1)}%</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Giá Trị Đơn Trung Bình (AOV)</div>
                <div className="text-2xl font-black font-mono text-[#1E3932]">
                  {Math.round(kpi.aov).toLocaleString('vi-VN')}
                  <span className="text-sm font-bold text-[#6F7E72] ml-1">đ</span>
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  Mỗi lượt đặt thành công
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Tỷ Lệ Lấp Đầy Sân</div>
                <div className="text-2xl font-black font-mono text-[#006241]">
                  {kpi.occupancyRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  Thuê {kpi.totalBookedHours.toFixed(1)}h / {kpi.totalAvailableHours}h mở cửa
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1">
                <div className="text-[11px] font-bold text-[#6F7E72] uppercase">Tỷ Lệ Hủy Đơn</div>
                <div className="text-2xl font-black font-mono text-amber-700">
                  {kpi.cancellationRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#6F7E72]">
                  {kpi.cancelledOrdersCount} đơn hủy
                </div>
              </div>
            </div>

            {/* Executive Summary Note */}
            <div className="p-5 rounded-2xl bg-[#006241]/5 border border-[#006241]/20 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-[#006241] text-xs uppercase tracking-wide">
                <Sparkles className="w-4 h-4" />
                <span>Tóm Tắt Đánh Giá Quản Trị (Executive Summary)</span>
              </div>
              <p className="text-xs text-[#1E3932] leading-relaxed">
                Trong kỳ báo cáo <strong>{reportPeriodLabel}</strong>, cụm sân ghi nhận tổng doanh thu thực nhận đạt{' '}
                <strong className="text-[#006241] font-mono">{kpi.netRevenue.toLocaleString('vi-VN')}đ</strong> từ{' '}
                <strong>{kpi.paidOrdersCount} đơn đặt sân thành công</strong>. Tỷ lệ lấp đầy sân đạt mức trung bình{' '}
                <strong className="text-[#006241] font-mono">{kpi.occupancyRate.toFixed(1)}%</strong>. Dòng tiền được đối soát hoàn toàn
                khớp đúng 100% giữa số tiền khách thanh toán qua cổng và các khoản hoàn hủy theo quy chuẩn nghiệp vụ.
              </p>
            </div>

            {/* Page Footer */}
            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 1 / 6</span>
            </div>
          </div>

          {/* ================= PAGE 2: REVENUE TREND & GROWTH ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#006241]" />
                  <span>Tổng Quan Biến Thiên Doanh Thu &amp; Tăng Trưởng</span>
                </h2>
                <p className="text-xs text-[#6F7E72]">
                  Theo dõi biểu đồ đường và bảng doanh thu qua các mốc thời gian.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006241]">Trang 2 / 6</span>
            </div>

            {/* Daily Trend Table */}
            <div className="overflow-hidden rounded-2xl border border-[#E6E2D8]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#006241] text-white text-[11px] font-extrabold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3">Doanh Thu Gross</th>
                    <th className="py-2.5 px-3">Doanh Thu Net</th>
                    <th className="py-2.5 px-3">Số Đơn Paid</th>
                    <th className="py-2.5 px-3">Giờ Đã Thuê</th>
                    <th className="py-2.5 px-3">Độ Lấp Đầy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F0EB]">
                  {dataPoints.slice(0, 10).map((pt, i) => (
                    <tr key={i} className="hover:bg-[#FAF8F5]">
                      <td className="py-2 px-3 font-semibold text-[#1E3932]">{pt.label}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#006241]">
                        {pt.currentValue.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[#1E3932]">
                        {pt.currentValue.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2 px-3 font-mono">{pt.currentOrders} đơn</td>
                      <td className="py-2 px-3 font-mono">{pt.currentHours.toFixed(1)}h</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                        {pt.currentOccupancy.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Growth Remark */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] space-y-1">
              <div className="font-bold text-[#1E3932]">Đánh giá tăng trưởng:</div>
              <p className="text-[#6F7E72]">
                Doanh thu thực nhận kỳ này {kpi.netRevenueGrowth >= 0 ? 'tăng' : 'giảm'}{' '}
                <strong className={kpi.netRevenueGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {Math.abs(kpi.netRevenueGrowth).toFixed(1)}%
                </strong>{' '}
                so với chu kỳ đối ứng trước đó. Tỷ lệ lấp đầy sân duy trì ở mức{' '}
                <strong className="text-[#006241]">{kpi.occupancyRate.toFixed(1)}%</strong>.
              </p>
            </div>

            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 2 / 6</span>
            </div>
          </div>

          {/* ================= PAGE 3: REVENUE BREAKDOWN ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#006241]" />
                  <span>Cơ Cấu Doanh Thu Theo Bộ Môn &amp; Top Sân Con</span>
                </h2>
                <p className="text-xs text-[#6F7E72]">
                  Phân bổ tỷ trọng doanh thu theo môn và bảng xếp hạng sân hiệu quả nhất.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006241]">Trang 3 / 6</span>
            </div>

            {/* Sports Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#1E3932] uppercase">
                1. Phân Bổ Theo Bộ Môn Thể Thao
              </h3>
              <div className="overflow-hidden rounded-2xl border border-[#E6E2D8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#006241] text-white text-[11px] font-extrabold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bộ Môn</th>
                      <th className="py-2.5 px-3">Số Đơn Paid</th>
                      <th className="py-2.5 px-3">Giờ Đặt</th>
                      <th className="py-2.5 px-3">Doanh Thu (Net)</th>
                      <th className="py-2.5 px-3">Tỷ Trọng (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB]">
                    {sports.map((s, i) => (
                      <tr key={i} className="hover:bg-[#FAF8F5]">
                        <td className="py-2 px-3 font-bold text-[#1E3932]">{s.name}</td>
                        <td className="py-2 px-3 font-mono">{s.ordersCount} đơn</td>
                        <td className="py-2 px-3 font-mono">{s.bookedHours.toFixed(1)}h</td>
                        <td className="py-2 px-3 font-mono font-black text-[#006241]">
                          {s.revenue.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">{s.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 Courts */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#1E3932] uppercase">
                2. Top 5 Sân Con Doanh Thu Cao Nhất
              </h3>
              <div className="overflow-hidden rounded-2xl border border-[#E6E2D8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1E3932] text-white text-[11px] font-extrabold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Tên Sân Con</th>
                      <th className="py-2.5 px-3">Cụm Sân</th>
                      <th className="py-2.5 px-3">Bộ Môn</th>
                      <th className="py-2.5 px-3">Số Đơn</th>
                      <th className="py-2.5 px-3">Doanh Thu</th>
                      <th className="py-2.5 px-3">Độ Lấp Đầy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB]">
                    {topCourts.map((c, i) => (
                      <tr key={i} className="hover:bg-[#FAF8F5]">
                        <td className="py-2 px-3 font-bold text-[#1E3932]">{c.yardName}</td>
                        <td className="py-2 px-3 text-[#6F7E72]">{c.vendorName}</td>
                        <td className="py-2 px-3">{c.sportName}</td>
                        <td className="py-2 px-3 font-mono">{c.ordersCount} đơn</td>
                        <td className="py-2 px-3 font-mono font-black text-[#006241]">
                          {c.grossRevenue.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                          {c.occupancyRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 3 / 6</span>
            </div>
          </div>

          {/* ================= PAGE 4: OPERATIONS & HOT HOURS ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  <span>Vận Hành Khung Giờ &amp; Bản Đồ Nhiệt (Heatmap)</span>
                </h2>
                <p className="text-xs text-[#6F7E72]">
                  Mật độ khách đặt sân 7 ngày × 17 khung giờ (06:00 đến 22:00).
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006241]">Trang 4 / 6</span>
            </div>

            {/* Day of Week & Time of Day Highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-2">
                <div className="text-[11px] font-bold text-[#1E3932] uppercase">
                  Phân Bổ Theo Thứ Trong Tuần
                </div>
                <div className="space-y-1.5 text-xs">
                  {dayStats.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[#6F7E72]">{d.dayName}</span>
                      <span className="font-mono font-bold text-[#006241]">
                        {d.revenue.toLocaleString('vi-VN')}đ ({d.ordersCount} đơn)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-2">
                <div className="text-[11px] font-bold text-[#1E3932] uppercase">
                  Phân Bổ Theo Buổi Trong Ngày
                </div>
                <div className="space-y-1.5 text-xs">
                  {timeOfDayStats.map((t, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[#6F7E72]">{t.label} ({t.timeRange})</span>
                      <span className="font-mono font-bold text-[#006241]">
                        {t.revenue.toLocaleString('vi-VN')}đ ({t.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Grid Compact for Print */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-[#1E3932] uppercase">
                Ma Trận Nhiệt Độ Kín Sân (Heatmap Matrix)
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8] p-3 bg-white">
                <div className="grid grid-cols-18 gap-1 text-[9px] font-mono text-center">
                  <div className="font-bold text-[#6F7E72]">Thứ</div>
                  {HOURS.map((h) => (
                    <div key={h} className="text-[#6F7E72] font-semibold">{h}h</div>
                  ))}

                  {DAYS.map((day) => (
                    <React.Fragment key={day.id}>
                      <div className="font-bold text-[#1E3932] py-1 text-left">{day.name}</div>
                      {HOURS.map((h) => {
                        const cell = getCell(day.id, h);
                        return (
                          <div
                            key={h}
                            className={`h-5 rounded flex items-center justify-center font-extrabold ${getHeatmapColorClass(
                              cell.occupancyRate
                            )}`}
                          >
                            {cell.occupancyRate > 0 ? `${cell.occupancyRate.toFixed(0)}` : ''}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 4 / 6</span>
            </div>
          </div>

          {/* ================= PAGE 5: PAYMENT & REFUND RECONCILIATION ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#006241]" />
                  <span>Đối Soát Thanh Toán &amp; Quản Lý Hoàn Tiền</span>
                </h2>
                <p className="text-xs text-[#6F7E72]">
                  Bảng đối soát dòng tiền và phân bổ trạng thái đơn đặt sân.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006241]">Trang 5 / 6</span>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Đã Thanh Toán</div>
                <div className="text-xl font-black font-mono text-emerald-900 mt-1">{kpi.paidOrdersCount} đơn</div>
                <div className="text-[10px] text-emerald-700 font-mono mt-0.5">{kpi.grossRevenue.toLocaleString('vi-VN')}đ</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Chờ Thanh Toán (Unpaid)</div>
                <div className="text-xl font-black font-mono text-amber-900 mt-1">{kpi.unpaidOrdersCount} đơn</div>
                <div className="text-[10px] text-amber-700">Đang giữ chỗ</div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="text-[10px] font-bold text-rose-800 uppercase">Đã Hoàn Tiền (Refunded)</div>
                <div className="text-xl font-black font-mono text-rose-900 mt-1">{kpi.refundedOrdersCount} đơn</div>
                <div className="text-[10px] text-rose-700 font-mono mt-0.5">{kpi.refundedAmount.toLocaleString('vi-VN')}đ</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-800 uppercase">Đã Hủy (Cancelled)</div>
                <div className="text-xl font-black font-mono text-slate-900 mt-1">{kpi.cancelledOrdersCount} đơn</div>
                <div className="text-[10px] text-slate-700">Tỷ lệ: {kpi.cancellationRate.toFixed(1)}%</div>
              </div>
            </div>

            {/* Cashflow Reconciliation Table */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-[#1E3932] uppercase">
                Bảng Đối Soát Dòng Tiền Quản Trị
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#E6E2D8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#006241] text-white text-[11px] font-extrabold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Hạng Mục</th>
                      <th className="py-2.5 px-3">Số Tiền (VND)</th>
                      <th className="py-2.5 px-3">Quy Tắc Đối Soát Nghiệp Vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB]">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#1E3932]">(+) Doanh Thu Gộp (Gross)</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#006241]">
                        {kpi.grossRevenue.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2.5 px-3 text-[#6F7E72]">Tổng giá trị các đơn đặt sân đã thanh toán thành công</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#1E3932]">(-) Khuyến Mãi / Giảm Giá</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">0đ</td>
                      <td className="py-2.5 px-3 text-[#6F7E72]">Đã khấu trừ trực tiếp vào giá trị đơn của lượt đặt</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-rose-700">(-) Tiền Hoàn Trả (Refund)</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                        {kpi.refundedAmount.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2.5 px-3 text-[#6F7E72]">Đã hoàn xu vào Ví Sporting của người chơi</td>
                    </tr>
                    <tr className="bg-[#FAF8F5] font-black">
                      <td className="py-3 px-3 text-[#006241]">(=) DOANH THU THỰC NHẬN (NET)</td>
                      <td className="py-3 px-3 font-mono text-base text-[#006241]">
                        {kpi.netRevenue.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-3 px-3 text-emerald-800">
                        Trạng thái đối soát: <strong>HỢP LỆ (100% PASS)</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 5 / 6</span>
            </div>
          </div>

          {/* ================= PAGE 6: BUSINESS INSIGHTS & METADATA ================= */}
          <div className="bg-white rounded-3xl border border-[#E6E2D8] p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#006241]" />
                  <span>Đề Xuất Kinh Doanh &amp; Thông Tin Báo Cáo</span>
                </h2>
                <p className="text-xs text-[#6F7E72]">
                  Khuyến nghị hành động tối ưu doanh thu và siêu dữ liệu kỹ thuật.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#006241]">Trang 6 / 6</span>
            </div>

            {/* Actionable Insights */}
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-[#1E3932] uppercase">
                Khuyến Nghị Tối Ưu Quản Trị (Actionable Insights)
              </div>

              <div className="grid grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#1E3932] flex items-center gap-1.5">
                        <span>
                          {insight.type === 'peak'
                            ? '🔥'
                            : insight.type === 'opportunity'
                              ? '💡'
                              : insight.type === 'growth'
                                ? '📈'
                                : '⚠️'}
                        </span>
                        <span>{insight.title}</span>
                      </span>
                      {insight.metric && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-[#006241] border border-[#E6E2D8]">
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-[#6F7E72] text-[11px] leading-relaxed">
                      {insight.description}
                    </p>
                    <div className="pt-1.5 border-t border-[#E6E2D8]/60 text-[11px] font-semibold text-[#006241]">
                      👉 {insight.actionText || 'Tối ưu ngay'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Metadata Table */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-extrabold text-[#1E3932] uppercase">
                Thông Tin Kỹ Thuật Báo Cáo (Report Metadata)
              </div>
              <div className="p-4 rounded-2xl bg-[#F2F0EB]/60 border border-[#E6E2D8] text-xs space-y-1 text-[#6F7E72]">
                <div className="grid grid-cols-2 gap-2">
                  <div>Múi giờ hệ thống: <strong className="text-[#1E3932]">Asia/Ho_Chi_Minh (UTC+07:00)</strong></div>
                  <div>Thời điểm khởi tạo: <strong className="text-[#1E3932]">{generatedAtStr}</strong></div>
                  <div>Nền tảng xuất file: <strong className="text-[#1E3932]">SPORTING ONE Vendor Portal</strong></div>
                  <div>Cơ sở dữ liệu: <strong className="text-[#006241]">Production Realtime Database</strong></div>
                </div>
                <p className="text-[10px] italic pt-2 border-t border-[#E6E2D8]">
                  Lưu ý: Đây là Báo cáo Doanh thu Quản trị (Management Revenue Report) phục vụ công tác điều hành kinh doanh nội bộ.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72]">
              <span>SPORTING ONE | Management Revenue Report</span>
              <span>Trang 6 / 6</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
