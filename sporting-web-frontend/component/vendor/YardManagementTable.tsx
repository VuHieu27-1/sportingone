import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Grid as GridIcon,
  List as ListIcon,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trophy,
  Tag,
  Building2,
  MoreVertical,
  Camera,
  Eye,
  ExternalLink,
  Layers,
  Search,
  X,
  Clock,
  User as UserIcon,
  Zap,
  Activity,
  Image as ImageIcon,
  CalendarDays,
  Calendar,
  Phone,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendVendor, BackendYardItem, vendorService } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';
import { CustomSelect } from '../common/CustomSelect';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import { CompactTableImageCarousel } from '../common/CompactTableImageCarousel';

export interface YardBookedSlot {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  phone?: string;
  orderCode?: string;
  price?: number | string;
  isToday: boolean;
  isCurrent: boolean;
  isPast: boolean;
}

export interface YardScheduleSummary {
  activeBooking?: YardBookedSlot;
  todayUpcoming: YardBookedSlot[];
  futureBookings: YardBookedSlot[];
  allUpcoming: YardBookedSlot[];
  totalUpcomingCount: number;
  allSlots: YardBookedSlot[];
}

export interface YardRealtimeInfo {
  status: 'occupied' | 'available' | 'maintenance';
  badgeLabel: string;
  badgeClass: string;
  dotColor: string;
  activeBooking?: {
    startTime: string;
    endTime: string;
    customerName: string;
    phone?: string;
  };
  nextBooking?: {
    startTime: string;
    endTime: string;
    customerName: string;
  };
  summaryText: string;
  schedule: YardScheduleSummary;
}

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const d = new Date();
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${min}`;
};

export const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export const formatDateFullVietnamese = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const clean = dateStr.slice(0, 10);
    const d = new Date(clean + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Sau', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Robust helper to extract date (YYYY-MM-DD), time (HH:mm) and total minutes from any timestamp format
 */
export function extractDateAndMinutes(
  timeVal: string | Date | undefined,
  fallbackDate?: string
): { dateStr: string; timeStr: string; minutes: number } {
  if (!timeVal) {
    const fb = fallbackDate ? String(fallbackDate).slice(0, 10) : getTodayDateStr();
    return { dateStr: fb, timeStr: '00:00', minutes: 0 };
  }

  // Pure time string like "08:00" or "08:00:00"
  if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal.trim())) {
    const parts = timeVal.trim().split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const fb = fallbackDate ? String(fallbackDate).slice(0, 10) : getTodayDateStr();
    return {
      dateStr: fb,
      timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      minutes: h * 60 + m,
    };
  }

  const d = new Date(timeVal);
  if (isNaN(d.getTime())) {
    const str = String(timeVal);
    const dateMatch = str.match(/\d{4}-\d{2}-\d{2}/);
    const timeMatch = str.match(/\d{2}:\d{2}/);
    const dateStr = dateMatch ? dateMatch[0] : (fallbackDate ? String(fallbackDate).slice(0, 10) : getTodayDateStr());
    const timeStr = timeMatch ? timeMatch[0] : '00:00';
    const parts = timeStr.split(':').map(Number);
    return { dateStr, timeStr, minutes: (parts[0] || 0) * 60 + (parts[1] || 0) };
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hours}:${minutes}`,
    minutes: d.getHours() * 60 + d.getMinutes(),
  };
}

export const getYardBookedSlots = (
  yardId: number,
  bookings: BackendBooking[] = []
): YardScheduleSummary => {
  const today = getTodayDateStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const targetYardId = Number(yardId);

  // Filter valid bookings for this yard (hourly and monthly) with deduplication
  const bookingMap = new Map<string, BackendBooking>();
  bookings.forEach((b) => {
    const bYardId = Number(b.yard?.id || (b as any).yardId || (b as any).yard_id);
    if (bYardId !== targetYardId) return;
    const status = String(b.status || '').toLowerCase().trim();
    // Exclude cancelled / rejected / refunded
    if (
      status === 'paid' ||
      status === 'confirmed' ||
      status === 'completed' ||
      status === 'pending_paid' ||
      status === 'unpaid'
    ) {
      const isMonthly = Boolean(
        b.startDate ||
        (b as any).bookingType === 'month' ||
        (b as any).itemType === 'monthly'
      );
      const key = (isMonthly ? 'bm_' : 'bk_') + b.id;
      bookingMap.set(key, b);
    }
  });

  const validBookings = Array.from(bookingMap.values());
  const slots: YardBookedSlot[] = [];
  const slotKeySet = new Set<string>();

  validBookings.forEach((b) => {
    const customerName =
      (b.user as any)?.fullName ||
      b.user?.username ||
      (b as any).customerName ||
      'Khách Đặt Sân';
    const phone = (b.user as any)?.phone;
    const orderCode = (b as any).orderCode || (b as any).order_code || `#BK-${b.id}`;
    const price = b.priced || (b as any).totalPrice || (b as any).price;

    const isMonthly = Boolean(
      b.startDate ||
      (b as any).bookingType === 'month' ||
      (b as any).itemType === 'monthly'
    );

    if (isMonthly && b.startDate && b.endDate) {
      // Monthly booking covers a date range
      const startDStr = String(b.startDate).slice(0, 10);
      const endDStr = String(b.endDate).slice(0, 10);
      const startTimeParsed = extractDateAndMinutes(b.startTime, startDStr);
      const endTimeParsed = extractDateAndMinutes(b.endTime, endDStr);

      const cur = new Date(`${today}T00:00:00`);
      const maxDate = new Date(`${today}T00:00:00`);
      maxDate.setDate(maxDate.getDate() + 30); // Lookahead 30 days
      const endDateObj = new Date(`${endDStr}T23:59:59`);

      while (cur <= maxDate && cur <= endDateObj) {
        const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (dStr >= startDStr && dStr <= endDStr) {
          const isToday = dStr === today;
          const isCurrent =
            isToday &&
            nowMin >= startTimeParsed.minutes &&
            nowMin < endTimeParsed.minutes;
          const isPast =
            dStr < today || (isToday && endTimeParsed.minutes <= nowMin);

          const slotKey = `${dStr}_${startTimeParsed.timeStr}_${endTimeParsed.timeStr}_#BM-${b.id}`;
          if (!slotKeySet.has(slotKey)) {
            slotKeySet.add(slotKey);
            slots.push({
              id: Number(b.id) * 1000 + cur.getDate(),
              date: dStr,
              startTime: startTimeParsed.timeStr,
              endTime: endTimeParsed.timeStr,
              status: b.status,
              customerName: `${customerName} (Gói Tháng)`,
              phone,
              orderCode: `#BM-${b.id}`,
              price,
              isToday,
              isCurrent,
              isPast,
            });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Hourly / Daily booking
      const startParsed = extractDateAndMinutes(b.startTime, (b as any).date || (b as any).startDate || b.createdAt);
      const endParsed = extractDateAndMinutes(b.endTime, startParsed.dateStr);
      const dateStr = startParsed.dateStr || today;

      const isToday = dateStr === today;
      const isCurrent = isToday && nowMin >= startParsed.minutes && nowMin < endParsed.minutes;
      const isPast = dateStr < today || (isToday && endParsed.minutes <= nowMin);

      const slotKey = `${dateStr}_${startParsed.timeStr}_${endParsed.timeStr}_${orderCode}`;
      if (!slotKeySet.has(slotKey)) {
        slotKeySet.add(slotKey);
        slots.push({
          id: Number(b.id),
          date: dateStr,
          startTime: startParsed.timeStr,
          endTime: endParsed.timeStr,
          status: b.status,
          customerName,
          phone,
          orderCode,
          price,
          isToday,
          isCurrent,
          isPast,
        });
      }
    }
  });

  // Sort chronologically (date ASC, then startTime ASC)
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const activeBooking = slots.find((s) => s.isCurrent);
  const todayUpcoming = slots.filter((s) => s.isToday && !s.isPast && !s.isCurrent);
  const futureBookings = slots.filter((s) => s.date > today);
  const allUpcoming = [
    ...(activeBooking ? [activeBooking] : []),
    ...todayUpcoming,
    ...futureBookings,
  ];

  return {
    activeBooking,
    todayUpcoming,
    futureBookings,
    allUpcoming,
    totalUpcomingCount: allUpcoming.length,
    allSlots: slots,
  };
};

export const calculateYardRealtimeStatus = (
  yard: BackendYardItem,
  bookings: BackendBooking[] = []
): YardRealtimeInfo => {
  const schedule = getYardBookedSlots(yard.id, bookings);

  if (String(yard.status || '').toLowerCase().trim() === 'maintenance') {
    return {
      status: 'maintenance',
      badgeLabel: 'Bảo Trì',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotColor: 'bg-amber-500',
      summaryText: 'Tạm ngưng phục vụ để bảo dưỡng',
      schedule,
    };
  }

  if (schedule.activeBooking) {
    const active = schedule.activeBooking;
    return {
      status: 'occupied',
      badgeLabel: 'Đang Có Khách',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      dotColor: 'bg-rose-600',
      activeBooking: {
        startTime: active.startTime,
        endTime: active.endTime,
        customerName: active.customerName,
        phone: active.phone,
      },
      summaryText: `Ca ${active.startTime} - ${active.endTime} • ${active.customerName}`,
      schedule,
    };
  }

  if (schedule.todayUpcoming.length > 0) {
    const nextB = schedule.todayUpcoming[0];
    return {
      status: 'available',
      badgeLabel: 'Sẵn Sàng',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-600',
      nextBooking: {
        startTime: nextB.startTime,
        endTime: nextB.endTime,
        customerName: nextB.customerName,
      },
      summaryText: `Trống đến ${nextB.startTime} (Ca tiếp: ${nextB.startTime} - ${nextB.endTime})`,
      schedule,
    };
  }

  if (schedule.futureBookings.length > 0) {
    const nextFuture = schedule.futureBookings[0];
    return {
      status: 'available',
      badgeLabel: 'Sẵn Sàng',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-600',
      summaryText: `Hôm nay trống • Có lịch đặt ngày ${formatDateShort(nextFuture.date)}`,
      schedule,
    };
  }

  return {
    status: 'available',
    badgeLabel: 'Sẵn Sàng',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotColor: 'bg-emerald-600',
    summaryText: 'Đang trống • Sẵn sàng nhận khách cả ngày',
    schedule,
  };
};

/**
 * Modern Interactive Modal displaying all booked time slots for a specific yard
 */
const YardScheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  yard: BackendYardItem | null;
  bookings: BackendBooking[];
}> = ({ isOpen, onClose, yard, bookings }) => {
  const [filterTab, setFilterTab] = useState<'upcoming' | 'today' | 'future' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  const [modalTick, setModalTick] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isOpen) {
      setFilterTab('upcoming');
      setSearchTerm('');
    }
  }, [isOpen]);

  // Live clock tick every 10s while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setModalTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Always call all hooks unconditionally before any early return to strictly follow React Rules of Hooks
  const schedule = useMemo(() => {
    if (!yard) {
      return {
        todayUpcoming: [],
        futureBookings: [],
        allUpcoming: [],
        totalUpcomingCount: 0,
        allSlots: [],
      };
    }
    return getYardBookedSlots(yard.id, bookings);
  }, [yard, bookings, modalTick]);

  if (!isOpen || !yard) return null;

  const todayStr = getTodayDateStr();

  let displayedSlots = schedule.allSlots;
  if (filterTab === 'upcoming') {
    displayedSlots = schedule.allUpcoming;
  } else if (filterTab === 'today') {
    displayedSlots = schedule.allSlots.filter((s) => s.isToday);
  } else if (filterTab === 'future') {
    displayedSlots = schedule.futureBookings;
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase().trim();
    displayedSlots = displayedSlots.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.orderCode && s.orderCode.toLowerCase().includes(q)) ||
        s.date.includes(q) ||
        s.startTime.includes(q)
    );
  }

  // Group slots by date
  const groupedByDate = displayedSlots.reduce<Record<string, YardBookedSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedByDate).sort();

  const sportName =
    yard.sportType?.sportName || (yard as any).sport_type?.sportName || 'Thể thao';
  const typeName =
    yard.typeYard?.typeName || (yard as any).type_yard?.typeName || 'Sân tiêu chuẩn';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="relative z-10 w-full max-w-2xl bg-white rounded-3xl border border-[#E6E2D8] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b border-[#E6E2D8] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#006241]/10 text-[#006241] font-mono font-black text-[11px] uppercase">
                ID: YARD-{yard.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {sportName}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#F2F0EB] text-[#1E3932] font-semibold text-[11px]">
                {typeName}
              </span>
            </div>
            <h3 id="schedule-modal-title" className="text-xl font-black text-[#1E3932] tracking-tight">
              Lịch Đặt Sân: {yard.yardName}
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium">
              Quản lý chi tiết tất cả khung giờ khách đã đặt sân hôm nay và các ngày tương lai
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick KPI Stat Strip */}
        <div className="px-5 sm:px-6 py-3 bg-white border-b border-[#F2F0EB] grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-center">
            <div className="text-[10px] font-bold uppercase text-[#6F7E72]">Sắp Tới</div>
            <div className="text-base font-black text-[#006241] font-mono">
              {schedule.totalUpcomingCount} ca
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-center">
            <div className="text-[10px] font-bold uppercase text-amber-800">Hôm Nay</div>
            <div className="text-base font-black text-amber-900 font-mono">
              {(schedule.activeBooking ? 1 : 0) + schedule.todayUpcoming.length} ca
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-center">
            <div className="text-[10px] font-bold uppercase text-blue-800">Ngày Tới</div>
            <div className="text-base font-black text-blue-900 font-mono">
              {schedule.futureBookings.length} ca
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 sm:px-6 bg-white border-b border-[#F2F0EB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E2D8] text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'upcoming'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              Sắp tới ({schedule.totalUpcomingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'today'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              Hôm nay ({(schedule.activeBooking ? 1 : 0) + schedule.todayUpcoming.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('future')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'future'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              Tương lai ({schedule.futureBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              Tất cả ({schedule.allSlots.length})
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm khách, giờ, SĐT..."
              className="w-full h-8 pl-8 pr-7 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] placeholder-[#6F7E72]/70 focus:outline-none focus:ring-1 focus:ring-[#006241]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#6F7E72] hover:text-[#1E3932]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Schedule Slot List Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FAF8F5]/50">
          {dateKeys.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-white rounded-2xl border border-[#E6E2D8] p-6">
              <Calendar className="w-10 h-10 text-[#6F7E72]/40 mx-auto" />
              <h4 className="text-sm font-extrabold text-[#1E3932]">Không có khung giờ nào</h4>
              <p className="text-xs text-[#6F7E72]">
                {searchTerm
                  ? 'Không tìm thấy kết quả phù hợp với từ khóa.'
                  : 'Chưa có lịch đặt nào cho khoảng thời gian này.'}
              </p>
            </div>
          ) : (
            dateKeys.map((dateKey) => {
              const isDateToday = dateKey === todayStr;
              const dateSlots = groupedByDate[dateKey];

              return (
                <div key={dateKey} className="space-y-2.5">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 px-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isDateToday
                          ? 'bg-[#006241] text-white shadow-xs'
                          : 'bg-[#E6E2D8] text-[#1E3932]'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{isDateToday ? 'Hôm nay' : formatDateShort(dateKey)}</span>
                    </span>
                    <span className="text-xs font-bold text-[#6F7E72]">
                      {formatDateFullVietnamese(dateKey)} • {dateSlots.length} ca đặt
                    </span>
                  </div>

                  {/* List of slots for this date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {dateSlots.map((slot) => {
                      return (
                        <div
                          key={slot.id}
                          className={`p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between space-y-2 ${
                            slot.isCurrent
                              ? 'bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-400/30'
                              : slot.isPast
                              ? 'bg-white/60 border-[#E6E2D8] opacity-75'
                              : 'bg-white border-[#E6E2D8] hover:border-[#006241]/40 shadow-2xs'
                          }`}
                        >
                          {/* Time & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-mono font-black text-sm text-[#1E3932]">
                              <Clock
                                className={`w-4 h-4 shrink-0 ${
                                  slot.isCurrent
                                    ? 'text-rose-600 animate-pulse'
                                    : 'text-[#006241]'
                                }`}
                              />
                              <span>
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>

                            {slot.isCurrent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                <span>Đang Chơi</span>
                              </span>
                            ) : slot.isPast ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#F2F0EB] text-[#6F7E72] font-bold text-[10px]">
                                Đã hoàn thành
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Đã thanh toán
                              </span>
                            )}
                          </div>

                          {/* Customer Details */}
                          <div className="space-y-1 text-xs pt-1 border-t border-[#F2F0EB]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-[#1E3932] truncate flex items-center gap-1">
                                <UserIcon className="w-3.5 h-3.5 text-[#6F7E72] shrink-0" />
                                <span className="truncate">{slot.customerName}</span>
                              </span>
                              <span className="text-[10px] font-mono text-[#6F7E72] shrink-0">
                                {slot.orderCode}
                              </span>
                            </div>

                            {slot.phone && (
                              <div className="flex items-center justify-between text-[11px] text-[#6F7E72]">
                                <a
                                  href={`tel:${slot.phone}`}
                                  className="inline-flex items-center gap-1 font-mono font-bold text-[#006241] hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{slot.phone}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(slot.phone || '');
                                    toast.success('Đã sao chép số điện thoại!');
                                  }}
                                  className="text-[10px] text-[#6F7E72] hover:text-[#1E3932] cursor-pointer"
                                  title="Sao chép SĐT"
                                >
                                  Sao chép
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E6E2D8] flex items-center justify-between shrink-0">
          <span className="text-xs text-[#6F7E72] font-semibold">
            Tổng cộng: <strong className="text-[#1E3932]">{displayedSlots.length}</strong> ca đặt được hiển thị
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#006241] text-white font-bold text-xs hover:bg-[#004d33] transition-colors cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const YardItemActionMenu: React.FC<{
  yard: BackendYardItem;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onEditYard: (yard: BackendYardItem, tab?: 'info' | 'images' | 'preview') => void;
  onDeleteYard: (yard: BackendYardItem) => void;
  onQuickToggleStatus: (yard: BackendYardItem) => void;
  onViewSchedule: (yard: BackendYardItem) => void;
  disabled: boolean;
}> = ({
  yard,
  openId,
  setOpenId,
  onEditYard,
  onDeleteYard,
  onQuickToggleStatus,
  onViewSchedule,
  disabled,
}) => {
  const menuKey = `yard-${yard.id}`;
  const isOpen = openId === menuKey;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(8, window.innerWidth - rect.right);

    if (spaceBelow < 280) {
      setPos({ bottom: window.innerHeight - rect.top + 6, right });
    } else {
      setPos({ top: rect.bottom + 6, right });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) recalcPos();
    setOpenId(isOpen ? null : menuKey);
  };

  useEffect(() => {
    if (!isOpen) return;
    const sync = () => recalcPos();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [isOpen, recalcPos]);

  const isMaintenance = String(yard.status || '').toLowerCase().trim() === 'maintenance';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#1E3932] border border-[#E6E2D8] flex items-center justify-center shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        title="Thao tác sân"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4 text-[#1E3932]" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
            <div
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7E72] border-b border-[#F2F0EB] truncate">
                {yard.yardName}
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onViewSchedule(yard);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#006241] bg-emerald-50/50 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Xem Lịch Đặt Sân</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onEditYard(yard, 'info');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Sửa Thông Tin & Giá</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onEditYard(yard, 'images');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Quản Lý Ảnh Thực Tế</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onEditYard(yard, 'preview');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Xem Trước Hiển Thị</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onQuickToggleStatus(yard);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  isMaintenance
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>{isMaintenance ? 'Mở Lại Sân Sẵn Sàng' : 'Đặt Sang Bảo Trì'}</span>
              </button>

              <div className="h-px bg-[#F2F0EB] mx-2" />

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  window.open(`/yard/${yard.id}`, '_blank');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#6F7E72] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Mở Trang Đặt Sân</span>
              </button>

              <div className="h-px bg-[#F2F0EB] mx-2" />

              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onDeleteYard(yard);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Xóa Sân Con</span>
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export interface YardManagementTableProps {
  selectedVendor: BackendVendor | null;
  yards: BackendYardItem[];
  bookings?: BackendBooking[];
  isLoading: boolean;
  onAddYard: () => void;
  onEditYard: (yard: BackendYardItem, tab?: 'info' | 'images' | 'preview') => void;
  onDeleteYard: (yard: BackendYardItem) => void;
  onRefreshYards: () => void;
}

export const YardManagementTable: React.FC<YardManagementTableProps> = ({
  selectedVendor,
  yards,
  bookings = [],
  isLoading,
  onAddYard,
  onEditYard,
  onDeleteYard,
  onRefreshYards,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedYardForSchedule, setSelectedYardForSchedule] = useState<BackendYardItem | null>(null);
  const [viewMode, setViewModeState] = useState<'grid' | 'table'>(() => {
    try {
      const saved = sessionStorage.getItem('sporting_vendor_yards_view_mode');
      if (saved === 'table' || saved === 'grid') return saved;
    } catch {}
    return 'grid';
  });

  const setViewMode = (mode: 'grid' | 'table') => {
    setViewModeState(mode);
    try {
      sessionStorage.setItem('sporting_vendor_yards_view_mode', mode);
    } catch {}
  };

  const [filterSport, setFilterSportState] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('sport');
      if (urlVal) return urlVal;
      const saved = sessionStorage.getItem('sporting_vendor_yards_sport_filter');
      if (saved) return saved;
    } catch {}
    return 'ALL';
  });

  const [filterRealtimeStatus, setFilterRealtimeStatus] = useState<'ALL' | 'occupied' | 'available' | 'maintenance'>('ALL');
  const [isTogglingStatusId, setIsTogglingStatusId] = useState<number | null>(null);

  const setFilterSport = (sport: string) => {
    setFilterSportState(sport);
    try {
      sessionStorage.setItem('sporting_vendor_yards_sport_filter', sport);
      const url = new URL(window.location.href);
      if (sport === 'ALL') {
        url.searchParams.delete('sport');
      } else {
        url.searchParams.set('sport', sport);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const isVendorActive = selectedVendor ? selectedVendor.status === 'active' : true;

  // Local clock tick every 10s to dynamically recalculate realtime status as real-time progresses
  const [clockTick, setClockTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute realtime status for all yards
  const yardsWithRealtime = useMemo(() => {
    return yards.map((yard) => ({
      yard,
      rt: calculateYardRealtimeStatus(yard, bookings),
    }));
  }, [yards, bookings, clockTick]);

  // Overall Statistics for top bar
  const stats = useMemo(() => {
    const total = yardsWithRealtime.length;
    const occupied = yardsWithRealtime.filter((item) => item.rt.status === 'occupied').length;
    const available = yardsWithRealtime.filter((item) => item.rt.status === 'available').length;
    const maintenance = yardsWithRealtime.filter((item) => item.rt.status === 'maintenance').length;
    return { total, occupied, available, maintenance };
  }, [yardsWithRealtime]);

  const availableSports = useMemo(() => {
    return Array.from(
      new Set(
        yards
          .map((y) => y.sportType?.sportName || (y as any).sport_type?.sportName || '')
          .filter(Boolean)
      )
    );
  }, [yards]);

  const filteredYards = useMemo(() => {
    return yards.filter((yard) => {
      if (filterSport !== 'ALL') {
        const sName = yard.sportType?.sportName || (yard as any).sport_type?.sportName || '';
        if (sName !== filterSport) return false;
      }
      if (filterRealtimeStatus !== 'ALL') {
        const rt = calculateYardRealtimeStatus(yard, bookings);
        if (rt.status !== filterRealtimeStatus) return false;
      }
      return true;
    });
  }, [yards, filterSport, filterRealtimeStatus, bookings, clockTick]);

  const {
    paginatedData,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortField,
    sortDirection,
    handleSort,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    setColumnFilter,
    clearColumnFilters,
  } = useDataTable<BackendYardItem>({
    data: filteredYards,
    initialPageSize: 12,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: [
      'id',
      'yardName',
      (y) => y.sportType?.sportName || (y as any).sport_type?.sportName || '',
      (y) => y.typeYard?.typeName || (y as any).type_yard?.typeName || '',
    ],
    sortAccessors: {
      sportType: (y) => y.sportType?.sportName || (y as any).sport_type?.sportName || '',
      typeYard: (y) => y.typeYard?.typeName || (y as any).type_yard?.typeName || '',
      price: (y) => Number(y.price || 0),
    },
  });

  const handleQuickToggleStatus = async (yard: BackendYardItem) => {
    if (isTogglingStatusId) return;
    setIsTogglingStatusId(yard.id);
    const isMaintenance = String(yard.status || '').toLowerCase().trim() === 'maintenance';
    const nextStatus = isMaintenance ? 'active' : 'maintenance';

    try {
      const res = await vendorService.updateYard(yard.id, { status: nextStatus } as any);
      if (res.success) {
        toast.success(
          nextStatus === 'maintenance'
            ? `Đã chuyển sân "${yard.yardName}" sang trạng thái BẢO TRÌ.`
            : `Đã mở lại sân "${yard.yardName}" sẵn sàng đón khách.`
        );
        onRefreshYards();
      } else {
        toast.error(res.message || 'Cập nhật trạng thái sân không thành công.');
      }
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái sân.');
    } finally {
      setIsTogglingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E6E2D8] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-[#1E3932] tracking-tight">
              Quản Lý Tình Trạng & Danh Sách Sân Con
            </h2>
            {selectedVendor && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#006241] border border-emerald-200 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-[#006241]" />
                <span>{selectedVendor.vendorName}</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-[#006241]/10 text-[#006241] font-mono font-bold text-xs">
              {yards.length} Sân
            </span>
          </div>
          <p className="text-xs text-[#6F7E72] mt-1">
            Theo dõi trực quan sân nào đang có khách chơi, sân nào trống, và các khung giờ khách đã đặt hôm nay & tương lai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefreshYards}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#006241] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>

          {isVendorActive ? (
            <button
              type="button"
              onClick={onAddYard}
              className="h-10 px-5 rounded-xl bg-[#006241] hover:bg-[#004d33] text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sân Mới</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
              Cơ sở đang chờ duyệt
            </div>
          )}
        </div>
      </div>

      {/* Stockly-style KPI Counters Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-[#1E3932]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Tổng Sân Con</div>
            <div className="text-lg font-black text-[#1E3932] font-mono leading-none mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-rose-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Đang Có Khách</div>
            <div className="text-lg font-black text-rose-700 font-mono leading-none mt-0.5 flex items-center gap-1.5">
              <span>{stats.occupied}</span>
              {stats.occupied > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Sân Trống / Sẵn Sàng</div>
            <div className="text-lg font-black text-emerald-700 font-mono leading-none mt-0.5">{stats.available}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Bảo Trì</div>
            <div className="text-lg font-black text-amber-700 font-mono leading-none mt-0.5">{stats.maintenance}</div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar with View Mode Switcher */}
      <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        {/* Search Bar */}
        <div className="relative w-full sm:w-64 md:w-72 lg:w-80 shrink-0">
          <Search className="w-4 h-4 text-[#6F7E72] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Tìm tên sân, ID sân..."
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] font-medium placeholder-[#6F7E72]/70 focus:outline-none focus:ring-2 focus:ring-[#006241]/40 focus:border-[#006241] transition-all"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6F7E72] hover:text-[#1E3932] rounded-full hover:bg-[#F2F0EB] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Group */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end flex-1">
          {/* Sport Filter */}
          <div className="w-full sm:w-48 shrink-0">
            <CustomSelect
              options={[
                { value: 'ALL', label: `Tất cả môn (${yards.length})` },
                ...availableSports.map((sport) => ({
                  value: sport,
                  label: sport,
                })),
              ]}
              value={filterSport}
              onChange={(val) => {
                setFilterSport(String(val));
                setCurrentPage(1);
              }}
              prefixLabel="Môn:"
              icon={<Trophy className="w-3.5 h-3.5 text-[#006241]" />}
              className="w-full"
              buttonClassName="h-10 rounded-xl bg-[#FAF8F5] border-[#E6E2D8] hover:bg-white text-xs font-bold"
            />
          </div>

          {/* Realtime Status Filter */}
          <div className="w-full sm:w-52 shrink-0">
            <CustomSelect
              options={[
                { value: 'ALL', label: `Tất cả trạng thái (${stats.total})` },
                { value: 'occupied', label: `Đang có khách (${stats.occupied})` },
                { value: 'available', label: `Sẵn sàng (${stats.available})` },
                { value: 'maintenance', label: `Bảo trì (${stats.maintenance})` },
              ]}
              value={filterRealtimeStatus}
              onChange={(val) => {
                setFilterRealtimeStatus(val as any);
                setCurrentPage(1);
              }}
              prefixLabel="Trạng thái:"
              icon={<Activity className="w-3.5 h-3.5 text-[#006241]" />}
              className="w-full"
              buttonClassName="h-10 rounded-xl bg-[#FAF8F5] border-[#E6E2D8] hover:bg-white text-xs font-bold"
            />
          </div>

          {/* Reset Filters */}
          {(globalSearch || filterSport !== 'ALL' || filterRealtimeStatus !== 'ALL' || Object.keys(columnFilters).length > 0) && (
            <button
              type="button"
              onClick={() => {
                setGlobalSearch('');
                setFilterSport('ALL');
                setFilterRealtimeStatus('ALL');
                clearColumnFilters();
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] border border-[#E6E2D8] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Đặt lại tất cả bộ lọc"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#006241]" />
              <span className="hidden sm:inline">Đặt Lại</span>
            </button>
          )}

          {/* View Mode Toggle Switch (Grid vs Table) */}
          <div className="flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
              title="Dạng lưới thẻ (Stockly Card Grid)"
            >
              <GridIcon className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px]">Dạng Lưới</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-[#006241] text-white shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
              title="Dạng bảng chi tiết (Table View)"
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px]">Dạng Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid vs Table View */}
      {isLoading ? (
        <div className="p-12 bg-white rounded-3xl border border-[#E6E2D8] text-center space-y-3 shadow-xs">
          <RefreshCw className="w-8 h-8 text-[#006241] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#6F7E72]">Đang tải danh sách sân con...</p>
        </div>
      ) : yards.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-[#E6E2D8] text-center space-y-3 shadow-xs">
          <Layers className="w-10 h-10 text-[#6F7E72]/40 mx-auto" />
          <h3 className="text-base font-extrabold text-[#1E3932]">Chưa có sân con nào</h3>
          <p className="text-xs text-[#6F7E72] max-w-sm mx-auto">
            Vui lòng bấm nút &quot;Thêm Sân Mới&quot; để khai báo danh sách sân bóng cho cơ sở của bạn.
          </p>
          {isVendorActive && (
            <button
              type="button"
              onClick={onAddYard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#006241] text-white font-black text-xs cursor-pointer shadow-md hover:bg-[#004d33] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sân Ngay</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ============================================================ */
        /* HÌNH 1: MODERN CARD / INVENTORY GRID (STOCKLY DESIGN STYLE) */
        /* ============================================================ */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedData.map((yard) => {
              const rt = calculateYardRealtimeStatus(yard, bookings);
              const sched = rt.schedule;
              const sportName =
                yard.sportType?.sportName ||
                (yard as any).sport_type?.sportName ||
                'Thể thao';
              const typeName =
                yard.typeYard?.typeName ||
                (yard as any).type_yard?.typeName ||
                'Sân tiêu chuẩn';
              const vendorName = yard.vendor?.vendorName || 'Cụm sân';
              const imagesList = Array.isArray(yard.images) ? yard.images : [];
              const firstImage = imagesList[0]?.imageUrl || (imagesList[0] as any)?.url;

              return (
                <div
                  key={yard.id}
                  className="bg-white rounded-[26px] border border-[#E6E2D8] p-4 flex flex-col justify-between shadow-2xs hover:shadow-lg transition-all duration-200 group hover:border-[#006241]/40 relative"
                >
                  {/* Card Top: Status Badge & 3-dot Menu */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border shadow-2xs ${rt.badgeClass}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${rt.dotColor} ${
                          rt.status === 'occupied' ? 'animate-ping' : ''
                        }`}
                      />
                      <span>{rt.badgeLabel}</span>
                    </span>

                    <YardItemActionMenu
                      yard={yard}
                      openId={openMenuId}
                      setOpenId={setOpenMenuId}
                      onEditYard={onEditYard}
                      onDeleteYard={onDeleteYard}
                      onQuickToggleStatus={handleQuickToggleStatus}
                      onViewSchedule={(y) => setSelectedYardForSchedule(y)}
                      disabled={!isVendorActive}
                    />
                  </div>

                  {/* Card Center: Yard Image Thumbnail */}
                  <div
                    onClick={() => onEditYard(yard, 'images')}
                    className="relative w-full aspect-[16/10] rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] overflow-hidden cursor-pointer group-hover:border-[#006241]/30 transition-all flex items-center justify-center mb-3"
                    title="Nhấp để tải hoặc quản lý ảnh thực tế sân"
                  >
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={yard.yardName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#6F7E72]/70 space-y-1.5 p-4 text-center">
                        <Camera className="w-7 h-7 stroke-[1.5]" />
                        <span className="text-[11px] font-bold text-[#006241] group-hover:underline">
                          + Thêm ảnh thực tế
                        </span>
                      </div>
                    )}

                    {imagesList.length > 0 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white font-mono text-[10px] font-extrabold flex items-center gap-1 border border-white/20">
                        <ImageIcon className="w-3 h-3" />
                        <span>1/{imagesList.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Information */}
                  <div className="space-y-2.5 flex-1">
                    {/* SKU / ID & Yard Name */}
                    <div>
                      <div className="text-[10px] font-mono font-bold text-[#6F7E72] tracking-wider uppercase">
                        ID: YARD-{yard.id}
                      </div>
                      <h3
                        onClick={() => onEditYard(yard, 'info')}
                        className="text-base font-extrabold text-[#1E3932] group-hover:text-[#006241] transition-colors cursor-pointer truncate mt-0.5"
                        title={yard.yardName}
                      >
                        {yard.yardName}
                      </h3>
                    </div>

                    {/* Facility & Sport Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E6E2D8] text-[#1E3932] font-semibold truncate max-w-[170px]">
                        <Building2 className="w-3 h-3 text-[#006241] shrink-0" />
                        <span className="truncate">{vendorName}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#006241] font-bold border border-emerald-200">
                        <Trophy className="w-3 h-3 shrink-0" />
                        <span>{sportName}</span>
                      </span>
                    </div>

                    {/* Price Section */}
                    <div className="pt-1 flex items-baseline justify-between border-t border-[#F2F0EB]">
                      <span className="text-[11px] text-[#6F7E72] font-semibold">Giá thuê:</span>
                      <div className="text-right">
                        <span className="text-sm font-black text-[#006241] font-mono">
                          {Number(yard.price || 0).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[10px] text-[#6F7E72] font-medium">/giờ</span>
                      </div>
                    </div>

                    {/* Realtime Occupation Detail Box */}
                    <div
                      className={`p-2.5 rounded-xl border text-[11px] font-medium transition-all ${
                        rt.status === 'occupied'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : rt.status === 'maintenance'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      {rt.status === 'occupied' && rt.activeBooking ? (
                        <div className="space-y-0.5">
                          <div className="font-extrabold flex items-center gap-1 text-rose-700">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Khung giờ: {rt.activeBooking.startTime} - {rt.activeBooking.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate text-rose-800">
                            <UserIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate">Người chơi: {rt.activeBooking.customerName}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span className="truncate">{rt.summaryText}</span>
                        </div>
                      )}
                    </div>

                    {/* Khung Giờ Đã Đặt (Hôm Nay & Tương Lai) */}
                    <div className="pt-2 border-t border-[#F2F0EB] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#1E3932] flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-[#006241]" />
                          <span>Lịch Đặt ({sched.totalUpcomingCount})</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedYardForSchedule(yard)}
                          className="text-[10px] font-bold text-[#006241] hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Xem chi tiết</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {sched.totalUpcomingCount === 0 ? (
                        <div className="text-[10px] text-[#6F7E72] bg-[#FAF8F5] px-2.5 py-1.5 rounded-xl border border-[#E6E2D8]/60 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Chưa có lịch đặt sắp tới (sân trống)</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {sched.allUpcoming.slice(0, 2).map((slot) => {
                            const isNow = slot.isCurrent;
                            return (
                              <div
                                key={slot.id}
                                onClick={() => setSelectedYardForSchedule(yard)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10px] border transition-all cursor-pointer hover:scale-[1.01] ${
                                  isNow
                                    ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                                    : slot.isToday
                                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Clock className={`w-3 h-3 shrink-0 ${isNow ? 'text-rose-600 animate-pulse' : 'text-[#006241]'}`} />
                                  <span className="font-mono font-bold">
                                    {slot.isToday ? 'Hôm nay' : formatDateShort(slot.date)}: {slot.startTime} - {slot.endTime}
                                  </span>
                                </div>
                                <span className="truncate max-w-[80px] font-medium text-[10px] text-[#6F7E72]">
                                  {slot.customerName}
                                </span>
                              </div>
                            );
                          })}

                          {sched.allUpcoming.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSelectedYardForSchedule(yard)}
                              className="w-full py-1 text-center text-[10px] font-bold text-[#006241] bg-[#FAF8F5] hover:bg-emerald-50 rounded-lg border border-[#E6E2D8] transition-colors cursor-pointer"
                            >
                              +{sched.allUpcoming.length - 2} ca đặt khác sắp tới →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom CTA Buttons */}
                  <div className="pt-3 mt-3 border-t border-[#F2F0EB] grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onEditYard(yard, 'info')}
                      className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#006241] hover:text-white text-[#1E3932] border border-[#E6E2D8] hover:border-[#006241] font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Sửa Sân</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedYardForSchedule(yard)}
                      className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#1E3932] hover:text-white text-[#1E3932] border border-[#E6E2D8] hover:border-[#1E3932] font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Xem Lịch ({sched.totalUpcomingCount})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for Grid */}
          <div className="bg-white rounded-2xl border border-[#E6E2D8] shadow-xs">
            <DataTablePagination
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="sân con"
            />
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* HÌNH 2: TRADITIONAL DETAIL TABLE VIEW (REMAINS ACCESSIBLE)   */
        /* ============================================================ */
        <div className="bg-white rounded-3xl border border-[#E6E2D8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[#1E3932] uppercase font-mono text-[10px] tracking-wider">
                  <DataTableHeader
                    label="Mã / Tên Sân"
                    field="yardName"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    filterValue={columnFilters.yardName}
                    onFilterChange={(val) => setColumnFilter('yardName', val)}
                    filterPlaceholder="Lọc tên..."
                    className="p-4 pl-6"
                  />
                  {!selectedVendor && <DataTableHeader label="Cụm Sân" field="vendor" sortable={false} className="p-4" />}
                  <DataTableHeader label="Môn Thể Thao" field="sportType" sortable={false} className="p-4" />
                  <DataTableHeader label="Loại Sân" field="typeYard" sortable={false} className="p-4" />
                  <DataTableHeader
                    label="Giá Thuê / Giờ"
                    field="price"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-4"
                  />
                  <DataTableHeader label="Ảnh Thực Tế" sortable={false} className="p-4" />
                  <DataTableHeader label="Trạng Thái & Lịch Đặt" sortable={false} className="p-4" />
                  <DataTableHeader label="Thao Tác" align="center" sortable={false} className="p-4 pr-6 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932]">
                {paginatedData.map((yard) => {
                  const rt = calculateYardRealtimeStatus(yard, bookings);
                  const sched = rt.schedule;
                  const sportName = yard.sportType?.sportName || (yard as any).sport_type?.sportName || 'Chưa phân loại';
                  const typeName = yard.typeYard?.typeName || (yard as any).type_yard?.typeName || 'Mặc định';
                  const vendorName = yard.vendor?.vendorName || 'Cụm sân';
                  const priceFormatted = Number(yard.price || 0).toLocaleString('vi-VN') + 'đ';

                  return (
                    <tr
                      key={yard.id}
                      className={`hover:bg-[#FBF8F0]/70 transition-colors group ${
                        rt.status === 'occupied' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <div
                          onClick={() => onEditYard(yard, 'info')}
                          className="font-black text-sm text-[#1E3932] group-hover:text-[#006241] transition-colors cursor-pointer truncate max-w-[200px]"
                        >
                          {yard.yardName}
                        </div>
                        <span className="text-[10px] font-mono text-[#6F7E72] font-semibold block">
                          ID: YARD-{yard.id}
                        </span>
                      </td>

                      {!selectedVendor && (
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#1E3932] truncate max-w-[150px]">
                            <Building2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                            <span>{vendorName}</span>
                          </span>
                        </td>
                      )}

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#006241] font-bold text-[11px]">
                          <Trophy className="w-3 h-3" />
                          <span>{sportName}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-[11px]">
                          <Tag className="w-3 h-3 text-[#6F7E72]" />
                          <span>{typeName}</span>
                        </span>
                      </td>

                      <td className="p-4 font-mono text-sm font-black text-[#006241]">
                        {priceFormatted}
                      </td>

                      <td className="p-3">
                        <CompactTableImageCarousel
                          images={yard.images}
                          title={yard.yardName}
                          onEditImages={() => onEditYard(yard, 'images')}
                        />
                      </td>

                      {/* Realtime Status & Booked Time Slots in Table */}
                      <td className="p-4">
                        <div className="space-y-1.5 min-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${rt.badgeClass}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${rt.dotColor} ${
                                  rt.status === 'occupied' ? 'animate-ping' : ''
                                }`}
                              />
                              <span>{rt.badgeLabel}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedYardForSchedule(yard)}
                              className="text-[10px] font-bold text-[#006241] hover:underline flex items-center gap-0.5 cursor-pointer"
                              title="Xem tất cả lịch đặt"
                            >
                              <CalendarDays className="w-3 h-3" />
                              <span>Lịch ({sched.totalUpcomingCount})</span>
                            </button>
                          </div>

                          {sched.allUpcoming.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {sched.allUpcoming.slice(0, 2).map((slot) => (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => setSelectedYardForSchedule(yard)}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                                    slot.isCurrent
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : slot.isToday
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-50 text-[#006241] border-emerald-200'
                                  }`}
                                  title={`${slot.isToday ? 'Hôm nay' : slot.date}: ${slot.startTime}-${slot.endTime} • ${slot.customerName}`}
                                >
                                  {slot.isToday ? 'Nay' : formatDateShort(slot.date)}: {slot.startTime}
                                </button>
                              ))}

                              {sched.allUpcoming.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedYardForSchedule(yard)}
                                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FAF8F5] text-[#006241] border border-[#E6E2D8] hover:bg-emerald-50 cursor-pointer"
                                >
                                  +{sched.allUpcoming.length - 2}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#6F7E72]">Trống cả ngày</div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 pr-6 text-center">
                        <YardItemActionMenu
                          yard={yard}
                          openId={openMenuId}
                          setOpenId={setOpenMenuId}
                          onEditYard={onEditYard}
                          onDeleteYard={onDeleteYard}
                          onQuickToggleStatus={handleQuickToggleStatus}
                          onViewSchedule={(y) => setSelectedYardForSchedule(y)}
                          disabled={!isVendorActive}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DataTablePagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="sân con"
          />
        </div>
      )}

      {/* Yard Schedule Modal */}
      <YardScheduleModal
        isOpen={!!selectedYardForSchedule}
        onClose={() => setSelectedYardForSchedule(null)}
        yard={selectedYardForSchedule}
        bookings={bookings}
      />
    </div>
  );
};
