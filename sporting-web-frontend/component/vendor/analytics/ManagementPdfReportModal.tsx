import React from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
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
import {
  downloadManagementReportPdf,
  generateManagementReportPagesHtml,
  ManagementReportPdfData,
} from '../../common/pdfService';
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
  reportTitle = 'BÁO CÁO DOANH THU & HIỆU SUẤT VẬN HÀNH',
  reportPeriodLabel,
  startDateStr,
  endDateStr,
  generatedAtStr,
  selectedVendorName,
  selectedSportName,
  kpi,
  sports,
  courts,
  dayStats,
  timeOfDayStats,
  insights,
}) => {
  if (!isOpen) return null;

  const reportData: ManagementReportPdfData = {
    reportTitle,
    reportPeriodLabel,
    startDateStr,
    endDateStr,
    generatedAtStr,
    selectedVendorName,
    selectedSportName,
    kpi: {
      netRevenue: kpi.netRevenue,
      netRevenueGrowth: kpi.netRevenueGrowth,
      grossRevenue: kpi.grossRevenue,
      paidOrdersCount: kpi.paidOrdersCount,
      refundedAmount: kpi.refundedAmount,
      refundRate: kpi.refundRate,
      aov: kpi.aov,
      occupancyRate: kpi.occupancyRate,
      cancellationRate: kpi.cancellationRate,
      unpaidOrdersCount: kpi.unpaidOrdersCount,
      refundedOrdersCount: kpi.refundedOrdersCount,
      cancelledOrdersCount: kpi.cancelledOrdersCount,
      totalBookedHours: kpi.totalBookedHours,
      totalAvailableHours: kpi.totalAvailableHours,
    },
    sports: sports.map((s) => ({
      name: s.name,
      ordersCount: s.ordersCount,
      bookedHours: s.bookedHours,
      revenue: s.revenue,
      percentage: s.percentage,
    })),
    courts: courts.map((c) => ({
      yardName: c.yardName,
      vendorName: c.vendorName,
      sportName: c.sportName,
      ordersCount: c.ordersCount,
      grossRevenue: c.grossRevenue,
      occupancyRate: c.occupancyRate,
    })),
    dayStats: dayStats.map((d) => ({
      dayName: d.dayName,
      revenue: d.revenue,
      ordersCount: d.ordersCount,
    })),
    timeOfDayStats: timeOfDayStats.map((t) => ({
      label: t.label,
      timeRange: t.timeRange,
      revenue: t.revenue,
      percentage: t.percentage,
    })),
    insights: insights.map((item) => ({
      title: item.title,
      description: item.description,
      actionText: item.actionText,
    })),
  };

  const { page1Html, page2Html } = generateManagementReportPagesHtml(reportData);

  const handleDownloadPdf = async () => {
    await downloadManagementReportPdf(
      reportData,
      `Bao-cao-danh-gia-${reportPeriodLabel.replace(/[\/\s]/g, '-')}.pdf`
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-[#1F2327] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in duration-150">
      {/* 1. Fullscreen Top Navigation Bar */}
      <div className="w-full bg-[#1E3932] text-white px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg border-b border-emerald-900/40 z-10">
        <div className="flex items-center gap-3.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <span>Báo Cáo Đánh Giá Quản Trị (A4 Preview)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Chuẩn A4 · 2 Trang Toàn Diện
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
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded-xl bg-[#006241] hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md"
            title="Tải báo cáo PDF chuẩn A4 về máy"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Tải Báo Cáo (PDF)</span>
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

      {/* 2. Fullscreen A4 Preview Viewport */}
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-10 flex flex-col items-center bg-[#2B3035] space-y-10">
        {/* Page 1 A4 Sheet */}
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-400/40 bg-white" style={{ width: '794px', minHeight: '1123px' }}>
          <div dangerouslySetInnerHTML={{ __html: page1Html }} />
        </div>

        {/* Page 2 A4 Sheet */}
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-400/40 bg-white" style={{ width: '794px', minHeight: '1123px' }}>
          <div dangerouslySetInnerHTML={{ __html: page2Html }} />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManagementPdfReportModal;
