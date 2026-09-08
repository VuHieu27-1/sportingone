import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  RefreshCw,
  Loader2,
  Sparkles,
  Radio,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService, BackendBooking } from '../../services/bookingService';
import { BackendYardItem } from '../../services/vendorService';
import { AuthUser } from '../../types/auth';
import { BookingModal } from '../booking/BookingModal';
import { BookingDetailQrModal } from '../cart/BookingDetailQrModal';
import { BookedYardCard, UniqueBookedYardItem, BookingLiveStatus } from './BookedYardCard';
import { YardRatingModal } from '../rating/YardRatingModal';
import { timeService } from '../../services/timeService';

type FilterTabKey = 'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'COMPLETED';

interface BookedYardsTabProps {
  currentUser?: AuthUser | null;
}

export const BookedYardsTab: React.FC<BookedYardsTabProps> = ({ currentUser = null }) => {
  const navigate = useNavigate();
  const [rawBookings, setRawBookings] = useState<BackendBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<FilterTabKey>('ALL');
  const [selectedYardForBooking, setSelectedYardForBooking] = useState<BackendYardItem | null>(null);
  const [selectedBookingForQr, setSelectedBookingForQr] = useState<BackendBooking | null>(null);
  const [selectedYardForRating, setSelectedYardForRating] = useState<{
    yard: BackendYardItem;
    booking?: BackendBooking;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time tick every 30 seconds to recalculate live/upcoming status automatically without API re-fetch
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const calculateBookingStatus = (
    booking: BackendBooking,
    now: Date
  ): BookingLiveStatus => {
    if (booking.status !== 'paid') return null;
    const currentMs = now.getTime();

    const isMonthly = Boolean(booking.startDate || (booking as any).itemType === 'monthly');

    if (isMonthly && booking.startDate && booking.endDate) {
      const rawStartDay = String(booking.startDate).split('T')[0];
      const rawEndDay = String(booking.endDate).split('T')[0];
      const todayStr = timeService.getTodayDateStr();

      // 1. Entire package is in the future before start date
      if (todayStr < rawStartDay) {
        const firstDayStartObj = new Date(`${rawStartDay}T${(booking as any).startTime || '08:00'}:00`);
        const diffMs = firstDayStartObj.getTime() - currentMs;
        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
          return 'upcoming';
        }
        return 'completed';
      }

      // 2. Entire package is in the past after end date
      if (todayStr > rawEndDay) {
        return 'completed';
      }

      // 3. Today is within the package date range [rawStartDay, rawEndDay]
      const dailyStart = (booking as any).startTime || '08:00';
      const dailyEnd = (booking as any).endTime || '10:00';

      const [sH, sM] = dailyStart.split(':').map(Number);
      const [eH, eM] = dailyEnd.split(':').map(Number);

      const todayStartObj = new Date(now);
      todayStartObj.setHours(sH, sM, 0, 0);

      const todayEndObj = new Date(now);
      todayEndObj.setHours(eH, eM, 0, 0);

      const todayStartMs = todayStartObj.getTime();
      const todayEndMs = todayEndObj.getTime();

      // Currently playing in today's match hours
      if (currentMs >= todayStartMs && currentMs <= todayEndMs) {
        return 'in_progress';
      }

      // Today's match is upcoming later today (before start time)
      if (currentMs < todayStartMs) {
        return 'upcoming';
      }

      // Today's match has ended (e.g. afternoon after 10:00 AM)
      return 'completed';
    }

    // Daily / Hourly booking
    const startMs = new Date(booking.startTime).getTime();
    const endMs = new Date(booking.endTime).getTime();

    if (isNaN(startMs) || isNaN(endMs)) return null;

    if (currentMs >= startMs && currentMs <= endMs) {
      return 'in_progress';
    }
    if (currentMs < startMs) {
      // Show upcoming if starting within the next 24 hours
      if (startMs - currentMs <= 24 * 60 * 60 * 1000) {
        return 'upcoming';
      }
      return 'completed';
    }
    return 'completed';
  };

  const fetchBookedYards = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [resDaily, resMonthly] = await Promise.all([
        bookingService.fetchMyBookings(),
        bookingService.fetchMyBookingsMonth(),
      ]);

      const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
        ...b,
        itemType: 'hourly',
      }));
      const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
        ...bm,
        itemType: 'monthly',
      }));

      setRawBookings([...dailyList, ...monthlyList] as any);
    } catch {
      toast.error('Lỗi hệ thống khi tải danh sách sân đã đặt.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookedYards(false);
  }, [fetchBookedYards]);

  // Compute unique yards with evaluated live statuses without triggering full reload
  const uniqueYards = useMemo<UniqueBookedYardItem[]>(() => {
    if (!rawBookings || rawBookings.length === 0) return [];
    const now = currentTime;
    const yardMap = new Map<
      number,
      {
        yard: BackendYardItem;
        bookings: BackendBooking[];
      }
    >();

    rawBookings.forEach((b) => {
      if (b.yard && b.yard.id) {
        const existing = yardMap.get(b.yard.id);
        if (!existing) {
          yardMap.set(b.yard.id, {
            yard: b.yard as unknown as BackendYardItem,
            bookings: [b],
          });
        } else {
          existing.bookings.push(b);
        }
      }
    });

    const processedYards: UniqueBookedYardItem[] = Array.from(yardMap.values()).map(
      ({ yard, bookings }) => {
        // Sort bookings descending by createdAt / startTime for lastBooking
        const sortedBookings = [...bookings].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        // 1. Priority 1: Any booking currently in progress?
        const inProgressBooking = bookings.find(
          (b) => calculateBookingStatus(b, now) === 'in_progress'
        );

        if (inProgressBooking) {
          return {
            yard,
            bookingCount: bookings.length,
            lastBooking: sortedBookings[0],
            allBookings: bookings,
            liveStatus: 'in_progress',
            relevantBooking: inProgressBooking,
          };
        }

        // 2. Priority 2: Any upcoming booking? (Pick the earliest upcoming)
        const upcomingBookings = bookings
          .filter((b) => calculateBookingStatus(b, now) === 'upcoming')
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (upcomingBookings.length > 0) {
          return {
            yard,
            bookingCount: bookings.length,
            lastBooking: sortedBookings[0],
            allBookings: bookings,
            liveStatus: 'upcoming',
            relevantBooking: upcomingBookings[0],
          };
        }

        // 3. Completed / No active temp
        return {
          yard,
          bookingCount: bookings.length,
          lastBooking: sortedBookings[0],
          allBookings: bookings,
          liveStatus: 'completed',
          relevantBooking: sortedBookings[0] || null,
        };
      }
    );

    // Sort unique yards: in_progress first, then upcoming, then recently booked
    processedYards.sort((a, b) => {
      if (a.liveStatus === 'in_progress' && b.liveStatus !== 'in_progress') return -1;
      if (b.liveStatus === 'in_progress' && a.liveStatus !== 'in_progress') return 1;
      if (a.liveStatus === 'upcoming' && b.liveStatus !== 'upcoming') return -1;
      if (b.liveStatus === 'upcoming' && a.liveStatus !== 'upcoming') return 1;
      return (
        new Date(b.lastBooking?.startTime || 0).getTime() -
        new Date(a.lastBooking?.startTime || 0).getTime()
      );
    });

    return processedYards;
  }, [rawBookings, currentTime]);

  const handleRebookClick = (yard: BackendYardItem) => {
    if ((yard as any)?.ondeleted) {
      toast.error('Sân này hiện đã ngừng hoạt động hoặc đã bị xoá, không thể đặt lại.');
      return;
    }
    setSelectedYardForBooking(yard);
  };

  const handleViewQr = (booking: BackendBooking) => {
    setSelectedBookingForQr(booking);
  };

  // Filter yards according to tab
  const inProgressCount = uniqueYards.filter((y) => y.liveStatus === 'in_progress').length;
  const upcomingCount = uniqueYards.filter((y) => y.liveStatus === 'upcoming').length;
  const completedCount = uniqueYards.filter((y) => y.liveStatus === 'completed').length;

  const filteredYards = uniqueYards.filter((yardItem) => {
    if (filterTab === 'IN_PROGRESS') return yardItem.liveStatus === 'in_progress';
    if (filterTab === 'UPCOMING') return yardItem.liveStatus === 'upcoming';
    if (filterTab === 'COMPLETED') return yardItem.liveStatus === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">

      {/* Main Header & Filter Bar */}
      <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#006241] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-[#006241]" />
              <span>LỊCH SỬ ĐẶT SÂN CÁ NHÂN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1E3932] tracking-tight">
              Danh Sách Sân Đã Đặt ({uniqueYards.length})
            </h2>
            <p className="text-xs text-[#6F7E72] font-medium mt-1">
              Theo dõi lịch thi đấu trực tiếp, trạng thái sử dụng sân và đặt lại sân nhanh chóng!
            </p>
          </div>

          <button
            onClick={() => fetchBookedYards(false)}
            disabled={isLoading}
            className="p-3 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] transition-colors cursor-pointer shrink-0 border border-[#E6E2D8]"
            title="Làm mới danh sách và cập nhật trạng thái thời gian thực"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        {uniqueYards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2F0EB]">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'ALL'
                  ? 'bg-[#1E3932] text-white shadow-md'
                  : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất cả ({uniqueYards.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('IN_PROGRESS')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'IN_PROGRESS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8]'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${inProgressCount > 0 ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span>Đang sử dụng ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('UPCOMING')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'UPCOMING'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chuẩn bị chơi ({upcomingCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'COMPLETED'
                  ? 'bg-[#006241] text-white shadow-md'
                  : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lịch sử ({completedCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* List Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[28px] border border-[#E6E2D8] space-y-3">
          <Loader2 className="w-8 h-8 text-[#006241] animate-spin" />
          <span className="text-xs font-bold text-[#6F7E72]">
            Đang tải danh sách sân và kiểm tra lịch thi đấu...
          </span>
        </div>
      ) : uniqueYards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-[28px] border border-[#E6E2D8] text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
            <Store className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-[#1E3932]">
            Bạn chưa từng đặt sân thi đấu nào
          </h3>
          <p className="text-xs text-[#6F7E72] max-w-sm">
            Khám phá các thương hiệu thể thao trên hệ thống Sporting ONE và đặt sân ngay hôm nay!
          </p>
          <button
            onClick={() => navigate('/user')}
            className="px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all cursor-pointer shadow-md mt-2"
          >
            Khám Phá Sân Ngay
          </button>
        </div>
      ) : filteredYards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-[28px] border border-[#E6E2D8] text-center space-y-2">
          <Layers className="w-8 h-8 text-[#6F7E72]" />
          <h4 className="text-sm font-extrabold text-[#1E3932]">
            Không tìm thấy sân nào trong bộ lọc này
          </h4>
          <button
            onClick={() => setFilterTab('ALL')}
            className="text-xs font-bold text-[#006241] hover:underline cursor-pointer"
          >
            Xem tất cả ({uniqueYards.length}) sân
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredYards.map((yardItem) => (
            <BookedYardCard
              key={yardItem.yard.id}
              yardItem={yardItem}
              onRebook={handleRebookClick}
              onViewQr={handleViewQr}
              onOpenRating={(yard, booking) =>
                setSelectedYardForRating({ yard, booking })
              }
            />
          ))}
        </div>
      )}

      {/* Rebook Match Booking Modal */}
      {selectedYardForBooking && (
        <BookingModal
          yard={selectedYardForBooking}
          vendorName={selectedYardForBooking.vendor?.vendorName || 'Cụm Sân Thể Thao'}
          onClose={() => setSelectedYardForBooking(null)}
          onBookingCreated={() => {
            fetchBookedYards(true);
          }}
        />
      )}

      {/* Booking Detail QR Ticket Modal */}
      {selectedBookingForQr && (
        <BookingDetailQrModal
          booking={selectedBookingForQr}
          onClose={() => setSelectedBookingForQr(null)}
        />
      )}

      {/* Yard Rating & Review Modal */}
      {selectedYardForRating && (
        <YardRatingModal
          isOpen={true}
          yardId={Number(selectedYardForRating.yard.id)}
          yardName={selectedYardForRating.yard.yardName}
          vendorName={
            selectedYardForRating.yard.vendor?.vendorName || 'Cụm Sân Thể Thao'
          }
          bookingId={selectedYardForRating.booking?.id}
          currentUser={currentUser}
          onClose={() => setSelectedYardForRating(null)}
          onSuccess={() => {
            fetchBookedYards(true);
          }}
        />
      )}
    </div>
  );
};
