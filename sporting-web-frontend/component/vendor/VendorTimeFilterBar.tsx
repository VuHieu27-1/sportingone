import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, RotateCcw, Sparkles, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { timeService } from '../../services/timeService';
import { TimeRangePicker, TimeRangePickerValue } from '../common/TimeRangePicker';
import { calculateDuration } from '../../utils/timePickerUtils';

interface VendorTimeFilterBarProps {
  onApplyTimeFilter: (filter: { date: string; startTime: string; endTime: string } | null) => void;
  isFilterActive: boolean;
  filteredAvailableCount: number;
  openTime?: string | null;
  closeTime?: string | null;
}

export const VendorTimeFilterBar: React.FC<VendorTimeFilterBarProps> = ({
  onApplyTimeFilter,
  isFilterActive,
  filteredAvailableCount,
  openTime,
  closeTime,
}) => {
  const vendorOpenTime = React.useMemo(() => {
    if (!openTime) return '06:00';
    const clean = String(openTime).trim();
    const parts = clean.split(':');
    return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : '06:00';
  }, [openTime]);

  const vendorCloseTime = React.useMemo(() => {
    if (!closeTime) return '23:00';
    const clean = String(closeTime).trim();
    const parts = clean.split(':');
    return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : '23:00';
  }, [closeTime]);

  const todayStr = timeService.getTodayDateStr();

  const [date, setDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>(vendorOpenTime);
  const [endTime, setEndTime] = useState<string>(() => {
    const [h, m] = vendorOpenTime.split(':').map(Number);
    const endH = (h + 1) % 24;
    return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  });
  const [isPickerModalOpen, setIsPickerModalOpen] = useState<boolean>(false);

  useEffect(() => {
    timeService.getCurrentTime().then((timeData) => {
      if (timeData && timeData.date) {
        setDate(timeData.date);

        const timeParts = (timeData.time || '08:00:00').split(':');
        const hStr = timeParts[0].padStart(2, '0');
        const mStr = timeParts[1].padStart(2, '0');
        const hours = parseInt(hStr, 10);

        const startFormatted = `${hStr}:${mStr}`;
        const endH = (hours + 1) % 24;
        const endFormatted = `${String(endH).padStart(2, '0')}:${mStr}`;

        setStartTime(startFormatted);
        setEndTime(endFormatted);
      }
    });
  }, []);

  const duration = calculateDuration(startTime, endTime);

  const handleApply = (newDate = date, newStart = startTime, newEnd = endTime) => {
    onApplyTimeFilter({ date: newDate, startTime: newStart, endTime: newEnd });
    setIsPickerModalOpen(false);
  };

  const handleClearFilter = () => {
    onApplyTimeFilter(null);
  };

  const handlePickerConfirm = (val: TimeRangePickerValue) => {
    setDate(val.date);
    setStartTime(val.startTime);
    setEndTime(val.endTime);
    handleApply(val.date, val.startTime, val.endTime);
  };

  useEffect(() => {
    if (!isPickerModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPickerModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickerModalOpen]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FBF8F0] rounded-[28px] border border-[#E6E2D8] p-5 sm:p-6 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E2D8] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1E3932]">
                Bộ Lọc Tìm Sân Trống Theo Khung Giờ
              </h3>
              <p className="text-xs text-[#6F7E72] font-medium">
                Chọn ngày & giờ mong muốn để lọc những sân sẵn sàng nhận lịch
              </p>
            </div>
          </div>

          {isFilterActive && (
            <button
              onClick={handleClearFilter}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer w-fit"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc giờ</span>
            </button>
          )}
        </div>

        {/* Action / Trigger Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E6E2D8]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F2F0EB]">
              <Calendar className="w-4 h-4 text-[#006241]" />
              <span className="font-semibold text-[#6F7E72]">Ngày:</span>
              <strong className="text-[#1E3932] font-mono">{date}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F2F0EB]">
              <Clock className="w-4 h-4 text-[#006241]" />
              <span className="font-semibold text-[#6F7E72]">Khung giờ:</span>
              <strong className="text-[#1E3932] font-mono">
                {startTime} – {endTime}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold font-mono">
                ({duration.text})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPickerModalOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-extrabold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#006241]" />
              <span>Thay Đổi Giờ</span>
            </button>

            <button
              type="button"
              onClick={() => handleApply()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <span>Áp Dụng Lọc</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Results Summary */}
        {isFilterActive && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-[#6F7E72]">
              Kết quả: Tìm thấy{' '}
              <strong className="text-[#006241] font-mono font-bold">
                {filteredAvailableCount}
              </strong>{' '}
              sân trống trong khung giờ{' '}
              <strong className="text-[#1E3932] font-mono">
                {startTime} - {endTime}
              </strong>{' '}
              ngày <strong className="text-[#1E3932] font-mono">{date}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Unified Time Range Picker Modal */}
      {isPickerModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsPickerModalOpen(false)}
            />

            <div className="relative w-full max-w-4xl max-h-[90vh] h-[90vh] sm:h-[86vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
              <TimeRangePicker
                date={date}
                startTime={startTime}
                endTime={endTime}
                openingTime={vendorOpenTime}
                closingTime={vendorCloseTime}
                minuteInterval={1}
                showActions={true}
                title="Bộ Lọc Tìm Sân Trống Theo Khung Giờ"
                confirmText="Áp Dụng Bộ Lọc Sân"
                cancelText="Đóng"
                onConfirm={handlePickerConfirm}
                onCancel={() => setIsPickerModalOpen(false)}
                className="h-full"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
