import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, QrCode, Copy, Check, MapPin, Clock, Building2, Calendar, ShieldCheck, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendBooking } from '../../services/bookingService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { downloadQrTicketImage } from '../../utils/qrCanvasUtils';

interface BookingDetailQrModalProps {
  booking: BackendBooking | null;
  onClose: () => void;
}

export const BookingDetailQrModal: React.FC<BookingDetailQrModalProps> = ({
  booking,
  onClose,
}) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  if (!booking) return null;

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

  const isMonthly = (booking as any).itemType === 'monthly' || Boolean((booking as any).startDate);

  let dateStr = '';
  let startTimeStr = '';
  let endTimeStr = '';
  let totalPrice = 0;
  let durationHours = 1;

  if (isMonthly) {
    const rawStartDate = String((booking as any).startDate).split('T')[0];
    const rawEndDate = String((booking as any).endDate).split('T')[0];
    const sParts = rawStartDate.split('-');
    const eParts = rawEndDate.split('-');
    const startDateStr = sParts.length === 3 ? `${sParts[2]}/${sParts[1]}/${sParts[0]}` : rawStartDate;
    const endDateStr = eParts.length === 3 ? `${eParts[2]}/${eParts[1]}/${eParts[0]}` : rawEndDate;
    dateStr = `Từ ${startDateStr} đến ${endDateStr}`;
    startTimeStr = (booking as any).startTime || '08:00';
    endTimeStr = (booking as any).endTime || '10:00';
    totalPrice = Number(booking.priced || 0);
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
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    startTimeStr = formatTimeAMPM(start);
    endTimeStr = formatTimeAMPM(end);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const typeParam = isMonthly ? '&type=month' : '';
  const verifyUrl =
    booking.verifyUrl && !booking.verifyUrl.includes(':3000')
      ? booking.verifyUrl
      : `${origin}/verify-qr?id=${booking.id}&sig=${encodeURIComponent(booking.sig || '')}${typeParam}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&margin=8&data=${encodeURIComponent(
    verifyUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setIsCopied(true);
    toast.success('Đã sao chép đường link mã QR xác thực!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleViewVerifyPage = () => {
    onClose();
    navigate(`/verify-qr?id=${booking.id}&sig=${encodeURIComponent(booking.sig || '')}${typeParam}`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-200 relative my-4 text-[#1E3932]">
        {/* Close Button */}
        <button
          onClick={onClose}
          tabIndex={1}
          className="absolute top-4 right-4 text-[#6F7E72] hover:text-[#1E3932] p-2 rounded-full hover:bg-[#F2F0EB] transition-colors cursor-pointer z-10"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="space-y-1 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mã QR Đã Giữ Lịch</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3932] tracking-tight">
            Thông Tin Sân &amp; Mã QR
          </h3>
          <p className="text-xs text-[#6F7E72] font-medium">
            Xuất trình mã QR này tại quầy lễ tân cụm sân để nhận sân thi đấu
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-5 rounded-3xl bg-white border border-[#E6E2D8] shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase block">
                MÃ ĐƠN HÀNG
              </span>
              <span className="font-extrabold font-mono text-base text-[#1E3932]">
                #{booking.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#006241] bg-[#006241]/10 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#006241]" />
                ĐÃ THANH TOÁN
              </span>
            </div>
          </div>

          {/* QR Image */}
          <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl border-2 border-[#006241]/20 flex items-center justify-center shadow-md">
            <img
              src={qrImageUrl}
              alt={`Mã QR Đơn #${booking.id}`}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>

          {/* Actions: View Verify Page, Download, Copy */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              tabIndex={2}
              onClick={handleViewVerifyPage}
              className="px-4 py-2 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-md border border-[#006241]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
              <span>Xem Xác Thực QR</span>
            </button>

            <button
              type="button"
              tabIndex={2}
              onClick={() => downloadQrTicketImage(booking, verifyUrl, qrImageUrl)}
              className="px-4 py-2 rounded-full bg-[#1E3932] hover:bg-[#006241] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[#1E3932]"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tải Thẻ QR (PNG)</span>
            </button>

            <button
              type="button"
              tabIndex={2}
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[#E6E2D8]"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã Sao Chép Link</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#006241]" />
                  <span>Sao Chép Link QR</span>
                </>
              )}
            </button>
          </div>

          {/* Venue & Booking Details */}
          <div className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-[#E6E2D8] pb-2">
              <div className="flex items-center gap-1.5 text-[#6F7E72] font-semibold">
                <Building2 className="w-4 h-4 text-[#006241] shrink-0" />
                <span>Cơ sở / Cụm sân:</span>
              </div>
              <span className="font-extrabold text-[#1E3932] text-right">{vendorName}</span>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-[#E6E2D8] pb-2">
              <div className="flex items-center gap-1.5 text-[#6F7E72] font-semibold">
                <QrCode className="w-4 h-4 text-[#006241] shrink-0" />
                <span>Sân thi đấu:</span>
              </div>
              <span className="font-extrabold text-[#006241] text-right">{yardName} ({typeName})</span>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-[#E6E2D8] pb-2">
              <div className="flex items-center gap-1.5 text-[#6F7E72] font-semibold">
                <Calendar className="w-4 h-4 text-[#006241] shrink-0" />
                <span>Ngày thi đấu:</span>
              </div>
              <span className="font-bold text-[#1E3932] text-right capitalize">{dateStr}</span>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-[#E6E2D8] pb-2">
              <div className="flex items-center gap-1.5 text-[#6F7E72] font-semibold">
                <Clock className="w-4 h-4 text-[#006241] shrink-0" />
                <span>Khung giờ:</span>
              </div>
              <span className="font-bold font-mono text-[#1E3932] text-right">
                {isMonthly ? `${startTimeStr} - ${endTimeStr} hàng ngày (Gói theo tháng)` : `${startTimeStr} - ${endTimeStr} (${durationHours} tiếng)`}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-[#E6E2D8] pb-2">
              <div className="flex items-center gap-1.5 text-[#6F7E72] font-semibold">
                <MapPin className="w-4 h-4 text-[#006241] shrink-0" />
                <span>Địa chỉ sân:</span>
              </div>
              <span className="font-medium text-[#1E3932] text-right max-w-[240px] leading-tight">
                {vendorAddress}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#6F7E72] font-semibold">Tổng tiền thanh toán:</span>
              <span className="text-base font-black font-mono text-[#006241]">
                {totalPrice.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5">
          <button
            type="button"
            tabIndex={3}
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
