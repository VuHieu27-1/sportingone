import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  X,
  Sparkles,
  QrCode,
  Mail,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Ticket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerPaymentSuccessCelebration } from '../../utils/celebrationEffects';

export interface PaidBookingQrItem {
  id: number;
  yardName?: string;
  vendorName?: string;
  startTime?: string;
  endTime?: string;
  priced?: number;
  sig?: string;
  verifyUrl?: string;
  isMonth?: boolean;
}

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPaidTab: () => void;
  totalCount: number;
  totalAmount?: number;
  message?: string;
  paidBookings?: PaidBookingQrItem[];
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewPaidTab,
  totalCount,
  totalAmount,
  message,
  paidBookings = [],
}) => {
  const navigate = useNavigate();
  const [selectedBookingIndex, setSelectedBookingIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Trigger celebration confetti & victory chime when modal opens
  useEffect(() => {
    if (isOpen) {
      triggerPaymentSuccessCelebration();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBooking = paidBookings[selectedBookingIndex] || paidBookings[0] || null;

  /**
   * Retrieves VerifyUrl information.
   */
  const getVerifyUrl = (b?: PaidBookingQrItem | null) => {
    if (!b) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    if (b.verifyUrl && !b.verifyUrl.includes(':3000')) {
      return b.verifyUrl;
    }
    const isMonth = b.isMonth || (b as any).bookingType === 'month';
    const typeParam = isMonth ? '&type=month' : '';
    return `${origin}/verify-qr?id=${b.id}&sig=${encodeURIComponent(b.sig || '')}${typeParam}`;
  };

  const currentVerifyUrl = getVerifyUrl(currentBooking);

  /**
   * Retrieves QrImageUrl information.
   */
  const getQrImageUrl = (url: string) => {
    if (!url) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(url)}`;
  };

  /**
   * Handles event processing for handleCopyLink.
   */
  const handleCopyLink = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Đã sao chép link xác thực QR!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Handles clicking to view verified QR code page.
   */
  const handleViewDetails = () => {
    onClose();
    if (currentBooking?.id) {
      const isMonth = currentBooking.isMonth || (currentBooking as any).bookingType === 'month';
      const typeParam = isMonth ? '&type=month' : '';
      navigate(`/verify-qr?id=${currentBooking.id}&sig=${encodeURIComponent(currentBooking.sig || '')}${typeParam}`);
    } else {
      onViewPaidTab();
    }
  };

  const displayAmount = totalAmount && totalAmount > 0
    ? totalAmount
    : (currentBooking?.priced || 0);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif] overflow-y-auto">
      <div className="bg-white w-full max-w-[420px] rounded-[26px] shadow-2xl overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200 relative my-4">
        
        {/* ================= HERO HEADER ================= */}
        <div className="bg-gradient-to-br from-[#1E3932] via-[#006241] to-[#044E35] text-white p-5 sm:p-6 text-center relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-300/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20 backdrop-blur-xs"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Sporting ONE E-Ticket</span>
          </div>

          {/* Integrated Clean Checkmark Badge */}
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg shadow-black/10 mb-2.5 animate-success-pop">
            <svg
              className="w-7 h-7 text-emerald-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" className="animate-checkmark-draw" />
            </svg>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mb-1">
            Thanh Toán Thành Công!
          </h2>

          <p className="text-xs text-emerald-100/80 font-medium">
            Sân của bạn đã được xác nhận giữ lịch 100%
          </p>

          {displayAmount > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
              <span className="text-emerald-100/70 font-semibold">Tổng tiền thanh toán:</span>
              <span className="font-mono font-black text-emerald-300 text-sm sm:text-base">
                {displayAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}
        </div>

        {/* ================= TICKET PERFORATED DIVIDER ================= */}
        <div className="relative flex items-center bg-[#FAF8F5] py-2">
          <div className="w-4 h-4 bg-black/70 rounded-r-full -ml-2 border-r border-slate-700/50 shadow-inner" />
          <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2" />
          <div className="w-4 h-4 bg-black/70 rounded-l-full -mr-2 border-l border-slate-700/50 shadow-inner" />
        </div>

        {/* ================= TICKET BODY ================= */}
        <div className="p-5 bg-[#FAF8F5] space-y-3.5">
          
          {/* Multi-court switcher if batch */}
          {paidBookings.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {paidBookings.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedBookingIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    selectedBookingIndex === idx
                      ? 'bg-[#006241] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Sân #{item.id}
                </button>
              ))}
            </div>
          )}

          {/* QR Code Container */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-2.5">
            <div className="flex items-center justify-between w-full text-[11px] pb-2 border-b border-slate-100">
              <span className="font-mono font-extrabold text-slate-800 flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-[#006241]" />
                MÃ ĐƠN #{currentBooking?.id || ''}
              </span>
              <span className="font-extrabold text-[#006241] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                ĐÃ GIỮ CHỖ
              </span>
            </div>

            {/* QR Image with Framing */}
            <div className="relative p-2 bg-[#FBFBF9] rounded-xl border border-slate-200/70 shadow-inner">
              <div className="w-36 h-36 flex items-center justify-center bg-white rounded-lg relative overflow-hidden">
                {currentVerifyUrl ? (
                  <img
                    src={getQrImageUrl(currentVerifyUrl)}
                    alt={`Mã QR #${currentBooking?.id || ''}`}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-400 p-2">
                    <QrCode className="w-8 h-8 text-[#006241]/40 animate-pulse" />
                    <span className="text-[10px] font-semibold text-slate-500">Mã QR đã sẵn sàng</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Xuất trình mã QR này tại quầy lễ tân để nhận sân
            </p>
          </div>

          {/* Booking Info Grid */}
          {currentBooking && (
            <div className="bg-white rounded-xl p-3 border border-slate-200/80 text-xs space-y-2">
              {currentBooking.yardName && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006241]" />
                    Sân thi đấu:
                  </span>
                  <span className="font-extrabold text-slate-900">{currentBooking.yardName}</span>
                </div>
              )}

              {currentBooking.startTime && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#006241]" />
                    Khung giờ:
                  </span>
                  <span className="font-bold font-mono text-[#006241]">
                    {currentBooking.startTime} - {currentBooking.endTime}
                  </span>
                </div>
              )}

              {currentBooking.vendorName && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#006241]" />
                    Cơ sở:
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {currentBooking.vendorName}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Email notice */}
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5 pt-0.5">
            <Mail className="w-3.5 h-3.5 text-[#006241] shrink-0" />
            <span>Đã gửi xác nhận và vé qua Email</span>
          </div>

        </div>

        {/* ================= ACTION FOOTER ================= */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleViewDetails}
              className="py-2.5 px-3 rounded-xl bg-[#1E3932] hover:bg-[#006241] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Xem Vé Chi Tiết</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer active:scale-95 text-center"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
