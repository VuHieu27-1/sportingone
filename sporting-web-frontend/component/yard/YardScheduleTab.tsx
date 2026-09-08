import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Layers,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { BackendYardItem } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';
import { AuthUser } from '../../types/auth';
import { timeService } from '../../services/timeService';
import { CustomCalendarPicker } from './CustomCalendarPicker';
import { generateTimeSlotsAMPM, formatTimeAMPM } from '../../utils/dateUtils';
import { TimePickerInput } from '../common/TimePickerInput';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { normalizeTimeInput, validateTime, timeStrToMinutes } from '../../utils/timePickerUtils';

export interface GroupedBookingSlot {
  date: string;
  startTime: string; // e.g. "12:00"
  endTime: string;   // e.g. "14:00"
  durationHours: number;
  price: number;
  label: string;
}

interface YardScheduleTabProps {
  yard: BackendYardItem;
  paidBookings: BackendBooking[];
  currentUser?: AuthUser | null;
  onBookTimeSlot?: (selectedDate: string, startTime: string, endTime: string) => void;
  onBookMultipleSlots?: (groups: GroupedBookingSlot[]) => void;
}

export const YardScheduleTab: React.FC<YardScheduleTabProps> = ({
  yard,
  paidBookings,
  currentUser,
  onBookTimeSlot,
  onBookMultipleSlots,
}) => {
  const [todayStr, setTodayStr] = useState<string>(() => timeService.getTodayDateStr());
  const [selectedDate, setSelectedDate] = useState<string>(() => timeService.getTodayDateStr());
  const [startDateOffset, setStartDateOffset] = useState<number>(0);
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([]);
  const [customOrders, setCustomOrders] = useState<GroupedBookingSlot[]>([]);
  const isUpdatingFromOrderEdit = useRef<boolean>(false);

  // Sync actual real-time date from API
  useEffect(() => {
    let isMounted = true;
    timeService.getCurrentTime().then((timeData) => {
      if (isMounted && timeData && timeData.date) {
        setTodayStr(timeData.date);
        setSelectedDate((prev) => {
          if (!prev || prev === timeService.getTodayDateStr()) {
            return timeData.date;
          }
          return prev;
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 15-minute increment dropdown options from 06:00 to 23:45
  const timeOptions = useMemo(() => {
    return generateTimeSlotsAMPM(6, 23, 15);
  }, []);

  // Generate 7 days based on startDateOffset and synced real date
  const days = useMemo(() => {
    const list: Array<{ dateStr: string; label: string; dayName: string; isToday: boolean; isPast: boolean }> = [];
    const baseDate = new Date(`${todayStr}T00:00:00`);
    baseDate.setDate(baseDate.getDate() + startDateOffset);

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const isTodayDate = dateStr === todayStr;
      const isPastDate = new Date(`${dateStr}T23:59:59.999`).getTime() < timeService.getNowMs();

      let dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      if (isTodayDate) dayName = 'Hôm nay';
      else {
        const tomorrow = new Date(`${todayStr}T00:00:00`);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        if (dateStr === tomStr) dayName = 'Ngày mai';
      }

      const label = `${dd}/${mm}`;
      list.push({ dateStr, label, dayName, isToday: isTodayDate, isPast: isPastDate });
    }
    return list;
  }, [todayStr, startDateOffset]);

  // Handle custom date picker input change
  const handleCustomDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    setSelectedDate(newDateStr);
    setSelectedSlotIndices([]);
    setCustomOrders([]);

    // Calculate days offset from today
    const selectedTime = new Date(newDateStr).getTime();
    const todayTime = new Date(todayStr).getTime();
    const diffDays = Math.floor((selectedTime - todayTime) / (1000 * 60 * 60 * 24));
    setStartDateOffset(diffDays >= 0 ? diffDays : 0);
  };

  const handleResetToday = () => {
    setStartDateOffset(0);
    setSelectedDate(todayStr);
    setSelectedSlotIndices([]);
    setCustomOrders([]);
  };

  const openTime = yard.vendor?.openTime || '06:00';
  const closeTime = yard.vendor?.closeTime || '23:00';

  const parseTimeToMinutes = (tStr?: string | null, fallback: number = 0): number => {
    if (!tStr) return fallback;
    const parts = tStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return fallback;
    return parts[0] * 60 + parts[1];
  };

  const formatMinutesToTime = (totalMinutes: number): string => {
    const normalized = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
    const h = Math.floor(normalized / 60) % 24;
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Compute dynamic timeline slots on selected date based on operating hours and paid bookings
  const evaluatedSlots = useMemo(() => {
    const now = new Date();
    const openMins = parseTimeToMinutes(openTime, 6 * 60);
    let closeMins = parseTimeToMinutes(closeTime, 23 * 60);
    if (closeMins <= openMins) {
      closeMins = 23 * 60;
    }

    const dayStartMs = new Date(`${selectedDate}T00:00:00`).getTime();
    const dayEndMs = new Date(`${selectedDate}T23:59:59.999`).getTime();

    const bookingsOnDate = paidBookings
      .filter((b) => {
        if (Number(b.yard?.id) !== Number(yard.id)) return false;
        const bStatus = String(b.status || '').toLowerCase().trim();
        if (bStatus !== 'paid') return false;

        const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
        if (isMonthly && b.startDate && b.endDate) {
          return selectedDate >= b.startDate && selectedDate <= b.endDate;
        }

        const bStartMs = new Date(b.startTime).getTime();
        const bEndMs = new Date(b.endTime).getTime();
        return !isNaN(bStartMs) && !isNaN(bEndMs) && bStartMs < dayEndMs && bEndMs > dayStartMs;
      })
      .map((b) => {
        const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
        let startMins = 0;
        let endMins = 0;

        if (isMonthly) {
          startMins = parseTimeToMinutes(b.startTime, 0);
          endMins = parseTimeToMinutes(b.endTime, 0);
        } else {
          const bStartObj = new Date(b.startTime);
          const bEndObj = new Date(b.endTime);

          startMins = !isNaN(bStartObj.getTime())
            ? bStartObj.getHours() * 60 + bStartObj.getMinutes()
            : parseTimeToMinutes(b.startTime, 0);
          endMins = !isNaN(bEndObj.getTime())
            ? bEndObj.getHours() * 60 + bEndObj.getMinutes()
            : parseTimeToMinutes(b.endTime, 0);
        }

        if (endMins <= startMins) {
          endMins = startMins + 60;
        }

        const clampedStart = Math.max(openMins, startMins);
        const clampedEnd = Math.min(closeMins, endMins);

        return {
          booking: b,
          startMins: clampedStart,
          endMins: clampedEnd,
        };
      })
      .filter((b) => b.endMins > b.startMins)
      .sort((a, b) => a.startMins - b.startMins);

    const rawSlots: Array<{ startMins: number; endMins: number; booking: BackendBooking | null }> = [];
    let cursor = openMins;
    const STANDARD_STEP = 60;

    for (let i = 0; i < bookingsOnDate.length; i++) {
      const b = bookingsOnDate[i];

      if (cursor < b.startMins) {
        while (cursor + STANDARD_STEP <= b.startMins) {
          rawSlots.push({
            startMins: cursor,
            endMins: cursor + STANDARD_STEP,
            booking: null,
          });
          cursor += STANDARD_STEP;
        }

        if (cursor < b.startMins) {
          rawSlots.push({
            startMins: cursor,
            endMins: b.startMins,
            booking: null,
          });
          cursor = b.startMins;
        }
      }

      const actualSlotStart = Math.max(cursor, b.startMins);
      if (b.endMins > actualSlotStart) {
        rawSlots.push({
          startMins: actualSlotStart,
          endMins: b.endMins,
          booking: b.booking,
        });
        cursor = b.endMins;
      }
    }

    if (cursor < closeMins) {
      while (cursor + STANDARD_STEP <= closeMins) {
        rawSlots.push({
          startMins: cursor,
          endMins: cursor + STANDARD_STEP,
          booking: null,
        });
        cursor += STANDARD_STEP;
      }

      if (cursor < closeMins) {
        rawSlots.push({
          startMins: cursor,
          endMins: closeMins,
          booking: null,
        });
        cursor = closeMins;
      }
    }

    const isYardMaintenance = String(yard.status || '').toLowerCase().trim() === 'maintenance';

    return rawSlots.map((slot, index) => {
      const start = formatMinutesToTime(slot.startMins);
      const end = formatMinutesToTime(slot.endMins);
      const durationHours = Math.max(0.25, (slot.endMins - slot.startMins) / 60);

      let period: 'morning' | 'afternoon' | 'evening' = 'morning';
      if (slot.startMins >= 12 * 60 && slot.startMins < 17 * 60) period = 'afternoon';
      else if (slot.startMins >= 17 * 60) period = 'evening';

      const [eH, eM] = end.split(':').map(Number);
      const slotEndObj = new Date(`${selectedDate}T00:00:00`);
      slotEndObj.setHours(eH, eM, 0, 0);
      const isPast = slotEndObj.getTime() <= timeService.getNowMs();

      const matchedBooking = slot.booking;
      const isOccupied = Boolean(matchedBooking);

      const isMyBooking = Boolean(
        matchedBooking &&
        currentUser &&
        (
          (matchedBooking.user?.id && currentUser.id && Number(matchedBooking.user.id) === Number(currentUser.id)) ||
          (matchedBooking.user?.username && currentUser.username && matchedBooking.user.username.trim().toLowerCase() === currentUser.username.trim().toLowerCase()) ||
          (matchedBooking.user?.email && currentUser.email && matchedBooking.user.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
        )
      );

      const isAvailable = !isPast && !isOccupied && !isYardMaintenance;

      return {
        index,
        start,
        end,
        label: `${start} - ${end}`,
        durationHours,
        period,
        startMins: slot.startMins,
        endMins: slot.endMins,
        isPast,
        isOccupied,
        isMyBooking,
        isAvailable,
        matchedBooking,
      };
    });
  }, [selectedDate, openTime, closeTime, paidBookings, yard.id, yard.status, currentUser]);

  const basePrice = Number(yard.price || 0);
  const discountPercent = yard.sale?.discountPercent || 0;
  const finalPricePerHour = discountPercent > 0
    ? basePrice * (1 - discountPercent / 100)
    : basePrice;

  // Toggle slot selection
  const handleToggleSlot = (index: number) => {
    const targetSlot = evaluatedSlots[index];
    if (!targetSlot || !targetSlot.isAvailable) return;

    setSelectedSlotIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Helper to merge contiguous (e.g. 12:00-13:00 + 13:00-14:00) or overlapping intervals into single orders
  const mergeIntervalsToOrders = (
    rawOrders: Array<{ date: string; startTime: string; endTime: string }>,
    pricePerHour: number
  ): GroupedBookingSlot[] => {
    if (rawOrders.length === 0) return [];

    const intervals = rawOrders
      .map((o) => {
        const [sH, sM] = o.startTime.split(':').map(Number);
        const [eH, eM] = o.endTime.split(':').map(Number);
        const startMins = sH * 60 + sM;
        const endMins = eH * 60 + eM;
        return { startMins, endMins, date: o.date };
      })
      .filter((o) => o.endMins > o.startMins)
      .sort((a, b) => a.startMins - b.startMins);

    if (intervals.length === 0) return [];

    const merged: Array<{ startMins: number; endMins: number; date: string }> = [];
    let current = { ...intervals[0] };

    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      // If contiguous (next.startMins === current.endMins) OR overlapping (next.startMins <= current.endMins)
      if (next.startMins <= current.endMins) {
        current.endMins = Math.max(current.endMins, next.endMins);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);

    return merged.map((m) => {
      const sH = Math.floor(m.startMins / 60);
      const sM = m.startMins % 60;
      const eH = Math.floor(m.endMins / 60);
      const eM = m.endMins % 60;

      const startStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
      const endStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
      const durationHours = (m.endMins - m.startMins) / 60;

      return {
        date: m.date || selectedDate,
        startTime: startStr,
        endTime: endStr,
        durationHours,
        price: Math.round(durationHours * pricePerHour),
        label: `${startStr} - ${endStr}`,
      };
    });
  };

  // Group selected slots: contiguous slots are merged into 1 booking order; non-contiguous slots become separate orders
  useEffect(() => {
    if (isUpdatingFromOrderEdit.current) {
      isUpdatingFromOrderEdit.current = false;
      return;
    }

    if (selectedSlotIndices.length === 0) {
      setCustomOrders([]);
      return;
    }

    const rawSlots = selectedSlotIndices
      .map((idx) => evaluatedSlots[idx])
      .filter(Boolean)
      .map((s) => ({ date: selectedDate, startTime: s.start, endTime: s.end }));

    const mergedGroups = mergeIntervalsToOrders(rawSlots, finalPricePerHour);
    setCustomOrders(mergedGroups);
  }, [selectedSlotIndices, evaluatedSlots, selectedDate, finalPricePerHour]);

  const handleUpdateOrderTime = (index: number, newStart: string, newEnd: string) => {
    let [sH, sM] = newStart.split(':').map(Number);
    let [eH, eM] = newEnd.split(':').map(Number);
    const startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;

    if (endMins <= startMins) {
      endMins = Math.min(23 * 60 + 59, startMins + 60);
      eH = Math.floor(endMins / 60);
      eM = endMins % 60;
      newEnd = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
    }

    const updatedRaw = [...customOrders];
    updatedRaw[index] = {
      ...updatedRaw[index],
      startTime: newStart,
      endTime: newEnd,
    };

    const mergedOrders = mergeIntervalsToOrders(updatedRaw, finalPricePerHour);
    setCustomOrders(mergedOrders);

    const coveredIndices: number[] = [];
    evaluatedSlots.forEach((slot) => {
      if (!slot.isAvailable) return;
      const [slotSH, slotSM] = slot.start.split(':').map(Number);
      const [slotEH, slotEM] = slot.end.split(':').map(Number);
      const slotStartMins = slotSH * 60 + slotSM;
      const slotEndMins = slotEH * 60 + slotEM;

      const isCovered = mergedOrders.some((order) => {
        const [ordSH, ordSM] = order.startTime.split(':').map(Number);
        const [ordEH, ordEM] = order.endTime.split(':').map(Number);
        const ordStartMins = ordSH * 60 + ordSM;
        const ordEndMins = ordEH * 60 + ordEM;

        return slotStartMins < ordEndMins && slotEndMins > ordStartMins;
      });

      if (isCovered) {
        coveredIndices.push(slot.index);
      }
    });

    isUpdatingFromOrderEdit.current = true;
    setSelectedSlotIndices(coveredIndices);
  };

  const handleRemoveOrder = (index: number) => {
    const updatedOrders = customOrders.filter((_, i) => i !== index);
    const mergedOrders = mergeIntervalsToOrders(updatedOrders, finalPricePerHour);
    setCustomOrders(mergedOrders);

    if (mergedOrders.length === 0) {
      setSelectedSlotIndices([]);
      return;
    }

    const coveredIndices: number[] = [];
    evaluatedSlots.forEach((slot) => {
      if (!slot.isAvailable) return;
      const [slotSH, slotSM] = slot.start.split(':').map(Number);
      const [slotEH, slotEM] = slot.end.split(':').map(Number);
      const slotStartMins = slotSH * 60 + slotSM;
      const slotEndMins = slotEH * 60 + slotEM;

      const isCovered = mergedOrders.some((order) => {
        const [ordSH, ordSM] = order.startTime.split(':').map(Number);
        const [ordEH, ordEM] = order.endTime.split(':').map(Number);
        const ordStartMins = ordSH * 60 + ordSM;
        const ordEndMins = ordEH * 60 + ordEM;

        return slotStartMins < ordEndMins && slotEndMins > ordStartMins;
      });

      if (isCovered) {
        coveredIndices.push(slot.index);
      }
    });

    isUpdatingFromOrderEdit.current = true;
    setSelectedSlotIndices(coveredIndices);
  };

  const formatDurationText = (hours: number): string => {
    if (hours <= 0) return '0 phút';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} tiếng`;
    return `${h} tiếng ${m} phút`;
  };

  const getSlotGroupBadge = (slotStart: string, slotEnd: string) => {
    if (customOrders.length <= 1) return null;
    const [sH, sM] = slotStart.split(':').map(Number);
    const [eH, eM] = slotEnd.split(':').map(Number);
    const slotStartMins = sH * 60 + sM;
    const slotEndMins = eH * 60 + eM;

    const groupIdx = customOrders.findIndex((g) => {
      const [ordSH, ordSM] = g.startTime.split(':').map(Number);
      const [ordEH, ordEM] = g.endTime.split(':').map(Number);
      const ordStartMins = ordSH * 60 + ordSM;
      const ordEndMins = ordEH * 60 + ordEM;

      return slotStartMins < ordEndMins && slotEndMins > ordStartMins;
    });

    return groupIdx !== -1 ? `Đơn ${groupIdx + 1}` : null;
  };

  const totalSelectedHours = customOrders.reduce((sum, g) => sum + g.durationHours, 0);
  const totalCombinedPrice = customOrders.reduce((sum, g) => sum + g.price, 0);

  const handleConfirmAllOrders = () => {
    if (customOrders.length === 0) return;

    if (onBookMultipleSlots) {
      onBookMultipleSlots(customOrders);
    } else if (onBookTimeSlot && customOrders.length === 1) {
      onBookTimeSlot(
        selectedDate,
        customOrders[0].startTime,
        customOrders[0].endTime
      );
    }
  };

  // Format date display for header
  const formattedSelectedDateDisplay = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const isUnderMaintenance = String(yard.status || '').toLowerCase().trim() === 'maintenance';

  const renderSlotButton = (s: (typeof evaluatedSlots)[0]) => {
    const isSelected = selectedSlotIndices.includes(s.index);
    const groupBadge = isSelected ? getSlotGroupBadge(s.start, s.end) : null;

    let buttonClass = 'bg-white border-[#E6E2D8] text-[#1E3932] hover:border-[#006241] hover:bg-emerald-50/50 cursor-pointer';
    let subLabel = 'Còn trống';
    let subLabelClass = 'font-medium text-[#6F7E72]';

    if (isSelected) {
      buttonClass = 'bg-[#1E3932] border-emerald-500 text-white shadow-md ring-2 ring-emerald-400 scale-[1.02]';
      subLabel = groupBadge ? `${groupBadge} • Đang chọn` : 'Đang chọn';
      subLabelClass = 'font-bold text-emerald-300';
    } else if (isUnderMaintenance) {
      buttonClass = 'bg-rose-50/70 border-rose-200 text-rose-400 opacity-60 cursor-not-allowed';
      subLabel = 'Bảo trì';
      subLabelClass = 'font-medium text-rose-500';
    } else if (s.isPast) {
      buttonClass = 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed';
      subLabel = s.isMyBooking ? 'Bạn đã đặt (Hết giờ)' : (s.isOccupied ? 'Đã đặt (Hết giờ)' : 'Hết giờ');
      subLabelClass = 'font-medium text-slate-400';
    } else if (s.isMyBooking) {
      buttonClass = 'bg-sky-50 border-sky-300 text-sky-900 ring-2 ring-sky-400/40 shadow-xs cursor-not-allowed font-extrabold';
      subLabel = 'Bạn đã đặt';
      subLabelClass = 'font-black text-sky-700 uppercase tracking-tight';
    } else if (s.isOccupied) {
      buttonClass = 'bg-rose-50 border-rose-200 text-rose-700 opacity-60 cursor-not-allowed';
      subLabel = 'Đã đặt';
      subLabelClass = 'font-medium text-rose-600';
    }

    return (
      <button
        key={s.start}
        type="button"
        disabled={!s.isAvailable}
        onClick={() => handleToggleSlot(s.index)}
        className={`p-2.5 rounded-xl border text-center transition-all font-mono text-xs font-bold flex flex-col items-center justify-center gap-0.5 relative ${buttonClass}`}
        title={
          s.isMyBooking
            ? `Bạn đã giữ lịch khung giờ ${s.label}`
            : s.isAvailable
              ? 'Bấm để chọn / bỏ chọn khung giờ này'
              : undefined
        }
      >
        <span className="flex items-center gap-1">
          {s.isMyBooking && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 inline shrink-0" />}
          <span>{s.label}</span>
        </span>
        <span className={`text-[10px] font-sans ${subLabelClass}`}>
          {subLabel}
        </span>
      </button>
    );
  };

  const yardExistingBookingIntervals = useMemo(() => {
    return evaluatedSlots
      .filter((s) => s.isOccupied)
      .map((s) => ({
        startTime: s.start,
        endTime: s.end,
        status: s.matchedBooking?.status,
      }));
  }, [evaluatedSlots]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Prominent Maintenance Alert Banner */}
      {isUnderMaintenance && (
        <div className="p-5 sm:p-6 rounded-[28px] bg-rose-50 border-2 border-rose-200 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase font-mono tracking-wider">
                TẠM DỪNG TIẾP NHẬN ĐẶT LỊCH
              </span>
            </div>
            <h4 className="text-base font-black text-rose-950">
              Sân Này Hiện Đang Trong Thời Gian Tạm Đóng Bảo Trì & Nâng Cấp
            </h4>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              Cơ sở đang bảo dưỡng định kỳ và hoàn thiện cơ sở vật chất. Tất cả khung giờ thi đấu của sân đang tạm khóa. Quý khách vui lòng tham khảo các sân khác trong cụm sân hoặc liên hệ trực tiếp hotline chủ sân.
            </p>
          </div>
        </div>
      )}

      {/* Date Strip Header & Full Calendar Picker */}
      <div className="bg-[#FBF8F0] p-5 sm:p-6 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6E2D8]/60">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1E3932] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#006241]" />
              <span>Chọn Ngày & Khung Giờ Đặt Sân</span>
            </h3>
            <p className="text-xs text-[#6F7E72] mt-0.5">
              Đang xem lịch ngày: <span className="font-extrabold text-[#006241] capitalize">{formattedSelectedDateDisplay}</span> • <span className="text-emerald-700 font-semibold">Hỗ trợ chọn & tuỳ chỉnh nhiều khung giờ</span>
            </p>
          </div>

          {/* Custom Calendar Date Picker Control */}
          <div className="flex flex-wrap items-center gap-2.5">
            <CustomCalendarPicker
              selectedDate={selectedDate}
              minDate={todayStr}
              onSelectDate={handleCustomDateChange}
            />

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={handleResetToday}
                className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-[#006241] text-[#006241] hover:text-white border border-emerald-200 text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
              >
                Về Hôm Nay
              </button>
            )}
          </div>
        </div>

        {/* Legend indicator */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1 text-xs font-semibold text-[#1E3932]">
          <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold">
            Chọn nhanh 7 ngày:
          </span>

          <div className="flex items-center flex-wrap gap-3">
            {isUnderMaintenance ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Toàn bộ sân đang bảo trì</span>
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006241]" />
                  <span className="text-xs">Sân trống</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200" />
                  <span className="text-xs font-extrabold text-sky-800">Sân của bạn</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs">Đã có người đặt</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="text-xs">Đã qua giờ</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 7 Days Button Carousel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {days.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setSelectedSlotIndices([]);
                  setCustomOrders([]);
                }}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${isSelected
                  ? 'bg-[#006241] border-[#006241] text-white shadow-md scale-102 ring-2 ring-emerald-400/30'
                  : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB] hover:border-[#006241]/40'
                  }`}
              >
                <span
                  className={`text-[11px] font-bold ${isSelected ? 'text-emerald-200' : 'text-[#6F7E72]'
                    }`}
                >
                  {d.dayName}
                </span>
                <span className="text-sm font-black font-mono">{d.label}</span>
                {d.isToday && (
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-[#006241]'
                      }`}
                  >
                    Hôm nay
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Morning Slots */}
        <div className="bg-[#FBF8F0] p-5 rounded-[24px] border border-[#E6E2D8] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D8]/60">
            <span className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Buổi Sáng ({openTime < '12:00' ? openTime : '06:00'} – 12:00)</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] bg-white px-2 py-0.5 rounded-full border border-[#E6E2D8]">
              {evaluatedSlots.filter((s) => s.period === 'morning').length} Khung
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {evaluatedSlots.filter((s) => s.period === 'morning').length > 0 ? (
              evaluatedSlots
                .filter((s) => s.period === 'morning')
                .map((s) => renderSlotButton(s))
            ) : (
              <div className="col-span-2 py-6 text-center text-xs font-semibold text-[#6F7E72]">
                Không có khung giờ sáng
              </div>
            )}
          </div>
        </div>

        {/* Afternoon Slots */}
        <div className="bg-[#FBF8F0] p-5 rounded-[24px] border border-[#E6E2D8] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D8]/60">
            <span className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Buổi Chiều (12:00 – 17:00)</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] bg-white px-2 py-0.5 rounded-full border border-[#E6E2D8]">
              {evaluatedSlots.filter((s) => s.period === 'afternoon').length} Khung
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {evaluatedSlots.filter((s) => s.period === 'afternoon').length > 0 ? (
              evaluatedSlots
                .filter((s) => s.period === 'afternoon')
                .map((s) => renderSlotButton(s))
            ) : (
              <div className="col-span-2 py-6 text-center text-xs font-semibold text-[#6F7E72]">
                Không có khung giờ chiều
              </div>
            )}
          </div>
        </div>

        {/* Evening Slots */}
        <div className="bg-[#FBF8F0] p-5 rounded-[24px] border border-[#E6E2D8] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D8]/60">
            <span className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buổi Tối (17:00 – {closeTime > '17:00' ? closeTime : '23:00'})</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#6F7E72] bg-white px-2 py-0.5 rounded-full border border-[#E6E2D8]">
              {evaluatedSlots.filter((s) => s.period === 'evening').length} Khung
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {evaluatedSlots.filter((s) => s.period === 'evening').length > 0 ? (
              evaluatedSlots
                .filter((s) => s.period === 'evening')
                .map((s) => renderSlotButton(s))
            ) : (
              <div className="col-span-2 py-6 text-center text-xs font-semibold text-[#6F7E72]">
                Không có khung giờ tối
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Multi-Slot Selection Summary & Order Adjustment Box */}
      {customOrders.length > 0 && !isUnderMaintenance && (
        <div className="p-6 rounded-[28px] bg-[#1E3932] text-[#FBF8F0] border border-emerald-400/30 shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                  ĐANG CHỌN {selectedSlotIndices.length} KHUNG GIỜ ({customOrders.length} ĐƠN ĐẶT SÂN)
                </span>
                <div className="text-sm sm:text-base font-extrabold text-white">
                  Ngày thi đấu: {selectedDate} ({formattedSelectedDateDisplay})
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSlotIndices([]);
                setCustomOrders([]);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-white/15"
              title="Bỏ chọn tất cả khung giờ"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bỏ Chọn Tất Cả</span>
            </button>
          </div>

          {/* Grouped Orders Cards with In-Place Time Adjustment Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {customOrders.map((order, idx) => (
              <div
                key={`custom-order-${idx}`}
                className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase font-mono tracking-wider">
                        ĐƠN {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-emerald-300 font-mono">
                        {formatDurationText(order.durationHours)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOrder(idx)}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Xoá đơn này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Interactive Time Selector for each order */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div>
                      <TimePickerInput
                        label="Giờ bắt đầu"
                        labelClassName="text-emerald-300 font-bold text-[11px]"
                        value={order.startTime}
                        onChange={(newVal) => handleUpdateOrderTime(idx, newVal, order.endTime)}
                        openingTime={openTime}
                        closingTime={closeTime}
                        date={selectedDate}
                        maxTime={order.endTime}
                        minDurationMinutes={60}
                        mode="start"
                        existingBookings={yardExistingBookingIntervals}
                        allowPast={false}
                        minuteInterval={15}
                        inputClassName="bg-white text-[#1E3932] border-white/20 shadow-xs font-black"
                      />
                    </div>

                    <div>
                      <TimePickerInput
                        label="Giờ kết thúc"
                        labelClassName="text-emerald-300 font-bold text-[11px]"
                        value={order.endTime}
                        onChange={(newVal) => handleUpdateOrderTime(idx, order.startTime, newVal)}
                        openingTime={openTime}
                        closingTime={closeTime}
                        date={selectedDate}
                        minTime={order.startTime}
                        minDurationMinutes={60}
                        mode="end"
                        existingBookings={yardExistingBookingIntervals}
                        allowPast={false}
                        minuteInterval={15}
                        inputClassName="bg-white text-[#1E3932] border-white/20 shadow-xs font-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs font-mono">
                  <span className="text-gray-300">Thành tiền:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {order.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action & Combined Total */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div>
              <span className="text-[11px] font-mono text-gray-300 uppercase block">
                Tổng Cộng ({customOrders.length} Đơn • {formatDurationText(totalSelectedHours)})
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {totalCombinedPrice.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmAllOrders}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#006241] hover:bg-emerald-600 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all cursor-pointer border border-emerald-400/40 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {customOrders.length === 1
                  ? 'TIẾN HÀNH ĐẶT 1 ĐƠN NÀY'
                  : `TIẾN HÀNH ĐẶT ${customOrders.length} ĐƠN SÂN`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
