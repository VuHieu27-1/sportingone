import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  XCircle,
  CreditCard,
  Building2,
  Check,
  Coins,
  QrCode,
  RotateCcw,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendBooking } from '../../services/bookingService';
import { timeService } from '../../services/timeService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { getSportImageUrl } from '../../utils/sportImageUtils';

interface CartItemCardProps {
  booking: BackendBooking;
  isSelected: boolean;
  onToggleSelect: (bookingId: number) => void;
  onPaySingle: (bookingId: number) => void;
  onCancelSingle: (bookingId: number) => void;
  onHideSingle: (bookingId: number) => void;
  onCancelPaid?: (bookingId: number) => void;
  onViewQr?: (booking: BackendBooking) => void;
  onOpenRating?: (booking: BackendBooking) => void;
  isProcessing: boolean;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  booking,
  isSelected,
  onToggleSelect,
  onPaySingle,
  onCancelSingle,
  onHideSingle,
  onCancelPaid,
  onViewQr,
  onOpenRating,
  isProcessing,
}) => {
  const navigate = useNavigate();
  const yardId = booking.yard?.id || (booking as any).yardId;
  const isYardDeleted = Boolean((booking.yard as any)?.ondeleted || !booking.yard);
  const rawYardName = booking.yard?.yardName;
  const yardName = rawYardName
    ? rawYardName
    : yardId
      ? `Sân #${yardId} (Đã dừng hoạt động)`
      : 'Sân không khả dụng';

  const vendorName =
    (booking.yard?.vendor as any)?.vendorName ||
    (booking.yard?.vendor as any)?.name ||
    'Cụm Sân Thể Thao';
  const vendorAddress =
    (booking.yard?.vendor as any)?.vendorAddress ||
    (booking.yard?.vendor as any)?.address ||
    'Chưa cập nhật địa chỉ';
  const sportName = booking.yard?.sportType?.sportName || 'Thể thao';
  const typeName = booking.yard?.typeYard?.typeName || 'Sân tiêu chuẩn';
  const pricePerHour = Number(booking.yard?.price || 0);
  const isMonthlyBooking = (booking as any).itemType === 'monthly' || Boolean((booking as any).startDate);

  let startDateStr = '';
  let endDateStr = '';
  let startTimeStr = '';
  let endTimeStr = '';
  let dateStr = '';
  let durationHours = 1;
  let totalPrice = 0;
  let startMs = 0;

  if (isMonthlyBooking) {
    const rawStartDate = String((booking as any).startDate).split('T')[0];
    const rawEndDate = String((booking as any).endDate).split('T')[0];
    const sParts = rawStartDate.split('-');
    const eParts = rawEndDate.split('-');
    startDateStr = sParts.length === 3 ? `${sParts[2]}/${sParts[1]}/${sParts[0]}` : rawStartDate;
    endDateStr = eParts.length === 3 ? `${eParts[2]}/${eParts[1]}/${eParts[0]}` : rawEndDate;
    startTimeStr = (booking as any).startTime || '08:00';
    endTimeStr = (booking as any).endTime || '10:00';
    totalPrice = Number(booking.priced || 0);

    const startDateTime = new Date(`${rawStartDate}T${startTimeStr}:00`);
    startMs = startDateTime.getTime();
  } else {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    durationHours = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)),
    );
    totalPrice =
      booking.priced && Number(booking.priced) > 0
        ? Number(booking.priced)
        : pricePerHour * durationHours;

    dateStr = start.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    startTimeStr = formatTimeAMPM(start);
    endTimeStr = formatTimeAMPM(end);
    startMs = start.getTime();
  }

  const monthlyPackageLabel = (booking as any).bookingType === 'month' ? 'Gói 1 tháng' : ((booking as any).bookingType || 'Gói theo tháng');

  const status = booking.status || 'unpaid';
  const isUnpaid = status === 'unpaid';
  const isPaid = status === 'paid';
  const isCancelled = status === 'cancelled';
  const isRefund = status === 'refund';
  const isRefunded = status === 'refunded';
  const nowMs = timeService.getNowMs();
  const msUntilStart = startMs - nowMs;
  const oneHourMs = 60 * 60 * 1000;
  const isFuturePaid = isPaid && startMs > nowMs;
  const canCancelPaid = isPaid && msUntilStart >= oneHourMs;
  const isExpired = isUnpaid && startMs <= nowMs;

  /**
   * Retrieves YardImage information.
   */
  const getYardImage = (sport: string) => {
    return (
      (booking.yard as any)?.imageUrl ||
      getSportImageUrl(sport || booking.yard?.yardName)
    );
  };

  return (
    <article
      className={`relative rounded-[24px] overflow-hidden border transition-all duration-300 p-4 sm:p-5 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932] ${isSelected && isUnpaid
        ? 'bg-white border-[#006241] ring-2 ring-[#006241]/20 shadow-md'
        : 'bg-[#FBF8F0] border-[#E6E2D8] hover:border-[#1E3932]/30 shadow-sm hover:shadow-md'
        }`}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5">
        <div
          onClick={() => {
            if (booking.yard?.id && !isYardDeleted) {
              navigate(`/yard/${booking.yard.id}`);
            } else if (isYardDeleted) {
              toast.error('Sân này hiện đã dừng hoạt động hoặc đã bị xoá khỏi hệ thống.');
            } else if (isUnpaid) {
              onToggleSelect(booking.id);
            }
          }}
          className={`relative w-full sm:w-48 sm:self-stretch min-h-[145px] h-40 sm:h-auto rounded-2xl overflow-hidden bg-[#F2F0EB] border border-[#E6E2D8] shrink-0 group ${isYardDeleted ? 'opacity-85 cursor-not-allowed' : 'cursor-pointer'
            }`}
          title={isYardDeleted ? 'Sân này đã dừng hoạt động' : 'Bấm để xem thông tin chi tiết sân'}
        >
          <img
            src={getYardImage(sportName)}
            alt={yardName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Checkbox button for selection on ALL cards */}
          <div className="absolute top-2.5 left-2.5 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(booking.id);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer border ${isSelected
                ? isUnpaid
                  ? 'bg-[#006241] border-white text-white scale-110 ring-2 ring-[#006241]/30'
                  : 'bg-rose-600 border-white text-white scale-110 ring-2 ring-rose-600/30'
                : 'bg-black/35 hover:bg-black/60 border-white/80 text-transparent backdrop-blur-md'
                }`}
              title={isSelected ? 'Bỏ chọn đơn này' : isUnpaid ? 'Chọn đơn này để thanh toán' : 'Chọn đơn này để xóa'}
            >
              <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          </div>

          <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#006241]/90 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm z-10">
            {sportName}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between space-y-2.5 w-full">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6F7E72] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                  <span
                    onClick={() => (booking.yard?.vendor as any)?.id && navigate(`/vendor/${(booking.yard?.vendor as any).id}`)}
                    className="line-clamp-1 hover:text-[#006241] cursor-pointer transition-colors"
                    title="Xem cụm sân của nhà cung cấp này"
                  >
                    {vendorName}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <h3
                    onClick={() => {
                      if (booking.yard?.id && !isYardDeleted) {
                        navigate(`/yard/${booking.yard.id}`);
                      } else if (isYardDeleted) {
                        toast.error('Sân này hiện đã dừng hoạt động hoặc đã bị xoá khỏi hệ thống.');
                      }
                    }}
                    className={`text-lg font-extrabold text-[#1E3932] tracking-tight leading-snug transition-colors ${isYardDeleted ? 'opacity-70 cursor-not-allowed' : 'hover:text-[#006241] cursor-pointer'
                      }`}
                    title={isYardDeleted ? 'Sân đã dừng hoạt động' : 'Bấm để xem thông tin chi tiết sân'}
                  >
                    {yardName}
                  </h3>
                  {isYardDeleted && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase">
                      Đã Dừng Hoạt Động
                    </span>
                  )}
                </div>
              </div>

              {isUnpaid && !isExpired && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-extrabold shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Chờ Thanh Toán
                </span>
              )}
              {isUnpaid && isExpired && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs font-extrabold shadow-2xs animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  Đã Quá Giờ Bắt Đầu
                </span>
              )}
              {isPaid && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] text-xs font-extrabold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                  Đã Thanh Toán
                </span>
              )}
              {isRefund && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-extrabold shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Chờ Hoàn Tiền
                </span>
              )}
              {isRefunded && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-800 text-xs font-extrabold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Đã Hoàn Tiền
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-800 text-xs font-extrabold shadow-2xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  Đã Hủy
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#6F7E72]">
              <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0" />
              <span className="line-clamp-1 font-medium">{vendorAddress}</span>
            </div>

            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-xs text-[#1E3932] font-semibold max-w-full">
              <Clock className="w-3.5 h-3.5 text-[#006241] shrink-0" />
              <span className="font-mono break-all sm:break-normal">
                {isMonthlyBooking
                  ? `${startTimeStr} - ${endTimeStr} hàng ngày (${startDateStr} đến ${endDateStr})`
                  : `${startTimeStr} - ${endTimeStr} (${dateStr})`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E6E2D8] text-[11px] font-medium text-[#6F7E72] shrink-0">
                {isMonthlyBooking ? `${monthlyPackageLabel} (${typeName})` : `${durationHours} giờ (${typeName})`}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E6E2D8] flex flex-wrap items-center justify-between gap-3 mt-1">
            <div>
              <span className="text-[10px] text-[#6F7E72] font-extrabold uppercase tracking-wider block">
                Chi phí thuê sân
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#006241] font-mono">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-xs text-[#6F7E72] font-normal">
                  ({pricePerHour.toLocaleString('vi-VN')}đ/h)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {isUnpaid && (
                <>
                  <button
                    onClick={() => onCancelSingle(booking.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#FBF8F0] hover:bg-rose-50 border border-[#E6E2D8] hover:border-rose-300 text-[#6F7E72] hover:text-rose-700 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Hủy đơn đặt sân này"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Hủy Đơn</span>
                  </button>

                  <button
                    onClick={() => onPaySingle(booking.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thanh Toán Sân Này</span>
                    <span className="sm:hidden">Thanh Toán</span>
                  </button>
                </>
              )}

              {isPaid && (
                <>
                  <button
                    type="button"
                    onClick={() => onViewQr && onViewQr(booking)}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 border border-[#006241] shrink-0"
                    title="Xem mã QR và chi tiết sân thi đấu"
                  >
                    <QrCode className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="hidden sm:inline">Xem thông tin đặt sân</span>
                    <span className="sm:hidden">Xem vé QR</span>
                  </button>

                  {/* Review / Rate Yard Button */}
                  {onOpenRating && booking.yard?.id && (
                    <button
                      type="button"
                      onClick={() => onOpenRating(booking)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-amber-50 border border-amber-300 text-amber-600 hover:text-amber-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                      title="Đánh giá chất lượng của sân này"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Đánh giá sân</span>
                    </button>
                  )}

                  {!isMonthlyBooking && isFuturePaid && onCancelPaid && (
                    canCancelPaid ? (
                      <button
                        type="button"
                        onClick={() => onCancelPaid(booking.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Hủy đơn đặt sân này và tự động hoàn tiền vào ví."
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hủy đơn này</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          toast.error('Đã gần tới giờ chơi, không thể hủy đơn đặt sân.');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-500 text-xs font-semibold transition-all cursor-not-allowed shadow-2xs opacity-80"
                        title="Không thể hủy đơn đặt sân khi thời gian bắt đầu còn dưới 1 tiếng."
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Không thể hủy</span>
                      </button>
                    )
                  )}
                </>
              )}

              {status === 'refund' && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
                  Chờ hoàn tiền
                </span>
              )}

              {status === 'refunded' && (
                <span className="text-xs font-semibold text-purple-800 bg-purple-500/10 px-3.5 py-1.5 rounded-full border border-purple-500/20">
                  Đã hoàn tiền vào ví
                </span>
              )}

              {isCancelled && (
                <span className="text-xs font-semibold text-rose-800 bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20">
                  Đã hủy
                </span>
              )}

              {(isCancelled || isPaid || isRefund || isRefunded) && (
                <button
                  onClick={() => onHideSingle(booking.id)}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#E6E2D8] text-[#6F7E72] hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer"
                  title="Xoá đơn đặt sân này (Xóa mềm - Soft Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
