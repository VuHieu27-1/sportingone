import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  parseTime,
  formatTime,
  timeStrToMinutes,
  minutesToTimeStr,
  normalizeTimeInput,
  normalizeHourInput,
  normalizeMinuteInput,
  calculateDuration,
  isTimeRangeValid,
  checkBookingConflict,
  generateOperatingHours,
  generateTimelineSegments,
  BookingInterval,
  TimeDuration,
} from '../../utils/timePickerUtils';

export interface TimeRangePickerValue {
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  duration: TimeDuration;
}

export interface TimeRangePickerProps {
  date?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional for range)
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
  openingTime?: string; // "HH:mm" (default: "06:00")
  closingTime?: string; // "HH:mm" (default: "23:00")
  minuteInterval?: number; // default: 1 (allows any minute 0-59)
  existingBookings?: BookingInterval[];
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  allowDateSelection?: boolean; // default: true
  isDateRange?: boolean; // default: false
  variant?: 'full' | 'compact' | 'time-only'; // default: 'full'
  title?: string;
  pricePerHour?: number;
  disabled?: boolean;
  showActions?: boolean; // default: false
  confirmText?: string;
  cancelText?: string;
  onChange?: (value: TimeRangePickerValue) => void;
  onConfirm?: (value: TimeRangePickerValue) => void;
  onCancel?: () => void;
  className?: string;
}

const monthNamesVi = [
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

const TimeRangePickerComponent: React.FC<TimeRangePickerProps> = ({
  date = new Date().toISOString().split('T')[0],
  endDate,
  startTime = '08:00',
  endTime = '09:00',
  openingTime = '06:00',
  closingTime = '23:00',
  minuteInterval = 1,
  existingBookings = [],
  minDate = new Date().toISOString().split('T')[0],
  maxDate,
  allowDateSelection = true,
  isDateRange = false,
  variant = 'full',
  title,
  pricePerHour,
  disabled = false,
  showActions = false,
  confirmText = 'Xác nhận khung giờ',
  cancelText = 'Hủy',
  onChange,
  onConfirm,
  onCancel,
  className = '',
}) => {
  // Current active target field: 'start' (Check-in) or 'end' (Check-out)
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');

  // Internal values initialized from props
  const [internalDate, setInternalDate] = useState<string>(date);
  const [internalEndDate, setInternalEndDate] = useState<string>(endDate || date);
  const [internalStartTime, setInternalStartTime] = useState<string>(startTime);
  const [internalEndTime, setInternalEndTime] = useState<string>(endTime);

  // Manual raw text inputs for quick typing
  const [manualStartInput, setManualStartInput] = useState<string>(startTime);
  const [manualEndInput, setManualEndInput] = useState<string>(endTime);
  const [manualHourInput, setManualHourInput] = useState<string>('');
  const [manualMinInput, setManualMinInput] = useState<string>('');

  // Calendar View month & year navigation
  const [viewYear, setViewYear] = useState<number>(() => {
    try {
      return parseInt((date || '').split('-')[0], 10) || new Date().getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    try {
      return parseInt((date || '').split('-')[1], 10) - 1 || new Date().getMonth();
    } catch {
      return new Date().getMonth();
    }
  });

  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Track previous prop values to avoid overwriting user clicks when parent re-renders
  const prevPropsRef = useRef({ date, endDate, startTime, endTime });

  useEffect(() => {
    const prev = prevPropsRef.current;
    if (date && date !== prev.date) {
      setInternalDate(date);
      const [y, m] = date.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
    if (endDate && endDate !== prev.endDate) {
      setInternalEndDate(endDate);
    }
    if (startTime && startTime !== prev.startTime) {
      setInternalStartTime(startTime);
      setManualStartInput(startTime);
    }
    if (endTime && endTime !== prev.endTime) {
      setInternalEndTime(endTime);
      setManualEndInput(endTime);
    }
    prevPropsRef.current = { date, endDate, startTime, endTime };
  }, [date, endDate, startTime, endTime]);

  // Pre-parse existing bookings into integer minutes ranges once for O(1) checks
  const parsedBookingRanges = useMemo(() => {
    if (!existingBookings || existingBookings.length === 0) return [];
    return existingBookings.map((b) => ({
      start: timeStrToMinutes(b.startTime),
      end: timeStrToMinutes(b.endTime),
      status: b.status,
    }));
  }, [existingBookings]);

  // Derived duration calculation
  const duration = useMemo(() => {
    return calculateDuration(internalStartTime, internalEndTime);
  }, [internalStartTime, internalEndTime]);

  // Pre-calculate parsed integer minutes
  const startMins = useMemo(() => timeStrToMinutes(internalStartTime), [internalStartTime]);
  const endMins = useMemo(() => timeStrToMinutes(internalEndTime), [internalEndTime]);

  // Today comparison metrics
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isSelectedDateToday = internalDate === todayStr;
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [internalDate]);

  // Validation
  const validation = useMemo(() => {
    const rangeVal = isTimeRangeValid(
      internalStartTime,
      internalEndTime,
      openingTime,
      closingTime
    );
    if (!rangeVal.isValid) return rangeVal;

    // Check overlap with existing bookings on internalDate
    const conflict = checkBookingConflict(
      internalStartTime,
      internalEndTime,
      existingBookings
    );
    if (conflict.hasConflict) {
      return {
        isValid: false,
        error: `Khung giờ bị trùng với lịch đã đặt (${conflict.conflictingBooking?.startTime} - ${conflict.conflictingBooking?.endTime}). Vui lòng chọn khung giờ khác.`,
      };
    }

    return { isValid: true };
  }, [internalStartTime, internalEndTime, openingTime, closingTime, existingBookings]);

  // Operating Hours Array
  const operatingHours = useMemo(() => {
    return generateOperatingHours(openingTime, closingTime);
  }, [openingTime, closingTime]);

  // Active target time string
  const currentTargetTime = activeField === 'start' ? internalStartTime : internalEndTime;
  const parsedTargetTime = useMemo(() => {
    return parseTime(currentTargetTime) || { hour: 8, minute: 0 };
  }, [currentTargetTime]);

  // Update target time (start or end)
  const handleTimeUpdate = useCallback(
    (newTimeStr: string, field: 'start' | 'end' = activeField) => {
      let nextStart = internalStartTime;
      let nextEnd = internalEndTime;

      if (field === 'start') {
        nextStart = newTimeStr;
        setInternalStartTime(newTimeStr);
        setManualStartInput(newTimeStr);

        // Auto adjust end time if start >= end
        const startMins = timeStrToMinutes(newTimeStr);
        const endMins = timeStrToMinutes(internalEndTime);
        if (startMins >= endMins) {
          nextEnd = minutesToTimeStr(Math.min(23 * 60 + 59, startMins + 60));
          setInternalEndTime(nextEnd);
          setManualEndInput(nextEnd);
        }
      } else {
        nextEnd = newTimeStr;
        setInternalEndTime(newTimeStr);
        setManualEndInput(newTimeStr);

        // Auto adjust start time if end <= start
        const startMins = timeStrToMinutes(internalStartTime);
        const endMins = timeStrToMinutes(newTimeStr);
        if (endMins <= startMins) {
          nextStart = minutesToTimeStr(Math.max(0, endMins - 60));
          setInternalStartTime(nextStart);
          setManualStartInput(nextStart);
        }
      }

      if (onChange) {
        onChange({
          date: internalDate,
          endDate: isDateRange ? internalEndDate : undefined,
          startTime: nextStart,
          endTime: nextEnd,
          duration: calculateDuration(nextStart, nextEnd),
        });
      }
    },
    [activeField, internalStartTime, internalEndTime, internalDate, internalEndDate, isDateRange, onChange]
  );

  // Hour click handler
  const handleSelectHour = useCallback(
    (hour: number) => {
      const currentMin = parsedTargetTime.minute;
      const newTime = formatTime(hour, currentMin);
      handleTimeUpdate(newTime, activeField);
    },
    [parsedTargetTime.minute, handleTimeUpdate, activeField]
  );

  // Minute click handler
  const handleSelectMinute = useCallback(
    (minute: number) => {
      const currentHour = parsedTargetTime.hour;
      const newTime = formatTime(currentHour, minute);
      handleTimeUpdate(newTime, activeField);
    },
    [parsedTargetTime.hour, handleTimeUpdate, activeField]
  );

  // Manual Combined Time Input handler (e.g. typing "08:02" or "8" or "802")
  const handleManualTimeBlur = useCallback(
    (field: 'start' | 'end') => {
      const raw = field === 'start' ? manualStartInput : manualEndInput;
      const normalized = normalizeTimeInput(raw);
      if (normalized) {
        handleTimeUpdate(normalized, field);
      } else {
        // Revert to internal value
        if (field === 'start') {
          setManualStartInput(internalStartTime);
        } else {
          setManualEndInput(internalEndTime);
        }
      }
    },
    [manualStartInput, manualEndInput, internalStartTime, internalEndTime, handleTimeUpdate]
  );

  // Manual Hour input blur / keydown
  const handleManualHourCommit = useCallback(() => {
    if (!manualHourInput) return;
    const h = normalizeHourInput(manualHourInput);
    if (h !== null) {
      handleSelectHour(h);
      setManualHourInput('');
      // Auto move to minute input
      if (minuteInputRef.current) {
        minuteInputRef.current.focus();
      }
    } else {
      setManualHourInput('');
    }
  }, [manualHourInput, handleSelectHour]);

  // Manual Minute input blur / keydown
  const handleManualMinuteCommit = useCallback(() => {
    if (!manualMinInput) return;
    const m = normalizeMinuteInput(manualMinInput);
    if (m !== null) {
      handleSelectMinute(m);
      setManualMinInput('');
    } else {
      setManualMinInput('');
    }
  }, [manualMinInput, handleSelectMinute]);

  // Quick Preset Additions (+30m, +1h, +1.5h, +2h)
  const handleAddDurationPreset = useCallback(
    (hoursToAdd: number) => {
      const startMins = timeStrToMinutes(internalStartTime);
      const addedMins = hoursToAdd * 60;
      const newEndMins = Math.min(23 * 60 + 59, startMins + addedMins);
      const newEnd = minutesToTimeStr(newEndMins);
      setInternalEndTime(newEnd);
      setManualEndInput(newEnd);
      if (onChange) {
        onChange({
          date: internalDate,
          endDate: isDateRange ? internalEndDate : undefined,
          startTime: internalStartTime,
          endTime: newEnd,
          duration: calculateDuration(internalStartTime, newEnd),
        });
      }
    },
    [internalStartTime, internalDate, internalEndDate, isDateRange, onChange]
  );

  // Calendar Date click handler
  const handleSelectDate = useCallback(
    (dateStr: string) => {
      let nextStartDate = internalDate;
      let nextEndDate = internalEndDate;

      if (isDateRange && activeField === 'end') {
        nextEndDate = dateStr;
        setInternalEndDate(dateStr);
      } else {
        nextStartDate = dateStr;
        setInternalDate(dateStr);
        if (!isDateRange || new Date(dateStr) > new Date(internalEndDate)) {
          nextEndDate = dateStr;
          setInternalEndDate(dateStr);
        }
      }

      if (onChange) {
        onChange({
          date: nextStartDate,
          endDate: isDateRange ? nextEndDate : undefined,
          startTime: internalStartTime,
          endTime: internalEndTime,
          duration: calculateDuration(internalStartTime, internalEndTime),
        });
      }
    },
    [isDateRange, activeField, internalDate, internalEndDate, internalStartTime, internalEndTime, onChange]
  );

  // Month navigation
  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // Month Calendar Matrix Generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isInRange: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isInRange: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = minDate ? dateStr < minDate : false;
      const isFutureExceeded = maxDate ? dateStr > maxDate : false;
      const isSelected = isDateRange
        ? dateStr === internalDate || dateStr === internalEndDate
        : dateStr === internalDate;
      const isInRange = isDateRange
        ? dateStr > internalDate && dateStr < internalEndDate
        : false;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isDisabled: isPast || isFutureExceeded,
        isSelected,
        isInRange,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill complete grid rows (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isInRange: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, internalDate, internalEndDate, minDate, maxDate, isDateRange]);

  // Timeline Segments
  const timelineSegments = useMemo(() => {
    return generateTimelineSegments(
      internalStartTime,
      internalEndTime,
      openingTime,
      closingTime,
      existingBookings,
      30
    );
  }, [internalStartTime, internalEndTime, openingTime, closingTime, existingBookings]);

  // Quick Minute Options based on interval
  const minuteOptions = useMemo(() => {
    const opts: number[] = [];
    if (minuteInterval <= 1) {
      opts.push(0, 15, 30, 45);
    } else {
      for (let m = 0; m < 60; m += minuteInterval) {
        opts.push(m);
      }
    }
    // Always ensure current selected minute is present in options list
    if (!opts.includes(parsedTargetTime.minute)) {
      opts.push(parsedTargetTime.minute);
      opts.sort((a, b) => a - b);
    }
    return opts;
  }, [minuteInterval, parsedTargetTime.minute]);

  // Total price estimate if pricePerHour provided
  const totalPrice = pricePerHour ? Math.round(duration.totalHours * pricePerHour) : null;

  return (
    <div
      className={`bg-white rounded-3xl border border-[#E6E2D8] shadow-2xl overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932] max-w-full flex flex-col ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-4 sm:p-5 bg-[#FAF8F5] border-b border-[#E6E2D8] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E3932] font-mono tracking-tight">
              {duration.text}
            </h2>
            {totalPrice !== null && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#006241] font-mono font-black text-xs">
                {totalPrice.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-[#6F7E72] uppercase tracking-wider block mt-0.5">
            {title || 'Thời Lượng Đặt Sân'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div
            onClick={() => setActiveField('start')}
            className={`flex-1 sm:w-40 p-2.5 rounded-2xl border transition-all cursor-pointer ${
              activeField === 'start'
                ? 'bg-white border-[#006241] ring-2 ring-[#006241]/20 shadow-xs'
                : 'bg-[#F2F0EB] border-[#E6E2D8] hover:bg-white/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider">
                Bắt đầu (Check-in)
              </span>
              {activeField === 'start' && (
                <span className="w-2 h-2 rounded-full bg-[#006241] animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline justify-between mt-0.5 gap-1">
              <input
                type="text"
                value={activeField === 'start' ? manualStartInput : internalStartTime}
                onChange={(e) => setManualStartInput(e.target.value)}
                onFocus={() => setActiveField('start')}
                onBlur={() => handleManualTimeBlur('start')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualTimeBlur('start');
                }}
                className="font-mono text-base font-black text-[#1E3932] bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-16 cursor-text"
                title="Gõ giờ bắt đầu (ví dụ: 08:02 hoặc 8)"
              />
              <span className="text-[10px] font-semibold text-[#6F7E72]">
                {internalDate.split('-').slice(1).reverse().join('/')}
              </span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-[#6F7E72] shrink-0 hidden sm:block" />

          {/* Check-out / End Box */}
          <div
            onClick={() => setActiveField('end')}
            className={`flex-1 sm:w-40 p-2.5 rounded-2xl border transition-all cursor-pointer ${
              activeField === 'end'
                ? 'bg-white border-[#006241] ring-2 ring-[#006241]/20 shadow-xs'
                : 'bg-[#F2F0EB] border-[#E6E2D8] hover:bg-white/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider">
                Kết thúc (Check-out)
              </span>
              {activeField === 'end' && (
                <span className="w-2 h-2 rounded-full bg-[#006241] animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline justify-between mt-0.5 gap-1">
              <input
                type="text"
                value={activeField === 'end' ? manualEndInput : internalEndTime}
                onChange={(e) => setManualEndInput(e.target.value)}
                onFocus={() => setActiveField('end')}
                onBlur={() => handleManualTimeBlur('end')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualTimeBlur('end');
                }}
                className="font-mono text-base font-black text-[#1E3932] bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-16 cursor-text"
                title="Gõ giờ kết thúc (ví dụ: 09:30 hoặc 9:30)"
              />
              <span className="text-[10px] font-semibold text-[#6F7E72]">
                {(isDateRange ? internalEndDate : internalDate)
                  .split('-')
                  .slice(1)
                  .reverse()
                  .join('/')}
              </span>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-2xl bg-white hover:bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] border border-[#E6E2D8] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Scrollable Body Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#E6E2D8]">
          {allowDateSelection && variant !== 'time-only' && (
            <div className="md:col-span-6 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-sm sm:text-base font-extrabold text-[#1E3932]">
                {monthNamesVi[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {daysOfWeek.map((d) => (
                <span
                  key={d}
                  className="text-[11px] font-mono font-bold text-[#6F7E72] py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cd, idx) => {
                let cellStyle = 'hover:bg-[#F2F0EB] text-[#1E3932]';

                if (cd.isDisabled || !cd.isCurrentMonth) {
                  cellStyle = 'opacity-30 text-gray-400 cursor-not-allowed';
                } else if (cd.isSelected) {
                  cellStyle = 'bg-[#006241] text-white font-black shadow-md scale-105';
                } else if (cd.isInRange) {
                  cellStyle = 'bg-emerald-100 text-[#006241] font-bold';
                }

                return (
                  <button
                    key={`${cd.dateStr}-${idx}`}
                    type="button"
                    disabled={cd.isDisabled || !cd.isCurrentMonth || disabled}
                    onClick={() => handleSelectDate(cd.dateStr)}
                    className={`h-9 w-full rounded-xl flex flex-col items-center justify-center text-xs font-mono font-bold transition-all relative cursor-pointer ${cellStyle}`}
                  >
                    <span>{cd.dayNumber}</span>
                    {cd.isToday && !cd.isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#006241] absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Timetable for the day / Visual Timeline */}
            <div className="pt-3 border-t border-[#E6E2D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#1E3932] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#006241]" />
                  <span>Dòng thời gian trong ngày</span>
                </span>
                <span className="text-[10px] font-mono text-[#6F7E72]">
                  {openingTime} – {closingTime}
                </span>
              </div>

              {/* Visual Multi-Segment Bar */}
              <div className="h-4 w-full bg-[#F2F0EB] rounded-full overflow-hidden flex border border-[#E6E2D8] p-0.5 gap-0.5">
                {timelineSegments.map((seg, sIdx) => {
                  let segBg = 'bg-[#E6E2D8]'; // available / neutral
                  if (seg.status === 'selected') segBg = 'bg-[#006241]';
                  else if (seg.status === 'booked') segBg = 'bg-rose-400';
                  else if (seg.status === 'closed') segBg = 'bg-gray-300 opacity-40';

                  return (
                    <div
                      key={sIdx}
                      className={`flex-1 h-full rounded-sm transition-colors ${segBg}`}
                      title={`${seg.startStr} - ${seg.endStr}: ${seg.status === 'selected'
                        ? 'Đang chọn'
                        : seg.status === 'booked'
                          ? 'Đã có người đặt'
                          : seg.status === 'closed'
                            ? 'Ngoài giờ mở cửa'
                            : 'Còn trống'
                        }`}
                    />
                  );
                })}
              </div>

              {/* Timeline Time Labels */}
              <div className="flex justify-between text-[9px] font-mono text-[#6F7E72] px-0.5">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center flex-wrap gap-3 pt-1 text-[10px] font-semibold text-[#6F7E72]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#006241]" />
                  <span>Lịch bạn chọn</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Đã có người đặt</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#E6E2D8]" />
                  <span>Còn trống</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Hours & Minutes Selector with Manual Typing */}
        {/* ========================================================= */}
        <div
          className={`${allowDateSelection && variant !== 'time-only' ? 'md:col-span-6' : 'col-span-12'
            } p-4 sm:p-5 space-y-4`}
        >
          {/* Active Field Notification Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#006241]" />
              <span className="font-bold text-[#006241]">
                Đang điều chỉnh:{' '}
                <strong className="uppercase">
                  {activeField === 'start' ? 'Giờ Bắt Đầu' : 'Giờ Kết Thúc'}
                </strong>{' '}
                ({currentTargetTime})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveField(activeField === 'start' ? 'end' : 'start')}
              className="px-2.5 py-1 rounded-xl bg-white text-[#006241] border border-emerald-200 font-bold hover:bg-[#006241] hover:text-white transition-all text-[11px] cursor-pointer"
            >
              Chuyển sang {activeField === 'start' ? 'Kết thúc' : 'Bắt đầu'}
            </button>
          </div>

          {/* Direct Manual Typing Inputs for Hour & Minute */}
          <div className="p-3.5 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] space-y-2">
            <span className="text-[11px] font-mono font-bold text-[#6F7E72] uppercase block">
              ⌨ Nhập trực tiếp giờ & phút:
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={hourInputRef}
                  type="text"
                  placeholder={String(parsedTargetTime.hour).padStart(2, '0')}
                  value={manualHourInput}
                  onChange={(e) => setManualHourInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      handleManualHourCommit();
                    }
                  }}
                  onBlur={handleManualHourCommit}
                  maxLength={2}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E2D8] font-mono text-center text-sm font-black text-[#1E3932] focus:outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/20"
                />
                <span className="text-[10px] text-[#6F7E72] font-semibold text-center block mt-0.5">
                  Giờ (0-23)
                </span>
              </div>

              <span className="font-mono font-black text-lg text-[#6F7E72] -mt-3">:</span>

              <div className="flex-1 relative">
                <input
                  ref={minuteInputRef}
                  type="text"
                  placeholder={String(parsedTargetTime.minute).padStart(2, '0')}
                  value={manualMinInput}
                  onChange={(e) => setManualMinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualMinuteCommit();
                    }
                  }}
                  onBlur={handleManualMinuteCommit}
                  maxLength={2}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E2D8] font-mono text-center text-sm font-black text-[#1E3932] focus:outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/20"
                />
                <span className="text-[10px] text-[#6F7E72] font-semibold text-center block mt-0.5">
                  Phút (00-59)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleManualHourCommit();
                  handleManualMinuteCommit();
                }}
                className="px-3 py-2 rounded-xl bg-[#006241] text-white font-bold text-xs hover:bg-[#006241]/90 transition-all cursor-pointer -mt-3"
              >
                Lưu
              </button>
            </div>
          </div>

          {/* HOURS GRID SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider">
                Chọn Giờ (Hours)
              </span>
              <span className="text-[10px] font-mono text-[#6F7E72]">
                Mở: {openingTime} – Đóng: {closingTime}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
              {operatingHours.map((h) => {
                const hourStr = `${String(h).padStart(2, '0')}:00`;
                const isSelected = parsedTargetTime.hour === h;
                const hStart = h * 60;
                const hEnd = h * 60 + 59;

                let isDis = disabled;
                // End time must be at least 1 hour (60 mins) greater than start time
                if (activeField === 'end' && hEnd < startMins + 60) {
                  isDis = true;
                } else if (activeField === 'start' && isSelectedDateToday && hEnd <= nowMinutes) {
                  isDis = true;
                } else if (parsedBookingRanges.length > 0) {
                  for (let i = 0; i < parsedBookingRanges.length; i++) {
                    const b = parsedBookingRanges[i];
                    if (activeField === 'start') {
                      if (hStart < b.end && hEnd > b.start) {
                        isDis = true;
                        break;
                      }
                    } else if (activeField === 'end') {
                      // Cannot extend end time through or past a booked booking that starts after start time
                      if (b.start >= startMins && b.start < hStart) {
                        isDis = true;
                        break;
                      }
                    }
                  }
                }

                return (
                  <button
                    key={h}
                    type="button"
                    disabled={isDis}
                    onClick={() => handleSelectHour(h)}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-xs font-bold transition-all border ${isDis
                      ? 'opacity-25 text-gray-400 bg-gray-100 cursor-not-allowed border-gray-200'
                      : isSelected
                        ? 'bg-[#006241] border-[#006241] text-white shadow-md scale-102 ring-2 ring-[#006241]/30 cursor-pointer'
                        : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] hover:border-[#006241]/40 cursor-pointer'
                      }`}
                  >
                    {hourStr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MINUTES GRID SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider">
                Chọn Phút (Minutes)
              </span>
              <span className="text-[10px] font-mono text-[#6F7E72]">
                {minuteInterval <= 1 ? 'Mọi phút (00–59)' : `Bước nhảy ${minuteInterval}p`}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {minuteOptions.map((m) => {
                const isSelected = parsedTargetTime.minute === m;
                const mStr = `${String(parsedTargetTime.hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const totalMins = parsedTargetTime.hour * 60 + m;

                let isDis = disabled;
                // End time must be at least 1 hour (60 mins) greater than start time
                if (activeField === 'end' && totalMins < startMins + 60) {
                  isDis = true;
                } else if (activeField === 'start' && isSelectedDateToday && totalMins <= nowMinutes) {
                  isDis = true;
                } else if (parsedBookingRanges.length > 0) {
                  for (let i = 0; i < parsedBookingRanges.length; i++) {
                    const b = parsedBookingRanges[i];
                    if (activeField === 'start') {
                      if (totalMins < b.end && (totalMins + 1) > b.start) {
                        isDis = true;
                        break;
                      }
                    } else if (activeField === 'end') {
                      if (b.start >= startMins && b.start < totalMins) {
                        isDis = true;
                        break;
                      }
                    }
                  }
                }

                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isDis}
                    onClick={() => handleSelectMinute(m)}
                    className={`px-3 py-1.5 rounded-xl text-center font-mono text-xs font-bold transition-all border ${isDis
                      ? 'opacity-25 text-gray-400 bg-gray-100 cursor-not-allowed border-gray-200'
                      : isSelected
                        ? 'bg-[#006241] border-[#006241] text-white shadow-xs scale-105 cursor-pointer'
                        : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] hover:border-[#006241]/40 cursor-pointer'
                      }`}
                  >
                    {mStr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUICK DURATION PRESETS */}
          <div className="pt-2 border-t border-[#E6E2D8]">
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase block mb-1.5">
              ⚡ Tăng nhanh thời lượng thi đấu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '+1 tiếng', hrs: 1 },
                { label: '+2 tiếng', hrs: 2 },
                { label: '+3 tiếng', hrs: 3 },
                { label: '+4 tiếng', hrs: 4 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAddDurationPreset(p.hrs)}
                  className="px-2.5 py-1 rounded-lg bg-[#F2F0EB] hover:bg-[#006241] hover:text-white border border-[#E6E2D8] text-[11px] font-bold text-[#1E3932] transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM: Validation Feedback & Action Buttons */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 bg-[#FAF8F5] border-t border-[#E6E2D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        {/* Inline Validation Alert */}
        <div className="flex-1">
          {!validation.isValid ? (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validation.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#006241] shrink-0" />
              <span>
                Khung giờ hợp lệ: <strong>{internalStartTime} → {internalEndTime}</strong> ({duration.text}) ngày {internalDate}
              </span>
            </div>
          )}
        </div>

        {/* Modal / Standalone Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] text-xs font-bold transition-all cursor-pointer"
              >
                {cancelText}
              </button>
            )}

            {onConfirm && (
              <button
                type="button"
                disabled={!validation.isValid || disabled}
                onClick={() => {
                  if (validation.isValid) {
                    onConfirm({
                      date: internalDate,
                      endDate: isDateRange ? internalEndDate : undefined,
                      startTime: internalStartTime,
                      endTime: internalEndTime,
                      duration,
                    });
                  }
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#006241] hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const TimeRangePicker = memo(TimeRangePickerComponent);
