import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronDown,
  Download,
  Printer,
  BarChart3,
  RotateCcw,
  ArrowRightLeft,
  Building2,
  Filter,
  Check,
  CalendarDays,
  X,
  Clock,
} from 'lucide-react';
import { TimeRangePreset } from './types';
import { BackendVendor } from '../../../services/vendorService';

interface AnalyticsHeaderProps {
  timeRange: TimeRangePreset;
  onTimeRangeChange: (preset: TimeRangePreset) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  selectedVendor: BackendVendor | null;
  activeVendors: BackendVendor[];
  onVendorChange: (vendor: BackendVendor | null) => void;
  selectedSportId: string;
  sportOptions: Array<{ id: string; name: string }>;
  onSportChange: (sportId: string) => void;
  comparePrevious: boolean;
  onToggleCompare: () => void;
  onExportCSV: () => void;
  onPrintReport: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeRange,
  onTimeRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  selectedVendor,
  activeVendors,
  onVendorChange,
  selectedSportId,
  sportOptions,
  onSportChange,
  comparePrevious,
  onToggleCompare,
  onExportCSV,
  onPrintReport,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const exportRef = useRef<HTMLDivElement>(null);
  const customDateBtnRef = useRef<HTMLButtonElement>(null);

  const updatePopoverPos = useCallback(() => {
    if (!customDateBtnRef.current) return;
    const rect = customDateBtnRef.current.getBoundingClientRect();
    const popoverWidth = 420;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }
    setPopoverPos({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  useEffect(() => {
    setTempStart(customStartDate);
    setTempEnd(customEndDate);
  }, [customStartDate, customEndDate]);

  useEffect(() => {
    if (!isCustomDateOpen) return;
    updatePopoverPos();
    const handleResize = () => updatePopoverPos();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isCustomDateOpen, updatePopoverPos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PRESETS: Array<{ id: TimeRangePreset; label: string }> = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'yesterday', label: 'Hôm qua' },
    { id: '7days', label: '7 ngày qua' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
    { id: 'since_opened', label: 'Từ lúc mở cửa' },
    { id: 'custom', label: 'Tùy chỉnh' },
  ];

  // Detect active quick helper preset in Custom Modal
  const is7DaysActive = useMemo(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return tempStart === start && tempEnd === end;
  }, [tempStart, tempEnd]);

  const is30DaysActive = useMemo(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return tempStart === start && tempEnd === end;
  }, [tempStart, tempEnd]);

  const handleApplyCustomDate = () => {
    if (tempStart && tempEnd) {
      if (new Date(tempStart) > new Date(tempEnd)) {
        onCustomDateChange(tempEnd, tempStart);
      } else {
        onCustomDateChange(tempStart, tempEnd);
      }
      onTimeRangeChange('custom');
      setIsCustomDateOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-5 lg:p-6 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      {/* Top row: Title + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F2F0EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#006241]/10 text-[#006241]">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#1E3932] tracking-tight">
              Báo Cáo Doanh Thu & Phân Tích Kinh Doanh
            </h1>
          </div>
          <p className="text-xs lg:text-sm text-[#6F7E72] font-medium mt-1">
            Theo dõi doanh thu, hiệu suất sân và hành vi đặt sân của toàn bộ hệ thống.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Compare Toggle */}
          <button
            type="button"
            onClick={onToggleCompare}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
              comparePrevious
                ? 'bg-[#006241] text-white border-[#006241] shadow-sm shadow-[#006241]/20'
                : 'bg-[#F2F0EB] text-[#1E3932] border-[#E6E2D8] hover:bg-[#E6E2D8]'
            }`}
            title="So sánh số liệu với chu kỳ liền trước"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>So sánh kỳ trước</span>
            {comparePrevious && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 ml-0.5 animate-pulse" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#006241] hover:bg-[#004f34] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#006241]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E6E2D8] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    onExportCSV();
                    setIsExportOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#1E3932] hover:bg-[#F2F0EB] active:bg-[#E6E2D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#006241]" />
                  <span>Xuất file Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPrintReport();
                    setIsExportOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#1E3932] hover:bg-[#F2F0EB] active:bg-[#E6E2D8] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#006241]" />
                  <span>In Báo Cáo (PDF)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Row: Presets + Custom Date + Cụm sân + Sport */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => {
            const isActive = timeRange === preset.id;
            if (preset.id === 'custom') {
              return (
                <button
                  key={preset.id}
                  ref={customDateBtnRef}
                  type="button"
                  onClick={() => {
                    updatePopoverPos();
                    setIsCustomDateOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? 'bg-[#1E3932] text-white border-[#1E3932] shadow-sm'
                      : 'bg-[#F2F0EB]/80 text-[#6F7E72] border-[#E6E2D8] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>
                    {isActive && customStartDate && customEndDate
                      ? `Tùy chỉnh: ${customStartDate} → ${customEndDate}`
                      : 'Tùy chỉnh'}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCustomDateOpen ? 'rotate-180' : ''}`} />
                </button>
              );
            }

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onTimeRangeChange(preset.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3932] text-white shadow-sm'
                    : 'bg-[#F2F0EB]/80 text-[#6F7E72] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Picker Popover via React Portal (Never gets clipped by overflow) */}
        {isCustomDateOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-2xs"
                onClick={() => setIsCustomDateOpen(false)}
              />
              <div
                style={{
                  top: `${popoverPos.top}px`,
                  left: `${popoverPos.left}px`,
                }}
                className="fixed z-[99999] p-5 bg-white border border-[#E6E2D8] rounded-3xl shadow-2xl w-[420px] max-w-[94vw] space-y-4 animate-in fade-in zoom-in-95 duration-150 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]"
              >
                <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-3">
                  <div className="text-sm font-extrabold text-[#1E3932] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#006241]" />
                    <span>Chọn Khoảng Ngày Tùy Chỉnh</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomDateOpen(false)}
                    className="p-1.5 rounded-full text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB] active:scale-90 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Helper Presets with Live Active State */}
                <div>
                  <label className="block text-[#6F7E72] font-bold text-[10px] uppercase tracking-wider mb-2">
                    Chọn nhanh khoảng ngày:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
                        setTempStart(start.toISOString().split('T')[0]);
                        setTempEnd(end.toISOString().split('T')[0]);
                      }}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap select-none ${
                        is7DaysActive
                          ? 'bg-[#006241] text-white border-[#006241] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB] hover:border-[#006241]/40'
                      }`}
                    >
                      {is7DaysActive && <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3] shrink-0" />}
                      <span className="whitespace-nowrap">7 ngày gần nhất</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
                        setTempStart(start.toISOString().split('T')[0]);
                        setTempEnd(end.toISOString().split('T')[0]);
                      }}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap select-none ${
                        is30DaysActive
                          ? 'bg-[#006241] text-white border-[#006241] shadow-xs'
                          : 'bg-[#FAF8F5] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB] hover:border-[#006241]/40'
                      }`}
                    >
                      {is30DaysActive && <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3] shrink-0" />}
                      <span className="whitespace-nowrap">30 ngày gần nhất</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[#6F7E72] font-semibold mb-1 text-[11px]">Từ ngày:</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E2D8] bg-[#FBF8F0] text-[#1E3932] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#006241]/30 focus:border-[#006241] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6F7E72] font-semibold mb-1 text-[11px]">Đến ngày:</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E2D8] bg-[#FBF8F0] text-[#1E3932] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#006241]/30 focus:border-[#006241] transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F2F0EB]">
                  <button
                    type="button"
                    onClick={() => setIsCustomDateOpen(false)}
                    className="px-4 py-2 rounded-full text-xs text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB] active:scale-95 font-bold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomDate}
                    className="px-5 py-2 rounded-full bg-[#006241] hover:bg-[#004f34] active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Áp dụng</span>
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}

        {/* Secondary filters: Sport + Cluster */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Sport Filter */}
          <div className="flex items-center gap-1.5 bg-[#F2F0EB] border border-[#E6E2D8] rounded-full px-3 py-1.5 text-xs font-semibold text-[#1E3932]">
            <Filter className="w-3.5 h-3.5 text-[#006241]" />
            <span className="text-[#6F7E72]">Môn:</span>
            <select
              value={selectedSportId}
              onChange={(e) => onSportChange(e.target.value)}
              aria-label="Lọc theo bộ môn thể thao"
              className="bg-transparent border-none text-[#1E3932] font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Tất cả bộ môn</option>
              {sportOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cluster Filter (if activeVendors > 1) */}
          {activeVendors.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#F2F0EB] border border-[#E6E2D8] rounded-full px-3 py-1.5 text-xs font-semibold text-[#1E3932]">
              <Building2 className="w-3.5 h-3.5 text-[#006241]" />
              <span className="text-[#6F7E72]">Cụm:</span>
              <select
                value={selectedVendor ? selectedVendor.id : 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    onVendorChange(null);
                  } else {
                    const found = activeVendors.find((v) => String(v.id) === val);
                    onVendorChange(found || null);
                  }
                }}
                aria-label="Lọc theo cụm sân thể thao"
                className="bg-transparent border-none text-[#1E3932] font-bold focus:outline-none cursor-pointer pr-1 max-w-[140px] truncate"
              >
                <option value="all">Tất cả cụm sân</option>
                {activeVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendorName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
