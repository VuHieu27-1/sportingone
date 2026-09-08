import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  X,
  Clock,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Calendar,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BackendYardItem } from '../../services/vendorService';
import { bookingService, BackendBooking } from '../../services/bookingService';
import { timeService } from '../../services/timeService';
import { calculateDurationHours } from '../../utils/dateUtils';
import { TimeRangePicker, TimeRangePickerValue } from '../common/TimeRangePicker';
import { TimePickerInput } from '../common/TimePickerInput';
import { BookingInterval } from '../../utils/timePickerUtils';

export type BookingMode = 'hourly' | 'monthly';

interface BookingModalProps {
  yard: BackendYardItem | null;
  vendorName: string;
  initialTimeSlot?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  initialMode?: BookingMode;
  onClose: () => void;
  onBookingCreated?: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  yard,
  vendorName,
  initialTimeSlot = null,
  initialMode = 'hourly',
  onClose,
  onBookingCreated,
}) => {
  const navigate = useNavigate();

  const [bookingMode, setBookingMode] = useState<BookingMode>(initialMode);
  const [isTimePickerModalOpen, setIsTimePickerModalOpen] = useState<boolean>(false);

  const getInitialTimeState = () => {
    if (initialTimeSlot) {
      return {
        dateStr: initialTimeSlot.date || timeService.getTodayDateStr(),
        startStr: initialTimeSlot.startTime || '08:00',
        endStr: initialTimeSlot.endTime || '09:00',
      };
    }

    const now = timeService.getNow();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let roundedM = Math.ceil(currentMinute / 15) * 15;
    let startH = currentHour;
    if (roundedM >= 60) {
      startH = (currentHour + 1) % 24;
      roundedM = 0;
    }

    if (startH >= 23) {
      const tomorrow = timeService.getNow();
      tomorrow.setDate(now.getDate() + 1);
      const tYear = tomorrow.getFullYear();
      const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tDay = String(tomorrow.getDate()).padStart(2, '0');
      return {
        dateStr: `${tYear}-${tMonth}-${tDay}`,
        startStr: '08:00',
        endStr: '09:00',
      };
    }

    const endH = (startH + 1) % 24;
    const startStr = `${String(startH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
    const endStr = `${String(endH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;

    return {
      dateStr: todayStr,
      startStr,
      endStr,
    };
  };

  const initialState = getInitialTimeState();

  // Hourly state
  const [selectedDate, setSelectedDate] = useState<string>(initialState.dateStr);
  const [startTime, setStartTime] = useState<string>(initialState.startStr);
  const [endTime, setEndTime] = useState<string>(initialState.endStr);

  // Monthly state
  const [monthlyStartDate, setMonthlyStartDate] = useState<string>(initialState.dateStr);
  const [monthlyStartTime, setMonthlyStartTime] = useState<string>(initialState.startStr);
  const [numberOfMonths, setNumberOfMonths] = useState<number>(1);
  const [dailyHoursOption, setDailyHoursOption] = useState<number>(2);

  // Existing bookings list for real-time visualization & conflicts
  const [yardBookings, setYardBookings] = useState<BackendBooking[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [monthlyConflictMessage, setMonthlyConflictMessage] = useState<string>('');
  const [isCheckingConflict, setIsCheckingConflict] = useState<boolean>(false);

  // Fetch yard bookings for calendar timeline visualization
  useEffect(() => {
    if (!yard?.id) return;
    let isMounted = true;
    bookingService.fetchBookingsByYard(yard.id).then((res) => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        setYardBookings(res.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [yard?.id]);

  if (!yard) return null;

  const sportName = yard.sportType?.sportName || 'Thể thao';
  const typeName = yard.typeYard?.typeName || 'Sân tiêu chuẩn';
  const pricePerHour = Number(yard.price || 0);
  const openTime = yard.vendor?.openTime || '06:00';
  const closeTime = yard.vendor?.closeTime || '23:00';

  // Format existing bookings into BookingInterval
  const existingIntervals: BookingInterval[] = useMemo(() => {
    return yardBookings
      .filter((b) => {
        if (b.status === 'cancelled') return false;
        if (!b.startTime) return false;
        const bDate = b.startTime.includes('T')
          ? b.startTime.split('T')[0]
          : selectedDate;
        return bDate === selectedDate;
      })
      .map((b) => {
        let sStr = '08:00';
        let eStr = '09:00';
        if (b.startTime.includes('T')) {
          const d = new Date(b.startTime);
          sStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else if (b.startTime.includes(':')) {
          sStr = b.startTime;
        }
        if (b.endTime && b.endTime.includes('T')) {
          const d = new Date(b.endTime);
          eStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else if (b.endTime && b.endTime.includes(':')) {
          eStr = b.endTime;
        }
        return {
          startTime: sStr,
          endTime: eStr,
          status: b.status,
        };
      });
  }, [yardBookings, selectedDate]);

  // Hourly calculations
  const durationHours = calculateDurationHours(startTime, endTime);
  const hourlyTotalPrice = Math.round(pricePerHour * durationHours);

  // Clear stale error messages whenever user changes any selection
  useEffect(() => {
    setErrorMessage('');
  }, [
    selectedDate,
    startTime,
    endTime,
    monthlyStartDate,
    monthlyStartTime,
    numberOfMonths,
    dailyHoursOption,
    bookingMode,
  ]);

  // Monthly calculations
  const computeMonthlyDates = useCallback(() => {
    const [sH, sM] = monthlyStartTime.split(':').map(Number);
    const startObj = new Date(monthlyStartDate);
    startObj.setHours(sH || 8, sM || 0, 0, 0);

    const endObj = new Date(startObj);
    endObj.setMonth(endObj.getMonth() + (numberOfMonths || 1));

    const startDateStr = monthlyStartDate;
    const endYear = endObj.getFullYear();
    const endMonth = String(endObj.getMonth() + 1).padStart(2, '0');
    const endDay = String(endObj.getDate()).padStart(2, '0');
    const endDateStr = `${endYear}-${endMonth}-${endDay}`;

    const startMinutes = (sH || 8) * 60 + (sM || 0);
    const totalEndMinutes = startMinutes + Math.round(dailyHoursOption * 60);
    const endMinutes = totalEndMinutes % (24 * 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const startTimeStr = `${String(sH || 8).padStart(2, '0')}:${String(sM || 0).padStart(2, '0')}`;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const isOvernight = totalEndMinutes >= 24 * 60;

    return { startObj, endObj, startDateStr, endDateStr, startTimeStr, endTimeStr, isOvernight };
  }, [monthlyStartDate, monthlyStartTime, numberOfMonths, dailyHoursOption]);

  const {
    startObj: monthlyStartObj,
    endObj: monthlyEndObj,
    isOvernight: mIsOvernight,
  } = computeMonthlyDates();

  // Real-time check if yard has any booked slots during this month
  useEffect(() => {
    if (bookingMode !== 'monthly' || !yard?.id) {
      setMonthlyConflictMessage('');
      return;
    }

    const { isOvernight } = computeMonthlyDates();
    if (isOvernight) {
      setMonthlyConflictMessage(
        `Khung giờ hàng ngày vượt quá 24:00. Vui lòng chọn giờ bắt đầu trước ${24 - dailyHoursOption
        }:00.`
      );
      return;
    }

    let isMounted = true;
    setIsCheckingConflict(true);

    const checkConflict = async () => {
      try {
        const { startDateStr, endDateStr, startTimeStr, endTimeStr } = computeMonthlyDates();
        const res = await bookingService.checkYardMonthAvailability(
          yard.id,
          startDateStr,
          endDateStr,
          startTimeStr,
          endTimeStr
        );

        if (isMounted) {
          if (res.success && res.data && !res.data.isAvailable) {
            setMonthlyConflictMessage(
              res.data.message ||
              'Sân đã có người đặt lịch trong khoảng thời gian này. Vui lòng chọn khung giờ hoặc đổi sân khác.'
            );
          } else {
            setMonthlyConflictMessage('');
          }
        }
      } catch {
        if (isMounted) setMonthlyConflictMessage('');
      } finally {
        if (isMounted) setIsCheckingConflict(false);
      }
    };

    checkConflict();

    return () => {
      isMounted = false;
    };
  }, [
    bookingMode,
    yard?.id,
    monthlyStartDate,
    monthlyStartTime,
    numberOfMonths,
    dailyHoursOption,
    computeMonthlyDates,
  ]);

  const formatVietnameseDateTime = (d: Date) => {
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${timeStr} - ${dateStr}`;
  };

  const monthlyTotalHours = 30 * dailyHoursOption * (numberOfMonths || 1);
  const monthlyTotalPrice = Math.round(pricePerHour * monthlyTotalHours);

  const formatDurationText = (hours: number): string => {
    if (hours <= 0) return 'Khung giờ không hợp lệ';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} tiếng`;
    return `${h} tiếng ${m} phút`;
  };

  const applyDurationPreset = (addedHours: number) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const totalMins = sH * 60 + sM + Math.round(addedHours * 60);
    const newH = Math.floor((totalMins % (24 * 60)) / 60);
    const newM = totalMins % 60;
    const newEndStr = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    setEndTime(newEndStr);
  };

  const handleTimePickerConfirm = useCallback((val: TimeRangePickerValue) => {
    setSelectedDate(val.date);
    setStartTime(val.startTime);
    setEndTime(val.endTime);
    setIsTimePickerModalOpen(false);
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setIsTimePickerModalOpen(false);
  }, []);

  const handleConfirmBooking = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (bookingMode === 'hourly') {
        if (durationHours < 1) {
          setErrorMessage('Thời lượng đặt sân tối thiểu phải từ 1 tiếng trở lên.');
          setIsLoading(false);
          return;
        }

        const [sH, sM] = startTime.split(':').map(Number);
        const reqStart = new Date(selectedDate);
        reqStart.setHours(sH, sM, 0, 0);

        const [eH, eM] = endTime.split(':').map(Number);
        const reqEnd = new Date(selectedDate);
        reqEnd.setHours(eH, eM, 0, 0);

        const calculatedPrice = Math.round(durationHours * Number(yard.price || 0));

        const availRes = await bookingService.checkYardAvailability(
          yard.id,
          reqStart.toISOString(),
          reqEnd.toISOString()
        );

        if (availRes.success && availRes.data && !availRes.data.isAvailable) {
          setErrorMessage(
            availRes.data.message ||
            'Sân đã được người khác thanh toán giữ lịch trong khoảng thời gian này. Vui lòng chọn thời gian khác.'
          );
          setIsLoading(false);
          return;
        }

        const res = await bookingService.createBooking({
          yardId: yard.id,
          startTime: reqStart.toISOString(),
          endTime: reqEnd.toISOString(),
          status: 'unpaid',
          priced: calculatedPrice,
        });

        if (res.success && res.data) {
          toast.success(
            `Đã tạo đơn đặt ${yard.yardName} theo giờ! Bạn có thể thanh toán ngay hoặc thanh toán gộp trong Giỏ Hàng.`
          );
          if (onBookingCreated) onBookingCreated();
          onClose();
          navigate('/cart');
        } else {
          setErrorMessage(res.message || 'Không thể tạo đơn đặt sân.');
        }
      } else {
        // Monthly booking flow
        const { startDateStr, endDateStr, startTimeStr, endTimeStr, isOvernight } =
          computeMonthlyDates();

        if (isOvernight) {
          setErrorMessage(
            `Khung giờ hàng ngày vượt quá 24:00. Vui lòng chọn giờ bắt đầu trước ${24 - dailyHoursOption
            }:00 để kết thúc trong ngày.`
          );
          setIsLoading(false);
          return;
        }

        const availRes = await bookingService.checkYardMonthAvailability(
          yard.id,
          startDateStr,
          endDateStr,
          startTimeStr,
          endTimeStr
        );

        if (availRes.success && availRes.data && !availRes.data.isAvailable) {
          setErrorMessage(
            availRes.data.message ||
            'Sân đã có người đặt trong khoảng thời gian này. Vui lòng chọn thời gian hoặc sân khác.'
          );
          setIsLoading(false);
          return;
        }

        const res = await bookingService.createBookingsMonth({
          yardId: yard.id,
          bookingType: 'month',
          startDate: startDateStr,
          endDate: endDateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: 'unpaid',
          priced: monthlyTotalPrice,
        });

        if (res.success && res.data) {
          toast.success(
            `Đã tạo gói đặt sân theo tháng ${yard.yardName}! Vui lòng vào Giỏ Hàng để thanh toán.`
          );
          if (onBookingCreated) onBookingCreated();
          onClose();
          navigate('/cart');
        } else {
          setErrorMessage(res.message || 'Không thể tạo gói đặt sân theo tháng.');
        }
      }
    } catch {
      setErrorMessage('Lỗi kết nối tới máy chủ đặt sân.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={onClose}
          />

          <div className="relative w-full max-w-lg bg-[#FBF8F0] rounded-[32px] overflow-hidden shadow-2xl z-10 border border-[#E6E2D8] flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E2D8] bg-[#F2F0EB] shrink-0">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block">
                  {vendorName}
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#1E3932] leading-tight">
                  Đặt Lịch {yard.yardName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#6F7E72] hover:text-[#1E3932] border border-[#E6E2D8] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selection: Hourly vs Monthly */}
            <div className="p-3 bg-[#EAE6DF] border-b border-[#E6E2D8] flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBookingMode('hourly')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${bookingMode === 'hourly'
                  ? 'bg-[#006241] text-white shadow-sm'
                  : 'bg-white text-[#1E3932] hover:bg-white/80'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Đặt Theo Giờ</span>
              </button>

              <button
                type="button"
                onClick={() => setBookingMode('monthly')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${bookingMode === 'monthly'
                  ? 'bg-[#006241] text-white shadow-sm'
                  : 'bg-white text-[#1E3932] hover:bg-white/80'
                  }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Đặt Theo Tháng</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-[#1E3932]">
              {/* Yard Info Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-white rounded-2xl border border-[#E6E2D8]">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#006241] text-white font-mono text-[10px] font-extrabold uppercase">
                    {sportName}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] text-xs font-bold">
                    {typeName}
                  </span>
                </div>
                <span className="text-[#006241] font-mono font-black text-sm">
                  {pricePerHour.toLocaleString('vi-VN')}đ / giờ
                </span>
              </div>

              {bookingMode === 'hourly' ? (
                /* HOURLY BOOKING: CLEAN TIME SELECTION BUTTON CARD */
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-[#E6E2D8] shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6F7E72] uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#006241]" />
                        <span>Thời Gian Đặt Sân</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#006241] font-mono text-xs font-black">
                        {formatDurationText(durationHours)}
                      </span>
                    </div>

                    {/* Interactive Selection Highlight Box */}
                    <div
                      onClick={() => setIsTimePickerModalOpen(true)}
                      className="p-3.5 rounded-2xl bg-[#FBF8F0] border-2 border-dashed border-[#006241]/30 hover:border-[#006241] hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#6F7E72] font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                          <span>
                            Ngày:{' '}
                            <strong className="text-[#1E3932] font-mono">
                              {selectedDate}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-base sm:text-lg font-black font-mono text-[#006241]">
                          <Clock className="w-4 h-4 text-[#006241]" />
                          <span>
                            {startTime} → {endTime}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTimePickerModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006241] group-hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Chọn Giờ</span>
                      </button>
                    </div>

                    {/* Quick Duration Increment Presets */}
                    <div className="pt-2 border-t border-[#E6E2D8] flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#6F7E72]">
                        ⚡ Tăng nhanh:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: '+1h', hrs: 1 },
                          { label: '+1.5h', hrs: 1.5 },
                          { label: '+2h', hrs: 2 },
                          { label: '+3h', hrs: 3 },
                          { label: '+4h', hrs: 4 },
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => applyDurationPreset(p.hrs)}
                            className="px-2.5 py-1 rounded-lg bg-[#F2F0EB] hover:bg-[#006241] hover:text-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] transition-all cursor-pointer"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* MONTHLY BOOKING FORM */
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#006241]" />
                    <h3 className="text-sm font-extrabold text-[#1E3932]">
                      Cấu Hình Gói Đặt Theo Tháng ({numberOfMonths} Tháng)
                    </h3>
                  </div>

                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#006241]">
                      <CheckCircle2 className="w-4 h-4 text-[#006241]" />
                      <span>Thông tin gói thuê {numberOfMonths} tháng</span>
                    </div>
                    <p className="text-[11px] text-[#1E3932]/80 leading-relaxed">
                      Đặt giữ cố định sân trong vòng{' '}
                      <strong>
                        {numberOfMonths} tháng ({numberOfMonths * 30} ngày)
                      </strong>{' '}
                      kể từ ngày bắt đầu.
                    </p>
                  </div>

                  {/* Number of Months Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#6F7E72]">
                        Thời hạn thuê (Số tháng):
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumberOfMonths((prev) => Math.max(1, prev - 1))}
                          disabled={numberOfMonths <= 1}
                          className="w-6 h-6 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#F2F0EB] text-[#1E3932] font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-black text-[#006241] min-w-[50px] text-center">
                          {numberOfMonths} tháng
                        </span>
                        <button
                          type="button"
                          onClick={() => setNumberOfMonths((prev) => Math.min(24, prev + 1))}
                          disabled={numberOfMonths >= 24}
                          className="w-6 h-6 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#F2F0EB] text-[#1E3932] font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNumberOfMonths(m)}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${numberOfMonths === m
                            ? 'border-[#006241] bg-[#006241] text-white shadow-xs'
                            : 'border-[#E6E2D8] bg-white text-[#1E3932] hover:bg-[#F2F0EB]'
                            }`}
                        >
                          {m} tháng
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#6F7E72] block mb-1">
                        Ngày bắt đầu thuê:
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={monthlyStartDate}
                        onChange={(e) => setMonthlyStartDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] focus:outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/20 transition-all cursor-pointer"
                      />
                    </div>

                    <div>
                      <TimePickerInput
                        label="Khung giờ bắt đầu hàng ngày"
                        value={monthlyStartTime}
                        onChange={(newVal) => setMonthlyStartTime(newVal)}
                        openingTime={openTime}
                        closingTime={closeTime}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6F7E72] block mb-1.5">
                      Thời lượng chơi dự kiến mỗi ngày:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { hrs: 1, label: '1 tiếng / ngày', sub: `${30 * numberOfMonths}h tổng` },
                        { hrs: 2, label: '2 tiếng / ngày', sub: `${60 * numberOfMonths}h tổng` },
                        { hrs: 3, label: '3 tiếng / ngày', sub: `${90 * numberOfMonths}h tổng` },
                      ].map((opt) => (
                        <button
                          key={opt.hrs}
                          type="button"
                          onClick={() => setDailyHoursOption(opt.hrs)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${dailyHoursOption === opt.hrs
                            ? 'border-[#006241] bg-[#006241]/10 text-[#006241] font-extrabold shadow-xs'
                            : 'border-[#E6E2D8] bg-white text-[#1E3932] hover:bg-[#F2F0EB]'
                            }`}
                        >
                          <span className="block text-xs">{opt.label}</span>
                          <span className="block text-[10px] text-[#6F7E72] mt-0.5">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Interval Breakdown Box */}
                  <div className="p-3.5 bg-white border border-[#E6E2D8] rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase block">
                      Thời Gian Thuê Cố Định {numberOfMonths} Tháng
                    </span>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#6F7E72]">Bắt đầu:</span>
                      <span className="font-bold text-[#1E3932]">
                        {formatVietnameseDateTime(monthlyStartObj)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#6F7E72]">Kết thúc (+{numberOfMonths} tháng):</span>
                      <span className="font-bold text-[#006241]">
                        {formatVietnameseDateTime(monthlyEndObj)}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Conflict Warning Alert */}
                  {isCheckingConflict ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      <span>Đang kiểm tra lịch đặt của sân trong {numberOfMonths} tháng...</span>
                    </div>
                  ) : monthlyConflictMessage ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 leading-relaxed flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block mb-0.5">Không thể đặt theo tháng:</span>
                        <span>{monthlyConflictMessage}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 leading-relaxed">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Pricing Preview Box */}
              <div className="p-4 bg-white rounded-2xl border border-[#E6E2D8] flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-mono text-[#6F7E72] uppercase block">
                    {bookingMode === 'hourly'
                      ? `Tổng Tiền Dự Kiến (${formatDurationText(durationHours)})`
                      : `Tổng Tiền Gói ${numberOfMonths} Tháng (${monthlyTotalHours} Giờ / ${numberOfMonths * 30
                      } Ngày)`}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#006241] font-mono">
                      {bookingMode === 'hourly'
                        ? hourlyTotalPrice > 0
                          ? `${hourlyTotalPrice.toLocaleString('vi-VN')}đ`
                          : '0đ'
                        : `${monthlyTotalPrice.toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs font-mono text-[#6F7E72]">
                  {bookingMode === 'hourly' ? (
                    <>
                      <span className="block font-bold text-[#1E3932]">
                        {startTime} - {endTime}
                      </span>
                      <span>{formatDurationText(durationHours)}</span>
                    </>
                  ) : (
                    <>
                      <span className="block font-bold text-[#1E3932]">
                        Trọn Gói {numberOfMonths} Tháng
                      </span>
                      <span className="text-[#6F7E72]">{monthlyTotalHours} giờ thi đấu</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="p-5 border-t border-[#E6E2D8] bg-[#F2F0EB] shrink-0 flex gap-3">
              <button
                type="button"
                tabIndex={4}
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-[#E6E2D8] bg-white hover:bg-[#F2F0EB] text-[#1E3932] text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
              >
                Hủy
              </button>

              <button
                type="button"
                tabIndex={5}
                onClick={handleConfirmBooking}
                disabled={
                  isLoading ||
                  isCheckingConflict ||
                  (bookingMode === 'hourly' && durationHours <= 0) ||
                  (bookingMode === 'monthly' && Boolean(monthlyConflictMessage))
                }
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {isLoading || isCheckingConflict ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {isLoading
                    ? 'Đang Tạo Đơn...'
                    : isCheckingConflict
                      ? 'Đang Kiểm Tra Lịch...'
                      : bookingMode === 'monthly'
                        ? 'XÁC NHẬN ĐẶT THEO THÁNG'
                        : 'XÁC NHẬN ĐẶT SÂN'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED SPACIOUS TIME RANGE PICKER MODAL */}
      {isTimePickerModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/75 transition-opacity"
              onClick={handleTimePickerClose}
            />

            <div className="relative w-full max-w-4xl max-h-[90vh] h-[90vh] sm:h-[86vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
              <TimeRangePicker
                date={selectedDate}
                startTime={startTime}
                endTime={endTime}
                openingTime={openTime}
                closingTime={closeTime}
                minuteInterval={1}
                existingBookings={existingIntervals}
                pricePerHour={pricePerHour}
                showActions={true}
                title={`Đặt Sân: ${yard.yardName}`}
                confirmText="Lưu Khung Giờ Đã Chọn"
                cancelText="Đóng"
                onConfirm={handleTimePickerConfirm}
                onCancel={handleTimePickerClose}
                className="h-full"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
