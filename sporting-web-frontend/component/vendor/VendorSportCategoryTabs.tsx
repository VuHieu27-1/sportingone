import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Sparkles,
  ChevronDown,
  X,
  Layers,
  Star,
  Activity,
  Check,
} from 'lucide-react';
import { timeService } from '../../services/timeService';
import { TimeRangePicker, TimeRangePickerValue } from '../common/TimeRangePicker';

export interface SportCategoryTab {
  id: string;
  name: string;
  count: number;
}

export interface VendorSportCategoryTabsProps {
  categories: SportCategoryTab[];
  selectedCategories: string[];
  onToggleCategory: (catId: string) => void;
  timeFilter: { date: string; startTime: string; endTime: string } | null;
  onApplyTimeFilter: (filter: { date: string; startTime: string; endTime: string } | null) => void;
  availableCount: number;
  activeMainTab: 'yards' | 'reviews';
  onMainTabChange: (tab: 'yards' | 'reviews') => void;
  totalYardsCount: number;
  totalReviewsCount?: number;
  openTime?: string | null;
  closeTime?: string | null;
}

export const VendorSportCategoryTabs: React.FC<VendorSportCategoryTabsProps> = ({
  categories,
  selectedCategories,
  onToggleCategory,
  timeFilter,
  onApplyTimeFilter,
  availableCount,
  activeMainTab = 'yards',
  onMainTabChange,
  totalYardsCount,
  totalReviewsCount = 0,
  openTime,
  closeTime,
}) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  const vendorOpenTime = useMemo(() => {
    if (!openTime) return '06:00';
    const clean = String(openTime).trim();
    const parts = clean.split(':');
    return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : '06:00';
  }, [openTime]);

  const vendorCloseTime = useMemo(() => {
    if (!closeTime) return '23:00';
    const clean = String(closeTime).trim();
    const parts = clean.split(':');
    return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : '23:00';
  }, [closeTime]);

  const todayStr = timeService.getTodayDateStr();

  const [date, setDate] = useState<string>(timeFilter?.date || todayStr);
  const [startTime, setStartTime] = useState<string>(
    timeFilter?.startTime || vendorOpenTime
  );
  const [endTime, setEndTime] = useState<string>(() => {
    if (timeFilter?.endTime) return timeFilter.endTime;
    const [h, m] = vendorOpenTime.split(':').map(Number);
    const endH = (h + 1) % 24;
    return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  });

  const fetchCurrentServerTime = useCallback(async () => {
    try {
      const timeData = await timeService.getCurrentTime();
      if (timeData && timeData.date) {
        setDate(timeData.date);

        const timeParts = (timeData.time || '08:00:00').split(':');
        const hStr = timeParts[0].padStart(2, '0');
        const mStr = timeParts[1].padStart(2, '0');
        const hours = parseInt(hStr, 10);

        let effectiveStart = `${hStr}:${mStr}`;
        if (effectiveStart < vendorOpenTime) {
          effectiveStart = vendorOpenTime;
        }

        const [sH, sM] = effectiveStart.split(':').map(Number);
        const endH = (sH + 1) % 24;
        let endFormatted = `${String(endH).padStart(2, '0')}:${String(sM || 0).padStart(2, '0')}`;
        if (endFormatted > vendorCloseTime) {
          endFormatted = vendorCloseTime;
        }

        setStartTime(effectiveStart);
        setEndTime(endFormatted);
      }
    } catch {}
  }, [vendorOpenTime, vendorCloseTime]);

  const handleOpenFilter = () => {
    if (!timeFilter) {
      fetchCurrentServerTime();
    }
    setIsFilterModalOpen(true);
  };

  const handlePickerConfirm = (val: TimeRangePickerValue) => {
    setDate(val.date);
    setStartTime(val.startTime);
    setEndTime(val.endTime);
    onApplyTimeFilter({
      date: val.date,
      startTime: val.startTime,
      endTime: val.endTime,
    });
    setIsFilterModalOpen(false);
  };

  const handleClearFilter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onApplyTimeFilter(null);
    setIsFilterModalOpen(false);
  };

  useEffect(() => {
    if (!isFilterModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFilterModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterModalOpen]);

  if (!categories || categories.length === 0) return null;

  const isFilterActive = Boolean(timeFilter);

  return (
    <div className="sticky top-16 sm:top-20 z-40 bg-[#FBF8F0] border-b border-[#E6E2D8] py-4 px-4 sm:px-6 lg:px-10 font-['Plus_Jakarta_Sans',sans-serif] shadow-sm">
      <div className="max-w-[1440px] mx-auto space-y-4">
        {/* Top Bar: Title & Filter */}
        <div className="flex items-center justify-between gap-4 relative">
          <div>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block mb-0.5">
              ✦ CHỌN PHÂN LOẠI MÔN THỂ THAO
            </span>
            <h3 className="text-base sm:text-xl font-extrabold text-[#1E3932]">
              Danh Mục Sân Thi Đấu
            </h3>
          </div>

          <div>
            {isFilterActive ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006241] text-white text-xs font-semibold shadow-md animate-in fade-in duration-200">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-mono text-[11px]">
                  {timeFilter!.startTime} - {timeFilter!.endTime}
                </span>
                <span className="hidden sm:inline text-[10px] text-emerald-200 border-l border-white/20 pl-2">
                  {timeFilter!.date}
                </span>
                <button
                  onClick={handleClearFilter}
                  title="Xóa bộ lọc giờ"
                  className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleOpenFilter}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-extrabold bg-white text-[#1E3932] border-[#E6E2D8] hover:border-[#006241] hover:text-[#006241] shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#006241]" />
                <span>⚡ Lọc Sân Trống</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6F7E72]" />
              </button>
            )}
          </div>
        </div>

        {/* Main Navigation Tabs */}
        {onMainTabChange && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => onMainTabChange('yards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                activeMainTab === 'yards'
                  ? 'bg-[#1E3932] text-white shadow-md'
                  : 'bg-white text-[#6F7E72] hover:bg-[#F2F0EB] hover:text-[#1E3932] border border-[#E6E2D8]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Danh Sách Sân</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeMainTab === 'yards'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F2F0EB] text-[#1E3932]'
                }`}
              >
                {totalYardsCount}
              </span>
            </button>

            <button
              onClick={() => onMainTabChange('reviews')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                activeMainTab === 'reviews'
                  ? 'bg-[#1E3932] text-white shadow-md'
                  : 'bg-white text-[#6F7E72] hover:bg-[#F2F0EB] hover:text-[#1E3932] border border-[#E6E2D8]'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500" />
              <span>Đánh Giá Khách Hàng</span>
              {totalReviewsCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeMainTab === 'reviews'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F2F0EB] text-[#1E3932]'
                  }`}
                >
                  {totalReviewsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Sport Categories Filter Pill Strip */}
        {activeMainTab === 'yards' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#006241] text-white border-[#006241] shadow-md scale-102'
                      : 'bg-white text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB] hover:border-[#006241]/30'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F2F0EB] text-[#6F7E72]'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified Time Range Picker Modal */}
      {isFilterModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsFilterModalOpen(false)}
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
                onCancel={() => setIsFilterModalOpen(false)}
                className="h-full"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
