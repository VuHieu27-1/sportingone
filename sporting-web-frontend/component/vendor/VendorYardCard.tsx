import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, ShieldCheck, CheckCircle2, Clock, Lock, ArrowUpRight } from 'lucide-react';
import { BackendYardItem } from '../../services/vendorService';
import { BackendBooking } from '../../services/bookingService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { getSportImageUrl } from '../../utils/sportImageUtils';

interface VendorYardCardProps {
  yard: BackendYardItem;
  vendorName: string;
  paidBookings?: BackendBooking[];
  timeFilter?: { date: string; startTime: string; endTime: string } | null;
  onBookYard: (yard: BackendYardItem) => void;
  onViewDetails?: (yard: BackendYardItem) => void;
}

export const VendorYardCard: React.FC<VendorYardCardProps> = ({
  yard,
  vendorName,
  paidBookings = [],
  timeFilter = null,
  onBookYard,
  onViewDetails,
}) => {
  const navigate = useNavigate();
  const sportName = yard.sportType?.sportName || 'Thể thao';
  const typeName = yard.typeYard?.typeName || 'Sân tiêu chuẩn';
  const priceFormatted = yard.price
    ? `${Number(yard.price).toLocaleString('vi-VN')}đ`
    : 'Liên hệ';

  const now = new Date();
  const nowMs = now.getTime();
  const todayDateStr = now.toISOString().split('T')[0];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const yardPaidBookings = paidBookings.filter((b) => {
    const isThisYard = Number(b.yard?.id) === Number(yard.id);
    const isPaid = String(b.status || '').toLowerCase().trim() === 'paid';
    if (!isThisYard || !isPaid) return false;

    const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
    if (isMonthly && b.startDate && b.endDate) {
      return todayDateStr <= b.endDate;
    }
    const endMs = new Date(b.endTime).getTime();
    return !isNaN(endMs) && endMs > nowMs;
  });

  let isOccupied = false;

  if (timeFilter && timeFilter.date && timeFilter.startTime && timeFilter.endTime) {
    const [sH, sM] = timeFilter.startTime.split(':').map(Number);
    const [eH, eM] = timeFilter.endTime.split(':').map(Number);
    const reqStartMins = sH * 60 + sM;
    const reqEndMins = eH * 60 + eM;

    const reqStartObj = new Date(timeFilter.date);
    reqStartObj.setHours(sH, sM, 0, 0);

    const reqEndObj = new Date(timeFilter.date);
    reqEndObj.setHours(eH, eM, 0, 0);

    const reqStartMs = reqStartObj.getTime();
    const reqEndMs = reqEndObj.getTime();

    isOccupied = yardPaidBookings.some((b) => {
      const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
      if (isMonthly && b.startDate && b.endDate) {
        if (timeFilter.date >= b.startDate && timeFilter.date <= b.endDate) {
          const [mSH, mSM] = (b.startTime || '00:00').split(':').map(Number);
          const [mEH, mEM] = (b.endTime || '23:59').split(':').map(Number);
          const mStartMins = mSH * 60 + mSM;
          const mEndMins = mEH * 60 + mEM;
          return mStartMins < reqEndMins && mEndMins > reqStartMins;
        }
        return false;
      }
      const bStartMs = new Date(b.startTime).getTime();
      const bEndMs = new Date(b.endTime).getTime();
      return !isNaN(bStartMs) && !isNaN(bEndMs) && bStartMs < reqEndMs && bEndMs > reqStartMs;
    });
  } else {
    isOccupied = yardPaidBookings.some((b) => {
      const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
      if (isMonthly && b.startDate && b.endDate) {
        if (todayDateStr >= b.startDate && todayDateStr <= b.endDate) {
          const [mSH, mSM] = (b.startTime || '00:00').split(':').map(Number);
          const [mEH, mEM] = (b.endTime || '23:59').split(':').map(Number);
          const mStartMins = mSH * 60 + mSM;
          const mEndMins = mEH * 60 + mEM;
          return nowMinutes >= mStartMins && nowMinutes < mEndMins;
        }
        return false;
      }
      const startMs = new Date(b.startTime).getTime();
      const endMs = new Date(b.endTime).getTime();
      return !isNaN(startMs) && !isNaN(endMs) && nowMs >= startMs && nowMs < endMs;
    });
  }

  const isUnderMaintenance = yard.status === 'maintenance';
  const isAvailable = !isUnderMaintenance && !isOccupied;

  /**
   * Retrieves YardImage information.
   */
  const getYardImage = (sport: string) => {
    const coverImageObj = Array.isArray(yard.images)
      ? yard.images.find((img) => img.isCover) || yard.images[0]
      : null;
    return (
      coverImageObj?.imageUrl ||
      (yard as any).imageUrl ||
      getSportImageUrl(sport || yard.yardName)
    );
  };

    const handleOpenDetails = () => {
      if (onViewDetails) {
        onViewDetails(yard);
      } else {
        navigate(`/yard/${yard.id}`);
      }
    };

    return (
      <div className="bg-[#FBF8F0] rounded-[24px] border border-[#E6E2D8] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#006241]/40 transition-all duration-300 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] group">
        <div
          onClick={handleOpenDetails}
          className="relative h-48 overflow-hidden bg-[#F2F0EB] cursor-pointer"
        >
          <img
            src={getYardImage(sportName)}
            alt={yard.yardName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241] text-white font-mono text-[10px] font-extrabold uppercase tracking-wider shadow-md">
            <span>{sportName}</span>
          </div>

          {yard.sale?.discountPercent && yard.sale.discountPercent > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
              <Tag className="w-3 h-3" />
              <span>Giảm {yard.sale.discountPercent}%</span>
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
            <div>
              <h4 className="text-lg font-extrabold text-white leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                {yard.yardName}
              </h4>
              <span className="text-xs text-white/80 font-medium">{vendorName}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[11px] font-extrabold text-[#1E3932]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006241]" />
              {typeName}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isOccupied
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                  : isAvailable
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-800'
              }`}
            >
              {isOccupied ? (
                <>
                  <Lock className="w-3 h-3 text-rose-600" />
                  <span>Sân Đã Có Người Đặt</span>
                </>
              ) : isAvailable ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-[#006241]" />
                  <span>Sẵn Sàng Đặt</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Đang Bảo Trì</span>
                </>
              )}
            </span>
          </div>

                    <div className="relative group/tooltip">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6F7E72] mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                <span>Khung giờ đã đặt:</span>
              </span>
              {yardPaidBookings.length > 0 && (
                <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {yardPaidBookings.length} lượt
                </span>
              )}
            </div>

            {yardPaidBookings.length === 0 ? (
              <div className="text-xs text-emerald-700 font-medium bg-emerald-50/60 border border-emerald-200/60 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006241]" />
                <span>Chưa có lịch đặt (Sân trống)</span>
              </div>
            ) : (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between cursor-help transition-all hover:bg-amber-100/90 shadow-sm">
                <div className="truncate flex-1 pr-2 font-mono">
                  {yardPaidBookings
                    .slice(0, 2)
                    .map((b) => {
                      const s = new Date(b.startTime);
                      const e = new Date(b.endTime);
                      const sTime = formatTimeAMPM(s);
                      const eTime = formatTimeAMPM(e);
                      const dateStr = s.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                      });
                      return `${sTime}-${eTime} (${dateStr})`;
                    })
                    .join(', ')}
                  {yardPaidBookings.length > 2 && '...'}
                </div>
                {yardPaidBookings.length > 2 && (
                  <span className="text-[10px] text-amber-800 font-extrabold underline shrink-0">
                    + Xem tất cả
                  </span>
                )}

                                <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-30 p-3 bg-[#1E3932] text-white rounded-2xl shadow-xl border border-white/20 text-xs font-medium space-y-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                  <div className="font-extrabold text-emerald-400 text-[11px] uppercase tracking-wider pb-1 border-b border-white/10 flex items-center justify-between">
                    <span>Tất cả khung giờ đã đặt</span>
                    <span className="font-mono text-white text-[10px]">
                      {yardPaidBookings.length} đơn
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {yardPaidBookings.map((b, idx) => {
                      const s = new Date(b.startTime);
                      const e = new Date(b.endTime);
                      const sTime = formatTimeAMPM(s);
                      const eTime = formatTimeAMPM(e);
                      const dateStr = s.toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      });
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1 border-b border-white/5 last:border-0 font-mono text-[11px]"
                        >
                          <span className="text-emerald-300 font-bold">
                            {sTime} - {eTime}
                          </span>
                          <span className="text-white/80">{dateStr}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

                    <div className="pt-2 flex items-baseline justify-between border-t border-[#E6E2D8]/60">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block">
                GIÁ THUÊ CỐ ĐỊNH
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#006241] font-mono">
                  {priceFormatted}
                </span>
                <span className="text-xs font-semibold text-[#6F7E72]">/ giờ</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-[#6F7E72]">
              <Clock className="w-3.5 h-3.5 text-[#006241]" />
              <span>60 phút</span>
            </div>
          </div>
        </div>

                <button
          onClick={() => onBookYard(yard)}
          disabled={!isAvailable}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-full font-mono text-xs font-extrabold transition-all duration-300 uppercase tracking-wider ${
            isOccupied
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none'
              : isUnderMaintenance
              ? 'bg-rose-100 text-rose-700 cursor-not-allowed border border-rose-200 shadow-none'
              : 'bg-[#006241] hover:bg-[#1E3932] text-white shadow-md cursor-pointer'
          }`}
        >
          {isOccupied ? (
            <>
              <Lock className="w-4 h-4 text-slate-500" />
              <span>KHUNG GIỜ NÀY ĐÃ ĐƯỢC ĐẶT</span>
            </>
          ) : isUnderMaintenance ? (
            <>
              <Clock className="w-4 h-4 text-rose-600" />
              <span>SÂN ĐANG TẠM ĐÓNG BẢO TRÌ</span>
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              <span>ĐẶT LỊCH SÂN NGAY</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
