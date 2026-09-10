import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowRight,
  Clock,
  QrCode,
  Flame,
  Radio,
  Star,
} from 'lucide-react';
import { BackendYardItem } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';
import { formatTimeAMPM, formatDateVietnamese } from '../../utils/dateUtils';
import { getSportImageUrl } from '../../utils/sportImageUtils';

export type BookingLiveStatus = 'in_progress' | 'upcoming' | 'completed' | null;

export interface UniqueBookedYardItem {
  yard: BackendYardItem;
  bookingCount: number;
  lastBooking: BackendBooking;
  allBookings: BackendBooking[];
  liveStatus: BookingLiveStatus;
  relevantBooking: BackendBooking | null;
}

interface BookedYardCardProps {
  yardItem: UniqueBookedYardItem;
  onRebook: (yard: BackendYardItem) => void;
  onViewQr: (booking: BackendBooking) => void;
  onOpenRating: (yard: BackendYardItem, booking?: BackendBooking) => void;
}

export const BookedYardCard: React.FC<BookedYardCardProps> = ({
  yardItem,
  onRebook,
  onViewQr,
  onOpenRating,
}) => {
  const navigate = useNavigate();
  const { yard, bookingCount, liveStatus, relevantBooking } = yardItem;

  const yardName = yard.yardName || `Sân #${yard.id}`;
  const vendorName = yard.vendor?.vendorName || 'Cụm Sân Thể Thao';
  const vendorAddress =
    (yard.vendor as any)?.vendorAddress ||
    (yard.vendor as any)?.address ||
    'Chưa cập nhật địa chỉ';
  const sportName = yard.sportType?.sportName || 'Thể thao';
  const typeName = yard.typeYard?.typeName || 'Sân tiêu chuẩn';
  const pricePerHour = Number(yard.price || 0);

  const imageUrl = (yard as any).imageUrl || getSportImageUrl(sportName || yardName);

  // Format relevant booking time info (supports both ISO string and HH:mm string for monthly)
  const isMonth = Boolean(relevantBooking?.startDate || (relevantBooking as any)?.itemType === 'monthly');
  const startTimeFormatted = relevantBooking ? formatTimeAMPM(relevantBooking.startTime) : '';
  const endTimeFormatted = relevantBooking ? formatTimeAMPM(relevantBooking.endTime) : '';
  const dateFormatted = relevantBooking
    ? isMonth
      ? `${formatDateVietnamese((relevantBooking as any).startDate, { includeWeekday: true })} - ${formatDateVietnamese((relevantBooking as any).endDate)}`
      : formatDateVietnamese(relevantBooking.startTime, { includeWeekday: true })
    : '';

  const isInProgress = liveStatus === 'in_progress';
  const isUpcoming = liveStatus === 'upcoming';
  const isYardDeleted = Boolean((yard as any)?.ondeleted);

  return (
    <div
      className={`bg-white rounded-[24px] border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
        isInProgress
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
          : isUpcoming
          ? 'border-amber-400/80 ring-2 ring-amber-400/20 shadow-md'
          : 'border-[#E6E2D8] shadow-sm hover:shadow-md'
      } ${isYardDeleted ? 'opacity-85 grayscale-[20%]' : ''}`}
    >
      <div>
        {/* Yard Image & Status Badges */}
        <div
          onClick={() => yard?.id && navigate(`/yard/${yard.id}`)}
          className="relative h-48 w-full bg-[#F2F0EB] overflow-hidden cursor-pointer"
          title={isYardDeleted ? 'Sân đã ngừng hoạt động' : 'Bấm để xem thông tin chi tiết sân'}
        >
          <img
            src={imageUrl}
            alt={yardName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

          {/* Top Left: Sport Type Badge & Deleted Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className="px-3 py-1 rounded-full bg-[#006241]/90 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              {sportName}
            </div>
            {isYardDeleted && (
              <div className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                Đã ngừng hoạt động
              </div>
            )}
          </div>

          {/* Top Right: Booking Count Badge */}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#006241] text-[10px] font-extrabold shadow-sm flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#006241]" />
            <span>Đã đặt {bookingCount} lần</span>
          </div>

          {/* Bottom Overlay: Temporary Live Status Notification Badge */}
          {isInProgress && (
            <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-2xl bg-emerald-600/95 backdrop-blur-md text-white shadow-lg border border-emerald-400/40 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <div className="truncate">
                  <div className="text-[11px] font-black uppercase tracking-wider leading-tight flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>Đang trong quá trình sử dụng</span>
                  </div>
                  <div className="text-[10px] font-medium text-emerald-100 truncate">
                    Khung giờ: {startTimeFormatted} - {endTimeFormatted}
                  </div>
                </div>
              </div>
              {relevantBooking && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewQr(relevantBooking);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white text-emerald-800 text-[10px] font-extrabold hover:bg-emerald-50 transition-colors shadow shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Xem mã QR nhận sân"
                >
                  <QrCode className="w-3 h-3" />
                  <span>Mã QR</span>
                </button>
              )}
            </div>
          )}

          {isUpcoming && (
            <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-2xl bg-[#1E3932]/95 backdrop-blur-md text-[#FBF8F0] shadow-lg border border-amber-400/50 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider leading-tight flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Chuẩn bị tới thời gian chơi</span>
                  </div>
                  <div className="text-[10px] font-medium text-gray-200 truncate">
                    Bắt đầu: {startTimeFormatted} ({dateFormatted})
                  </div>
                </div>
              </div>
              {relevantBooking && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewQr(relevantBooking);
                  }}
                  className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1E3932] text-[10px] font-black transition-colors shadow shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Xem mã QR nhận sân"
                >
                  <QrCode className="w-3 h-3" />
                  <span>Mã QR</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Yard Details */}
        <div className="p-5 space-y-3 text-left">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6F7E72] uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
              <span
                onClick={() =>
                  (yard as any)?.vendor?.id &&
                  navigate(`/vendor/${(yard as any).vendor.id}`)
                }
                className="truncate hover:text-[#006241] cursor-pointer transition-colors"
                title="Xem cụm sân của nhà cung cấp này"
              >
                {vendorName}
              </span>
            </div>
            <h3
              onClick={() => yard?.id && navigate(`/yard/${yard.id}`)}
              className="text-base font-extrabold text-[#1E3932] tracking-tight leading-snug mt-0.5 hover:text-[#006241] cursor-pointer transition-colors"
              title="Bấm để xem thông tin chi tiết sân"
            >
              {yardName}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#6F7E72]">
            <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0" />
            <span className="line-clamp-1 font-medium">{vendorAddress}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-semibold text-[#1E3932]">
              <span>Phân loại:</span>
              <span className="text-[#006241] font-bold">{typeName}</span>
            </div>

            {/* If no temp notification, show last booking date */}
            {!isInProgress && !isUpcoming && yardItem.lastBooking && (
              <div className="inline-flex items-center gap-1 text-[11px] text-[#6F7E72] font-mono">
                <Clock className="w-3 h-3 text-[#6F7E72]" />
                <span>Lần đặt gần nhất: {formatDateVietnamese(yardItem.lastBooking.startTime)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price Footer & Action Buttons */}
      <div className="p-5 pt-3 border-t border-[#F2F0EB] bg-[#FBF8F0]/50 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-[#6F7E72] font-extrabold uppercase tracking-wider block">
            Đơn giá thuê
          </span>
          <span className="text-lg font-black text-[#006241] font-mono">
            {pricePerHour.toLocaleString('vi-VN')}đ{' '}
            <span className="text-xs text-[#6F7E72] font-normal">/h</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Rate Yard Button - only enabled if user has completed playing at this yard */}
          {yardItem.allBookings?.some((b) => b.status === 'paid' && new Date(b.endTime) < new Date()) ? (
            <button
              type="button"
              onClick={() => {
                const latestCompleted = yardItem.allBookings
                  ?.filter((b) => b.status === 'paid' && new Date(b.endTime) < new Date())
                  .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];
                onOpenRating(yard, latestCompleted || relevantBooking || undefined);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-amber-50 text-amber-600 border border-amber-300 transition-all cursor-pointer shadow-xs hover:shadow text-xs font-bold"
              title="Đánh giá chất lượng sân này"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Đánh giá</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F2F0EB] text-[#6F7E72] border border-[#E6E2D8] text-xs font-medium cursor-not-allowed opacity-75"
              title="Bạn chỉ có thể đánh giá sau khi hoàn thành lượt chơi"
            >
              <Clock className="w-3.5 h-3.5 text-[#6F7E72]" />
              <span>Chưa thể đánh giá</span>
            </button>
          )}

          {/* View QR Button if there is an active/upcoming booking */}
          {relevantBooking && (
            <button
              type="button"
              onClick={() => onViewQr(relevantBooking)}
              className="p-2.5 rounded-full bg-white hover:bg-[#F2F0EB] text-[#006241] border border-[#006241]/30 transition-all cursor-pointer shadow-sm hover:shadow"
              title="Xem mã QR vé đặt sân"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          {/* Rebook Button */}
          {isYardDeleted ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#E6E2D8] text-[#6F7E72] text-xs font-extrabold cursor-not-allowed border border-[#D5D0C5]"
              title="Sân này hiện đã ngừng hoạt động hoặc đã bị xoá"
            >
              <span>ĐÃ NGỪNG HOẠT ĐỘNG</span>
            </button>
          ) : (
            <button
              type="button"
              tabIndex={1}
              onClick={() => onRebook(yard)}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 border border-[#006241]"
            >
              <Calendar className="w-4 h-4 text-emerald-300" />
              <span>ĐẶT LẠI</span>
              <ArrowRight className="w-3.5 h-3.5 text-white hidden sm:inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
