import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check, AlertCircle } from 'lucide-react';
import {
  formatTime,
  parseTime,
  normalizeTimeInput,
  validateTime,
  generateOperatingHours,
} from '../../utils/timePickerUtils';

import { BookingInterval } from '../../utils/timePickerUtils';

export interface TimePickerInputProps {
  label?: string;
  labelClassName?: string;
  value: string; // "HH:mm"
  onChange: (timeStr: string) => void;
  openingTime?: string;
  closingTime?: string;
  minTime?: string;
  maxTime?: string;
  minDurationMinutes?: number; // e.g. 60 (for end time must be >= start + 60)
  mode?: 'start' | 'end';
  existingBookings?: BookingInterval[];
  date?: string; // YYYY-MM-DD
  allowPast?: boolean; // default false
  minuteInterval?: number; // default: 15 for quick select, allows any manual typing
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  label,
  labelClassName,
  value,
  onChange,
  openingTime = '00:00',
  closingTime = '23:59',
  minTime,
  maxTime,
  minDurationMinutes = 0,
  mode,
  existingBookings = [],
  date,
  allowPast = false,
  minuteInterval = 15,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  // Click outside to close dropdown
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

  const parsed = parseTime(value) || { hour: 8, minute: 0 };
  const operatingHours = generateOperatingHours(openingTime, closingTime);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = Boolean(date && date === todayStr);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const minMinutes = minTime
    ? ((parseTime(minTime)?.hour ?? 0) * 60 + (parseTime(minTime)?.minute ?? 0) + minDurationMinutes)
    : (parseTime(openingTime)?.hour ?? 0) * 60 + (parseTime(openingTime)?.minute ?? 0);

  const maxMinutes = maxTime
    ? ((parseTime(maxTime)?.hour ?? 24) * 60 + (parseTime(maxTime)?.minute ?? 0) - minDurationMinutes)
    : (parseTime(closingTime)?.hour ?? 24) * 60 + (parseTime(closingTime)?.minute ?? 0);

  // Check if slot falls in booked interval or violates booking boundaries
  const isSlotBooked = (startSlotMin: number, endSlotMin: number): boolean => {
    if (!existingBookings || existingBookings.length === 0) return false;

    for (let i = 0; i < existingBookings.length; i++) {
      const b = existingBookings[i];
      const bStart = (parseTime(b.startTime)?.hour ?? 0) * 60 + (parseTime(b.startTime)?.minute ?? 0);
      const bEnd = (parseTime(b.endTime)?.hour ?? 0) * 60 + (parseTime(b.endTime)?.minute ?? 0);

      if (mode === 'end' && minTime) {
        const myStart = (parseTime(minTime)?.hour ?? 0) * 60 + (parseTime(minTime)?.minute ?? 0);
        // If an existing booking starts between myStart and this end slot, end time cannot extend past bStart
        if (bStart >= myStart && bStart < endSlotMin) {
          return true;
        }
      }

      // Overlap with booked slot
      if (startSlotMin < bEnd && endSlotMin > bStart) {
        return true;
      }
    }
    return false;
  };

  const isHourDisabled = (h: number): boolean => {
    if (disabled) return true;
    const hourStartMin = h * 60;
    const hourEndMin = h * 60 + 59;

    if (hourEndMin < minMinutes) return true;
    if (hourStartMin > maxMinutes) return true;
    if (isToday && !allowPast && hourEndMin <= nowMinutes) return true;
    if (isSlotBooked(hourStartMin, hourEndMin)) return true;

    return false;
  };

  const isMinuteDisabled = (m: number): boolean => {
    if (disabled) return true;
    const totalMins = parsed.hour * 60 + m;

    if (totalMins < minMinutes) return true;
    if (totalMins > maxMinutes) return true;
    if (isToday && !allowPast && totalMins <= nowMinutes) return true;
    if (isSlotBooked(totalMins, totalMins + 1)) return true;

    return false;
  };

  const handleBlur = () => {
    const normalized = normalizeTimeInput(typedValue);
    if (normalized) {
      const valRes = validateTime(normalized);
      if (!valRes.isValid) {
        setError(valRes.error || 'Giờ không hợp lệ');
        setTypedValue(value);
        return;
      }

      const p = parseTime(normalized);
      if (p) {
        const totalMins = p.hour * 60 + p.minute;
        if (totalMins < minMinutes) {
          setError(minDurationMinutes > 0 ? `Giờ kết thúc phải lớn hơn giờ bắt đầu ít nhất ${Math.round(minDurationMinutes / 60)} tiếng` : `Giờ phải sau ${minTime || openingTime}`);
          setTypedValue(value);
          return;
        }
        if (totalMins > maxMinutes) {
          setError(`Giờ phải trước ${maxTime || closingTime}`);
          setTypedValue(value);
          return;
        }
        if (isToday && !allowPast && totalMins <= nowMinutes) {
          setError('Không thể chọn giờ trong quá khứ');
          setTypedValue(value);
          return;
        }
        if (isSlotBooked(totalMins, totalMins + 1)) {
          setError('Khung giờ này đã có người đặt');
          setTypedValue(value);
          return;
        }
      }

      setError(null);
      onChange(normalized);
      setTypedValue(normalized);
    } else {
      setError('Định dạng: HH:mm (ví dụ: 08:00)');
      setTypedValue(value);
    }
  };

  const handleSelectHour = (h: number) => {
    if (isHourDisabled(h)) return;
    const newTime = formatTime(h, parsed.minute);
    onChange(newTime);
    setTypedValue(newTime);
    setError(null);
  };

  const handleSelectMinute = (m: number) => {
    if (isMinuteDisabled(m)) return;
    const newTime = formatTime(parsed.hour, m);
    onChange(newTime);
    setTypedValue(newTime);
    setError(null);
  };

  const minuteOptions = [];
  for (let m = 0; m < 60; m += minuteInterval) {
    minuteOptions.push(m);
  }
  if (!minuteOptions.includes(parsed.minute)) {
    minuteOptions.push(parsed.minute);
    minuteOptions.sort((a, b) => a - b);
  }

  const customStyle = inputClassName || buttonClassName;
  const inputStyle = customStyle
    ? `${customStyle} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`
    : 'bg-white border-[#E6E2D8] text-[#1E3932] focus:outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/20';

  return (
    <div className={`relative space-y-1 font-['Plus_Jakarta_Sans',sans-serif] ${className}`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-bold ${labelClassName || 'text-[#1E3932]'}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            disabled={disabled}
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBlur();
              }
            }}
            placeholder="08:00"
            className={`w-full pl-8 pr-7 py-2 rounded-xl border font-mono text-xs font-bold transition-all ${
              error ? 'border-rose-400 text-rose-600' : ''
            } ${inputStyle}`}
          />
          <Clock className="w-3.5 h-3.5 text-[#006241] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-[#1E3932] transition-colors cursor-pointer"
            title="Chọn nhanh từ danh sách"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl border border-[#E6E2D8] p-3 shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
          {/* Hours */}
          <div>
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase block mb-1">
              Giờ:
            </span>
            <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto pr-1">
              {operatingHours.map((h) => {
                const isSelected = parsed.hour === h;
                const isDis = isHourDisabled(h);

                return (
                  <button
                    key={h}
                    type="button"
                    disabled={isDis}
                    onClick={() => handleSelectHour(h)}
                    className={`py-1 rounded-lg text-center font-mono text-xs font-bold border transition-all ${
                      isDis
                        ? 'opacity-25 text-gray-400 bg-gray-100 cursor-not-allowed border-gray-200'
                        : isSelected
                        ? 'bg-[#006241] text-white border-[#006241] shadow-xs cursor-pointer'
                        : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] cursor-pointer'
                    }`}
                  >
                    {String(h).padStart(2, '0')}:00
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minutes */}
          <div>
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase block mb-1">
              Phút:
            </span>
            <div className="grid grid-cols-4 gap-1">
              {minuteOptions.map((m) => {
                const isSelected = parsed.minute === m;
                const isDis = isMinuteDisabled(m);

                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isDis}
                    onClick={() => {
                      if (!isDis) {
                        handleSelectMinute(m);
                        setIsOpen(false);
                      }
                    }}
                    className={`py-1 rounded-lg text-center font-mono text-xs font-bold border transition-all ${
                      isDis
                        ? 'opacity-25 text-gray-400 bg-gray-100 cursor-not-allowed border-gray-200'
                        : isSelected
                        ? 'bg-[#006241] text-white border-[#006241] shadow-xs cursor-pointer'
                        : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] cursor-pointer'
                    }`}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
