import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  User,
  Store,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { BackendBooking } from '../../services/bookingService';
import toast from 'react-hot-toast';

export interface AdminTransactionDetailModalProps {
  isOpen: boolean;
  booking: BackendBooking | null;
  onClose: () => void;
}

export const AdminTransactionDetailModal: React.FC<AdminTransactionDetailModalProps> = ({
  isOpen,
  booking,
  onClose,
}) => {
  if (!isOpen || !booking) return null;

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDurationHours = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 1;
    return Math.max(0.5, Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10);
  };

  const durationHours = getDurationHours(booking.startTime, booking.endTime);
  const calculatedPrice = booking.priced
    ? Number(booking.priced)
    : Number(booking.yard?.price || 0) * durationHours;

  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#006241] border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã thanh toán
          </span>
        );
      case 'refund':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5" />
            Đang hoàn tiền
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn tiền
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">
            <Clock className="w-3.5 h-3.5" />
            Chờ thanh toán (Unpaid)
          </span>
        );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E2D8] overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-[#FAF8F5] border-b border-[#E6E2D8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center border border-[#006241]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#1E3932]">
                  Chi Tiết Giao Dịch #{booking.id}
                </h3>
                {renderStatusBadge(booking.status)}
              </div>
              <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
                Mã đơn kiểm toán trực tiếp từ Database Backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#1E3932]">
          {/* Amount Overview Card */}
          <div className="p-5 rounded-2xl bg-linear-to-br from-[#006241]/5 to-emerald-50 border border-[#006241]/15 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6F7E72] uppercase tracking-wider">
                Tổng Giá Trị Thanh Toán
              </p>
              <div className="text-2xl font-black text-[#006241] mt-1 flex items-center gap-1.5">
                <CreditCard className="w-6 h-6" />
                <span>{calculatedPrice.toLocaleString('vi-VN')} Xu</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[#6F7E72]">Thời lượng thuê</p>
              <p className="text-sm font-extrabold text-[#1E3932]">{durationHours} giờ</p>
            </div>
          </div>

          {/* Customer & Vendor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F0EB]">
                <User className="w-4 h-4 text-[#006241]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
                  Khách Hàng (User)
                </h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[#6F7E72]">Tên tài khoản: </span>
                  <span className="font-bold text-[#1E3932]">
                    {booking.user?.username || `User #${booking.user?.id || 'N/A'}`}
                  </span>
                </div>
                <div>
                  <span className="text-[#6F7E72]">Email: </span>
                  <span className="font-medium text-[#1E3932]">
                    {booking.user?.email || 'Chưa cập nhật email'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6F7E72]">User ID: </span>
                  <span className="font-mono text-[#006241] font-bold">
                    #{booking.user?.id || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F0EB]">
                <Store className="w-4 h-4 text-[#006241]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
                  Chủ Sân (Vendor)
                </h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[#6F7E72]">Tên Vendor: </span>
                  <span className="font-bold text-[#1E3932]">
                    {booking.yard?.vendor?.vendorName || 'N/A'}
                  </span>
                </div>
                {booking.yard?.vendor?.vendorPhone && (
                  <div className="flex items-center gap-1 text-[#1E3932]">
                    <Phone className="w-3 h-3 text-[#6F7E72]" />
                    <span>{booking.yard.vendor.vendorPhone}</span>
                  </div>
                )}
                {booking.yard?.vendor?.vendorAddress && (
                  <div className="flex items-start gap-1 text-[#1E3932] truncate">
                    <MapPin className="w-3 h-3 text-[#6F7E72] shrink-0 mt-0.5" />
                    <span className="truncate">{booking.yard.vendor.vendorAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Court & Time Details */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E2D8]">
              <Building2 className="w-4 h-4 text-[#006241]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
                Thông Tin Sân & Lịch Đặt
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#6F7E72]">Tên sân thi đấu:</p>
                <p className="font-extrabold text-[#1E3932] text-sm mt-0.5">
                  {booking.yard?.yardName || `Sân #${booking.yard?.id || 'N/A'}`}
                </p>
              </div>

              <div>
                <p className="text-[#6F7E72]">Loại sân & Môn thể thao:</p>
                <p className="font-bold text-[#006241] mt-0.5">
                  {booking.yard?.typeYard?.typeName || booking.yard?.sportType?.sportName || 'Thể thao'}
                </p>
              </div>

              {booking.startDate ? (
                <>
                  <div>
                    <p className="text-[#6F7E72]">Thời hạn gói tháng:</p>
                    <p className="font-semibold text-[#1E3932] flex items-center gap-1 mt-0.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                      Từ {String(booking.startDate).split('T')[0]} đến {String(booking.endDate).split('T')[0]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6F7E72]">Khung giờ hàng ngày:</p>
                    <p className="font-semibold text-[#1E3932] flex items-center gap-1 mt-0.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#006241]" />
                      {booking.startTime} - {booking.endTime}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[#6F7E72]">Thời gian bắt đầu:</p>
                    <p className="font-semibold text-[#1E3932] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                      {formatDateTime(booking.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6F7E72]">Thời gian kết thúc:</p>
                    <p className="font-semibold text-[#1E3932] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      {formatDateTime(booking.endTime)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Digital Signature & QR Audit */}
          {booking.sig && (
            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6F7E72] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#006241]" />
                  Chữ Ký Số SHA-256 Xác Thực QR
                </span>
                <button
                  onClick={() => copyToClipboard(booking.sig!, 'chữ ký số SHA-256')}
                  className="text-xs font-bold text-[#006241] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Sao chép signature
                </button>
              </div>
              <p className="text-xs font-mono bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E6E2D8] text-[#1E3932] break-all">
                {booking.sig}
              </p>

              {booking.verifyUrl && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={booking.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006241] hover:underline"
                  >
                    <span>Mở đường dẫn kiểm tra mã QR</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E6E2D8] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#006241] hover:bg-[#004d33] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
