import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
} from 'lucide-react';

interface CustomCalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  minDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
}

export const CustomCalendarPicker: React.FC<CustomCalendarPickerProps> = ({
  selectedDate,
  minDate,
  onSelectDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month from selectedDate or today
  const [viewYear, setViewYear] = useState<number>(() => {
    try {
      return parseInt(selectedDate.split('-')[0], 10) || new Date().getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    try {
      return parseInt(selectedDate.split('-')[1], 10) - 1 || new Date().getMonth();
    } catch {
      return new Date().getMonth();
    }
  });

  // Keep view year & month synced when selectedDate changes from external controls
  useEffect(() => {
    try {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    } catch {}
  }, [selectedDate]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar matrix (42 cells: 6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // Convert JS day (0: Sun, 1: Mon, ... 6: Sat) to Monday-first (0: Mon ... 6: Sun)
    const jsDay = firstDayOfMonth.getDay();
    const startingDayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    // Previous month padding days
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 12 : viewMonth;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(
        2,
        '0'
      )}`;
      const isDisabled = dateStr < minDate;

      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isDisabled,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`;
      const isDisabled = dateStr < minDate;

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isDisabled,
      });
    }

    // Next month padding days to fill 42 cells or full weeks
    const remainingCells = 42 - cells.length;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`;
      const isDisabled = dateStr < minDate;

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isDisabled,
      });
    }

    return cells;
  }, [viewYear, viewMonth, selectedDate, minDate]);

  // Format label for trigger button
  const formattedButtonLabel = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });
      return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleSelect = (dateStr: string) => {
    onSelectDate(dateStr);
    setIsOpen(false);
  };

  // Quick preset handlers
  const handleQuickSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    handleSelect(dateStr);
  };

  const handleQuickSelectTomorrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const dateStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
      t.getDate()
    ).padStart(2, '0')}`;
    handleSelect(dateStr);
  };

  const handleQuickSelectWeekend = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const jsDay = now.getDay(); // 0: Sun, 6: Sat
    let daysUntilSat = 6 - jsDay;
    if (daysUntilSat < 0) daysUntilSat = 6; // If Sunday, next Saturday
    if (daysUntilSat === 0) daysUntilSat = 0; // Today is Saturday

    const sat = new Date();
    sat.setDate(now.getDate() + daysUntilSat);
    const dateStr = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(
      sat.getDate()
    ).padStart(2, '0')}`;
    handleSelect(dateStr);
  };

  return (
    <div className="relative font-['Plus_Jakarta_Sans',sans-serif]" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-[#006241] ring-2 ring-[#006241]/20 shadow-md'
            : 'border-[#E6E2D8] hover:border-[#006241]'
        }`}
      >
        <div className="w-6 h-6 rounded-lg bg-[#006241]/10 text-[#006241] flex items-center justify-center">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <span className="text-[10px] font-mono text-[#6F7E72] font-bold uppercase block leading-none">
            Chọn Ngày Thi Đấu
          </span>
          <span className="text-xs font-black text-[#1E3932] font-mono capitalize">
            {formattedButtonLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#6F7E72] transition-transform duration-200 ml-1 ${
            isOpen ? 'rotate-180 text-[#006241]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Calendar */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(calc(100vw-1.5rem),350px)] p-4 sm:p-5 rounded-[28px] bg-[#FBF8F0] border border-[#E6E2D8] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Header: Month & Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white hover:bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] transition-all cursor-pointer shadow-2xs"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-sm font-black text-[#1E3932] font-mono tracking-tight">
                {monthNames[viewMonth]}, {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white hover:bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] transition-all cursor-pointer shadow-2xs"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysOfWeek.map((day, idx) => (
              <span
                key={day}
                className={`text-[11px] font-mono font-bold uppercase py-1 ${
                  idx >= 5 ? 'text-[#006241]' : 'text-[#6F7E72]'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const { dateStr, dayNum, isCurrentMonth, isToday, isSelected, isDisabled } = cell;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleSelect(dateStr)}
                  className={`h-9 sm:h-10 rounded-xl text-xs font-bold font-mono transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                    isSelected
                      ? 'bg-[#006241] text-white shadow-md font-black scale-105 ring-2 ring-emerald-400/30'
                      : isToday
                      ? 'bg-emerald-100/70 border border-[#006241]/40 text-[#006241] font-black'
                      : !isCurrentMonth
                      ? 'text-[#6F7E72]/40 hover:bg-white'
                      : isDisabled
                      ? 'text-slate-300 opacity-40 cursor-not-allowed'
                      : 'text-[#1E3932] hover:bg-white hover:border hover:border-[#E6E2D8] hover:text-[#006241]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#006241] absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Footer */}
          <div className="pt-3 border-t border-[#E6E2D8]/60 flex items-center justify-between gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleQuickSelectToday}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#006241] text-[#1E3932] hover:text-white border border-[#E6E2D8] text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
            >
              Hôm Nay
            </button>

            <button
              type="button"
              onClick={handleQuickSelectTomorrow}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#006241] text-[#1E3932] hover:text-white border border-[#E6E2D8] text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
            >
              Ngày Mai
            </button>

            <button
              type="button"
              onClick={handleQuickSelectWeekend}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#006241] text-[#006241] hover:text-white border border-emerald-200 text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs"
            >
              Cuối Tuần
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
