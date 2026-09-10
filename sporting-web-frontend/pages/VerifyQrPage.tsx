import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Printer,
  Headphones,
  Loader2,
  ExternalLink,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService } from '../services/bookingService';
import { printBookingInvoice, printElementAsPdf } from '../component/common/pdfService';

export const VerifyQrPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id') || '';
  const sig = searchParams.get('sig') || '';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);

  const bookingType = searchParams.get('type') || '';

  const performVerification = useCallback(async () => {
    if (!bookingId || !sig) {
      setErrorMsg('Thiếu tham số mã đơn (id) hoặc chữ ký xác thực (sig) trên URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = bookingType === 'month'
        ? await bookingService.verifyQrCodeMonth(bookingId, sig)
        : await bookingService.verifyQrCode(bookingId, sig);

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setErrorMsg(res.message || 'Không thể xác thực mã QR đơn đặt sân.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Chữ ký xác thực QR không hợp lệ hoặc dữ liệu đơn hàng đã bị thay đổi!';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, sig, bookingType]);

  useEffect(() => {
    performVerification();
  }, [performVerification]);

  /**
   * Handles event processing for handleCopyHash.
   */
  const handleCopyHash = () => {
    if (!sig) return;
    navigator.clipboard.writeText(sig);
    setCopiedHash(true);
    toast.success('Đã sao chép mã chữ ký SHA256!');
    setTimeout(() => setCopiedHash(false), 2000);
  };

  /**
   * Handles event processing for handleCheckIn.
   */
  const handleCheckIn = () => {
    setIsCheckedIn(true);
    toast.success(`Đã xác nhận cho khách hàng vào sân thi đấu đơn #${bookingId}!`, {
      icon: '⚽',
      duration: 5000,
    });
  };

  const isSuccess = result?.success && result?.valid !== false;
  const timeStatus = result?.timeStatus || (isSuccess ? 'active' : 'expired');
  const booking = result?.booking || result?.bookingMonth || {};

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
      return d.toLocaleDateString('vi-VN');
    } catch {
      return String(dateStr).split('T')[0];
    }
  };

  /**
   * Prints the official booking invoice via the jsPDF library.
   */
  const handlePrintInvoice = async () => {
    if (booking && (booking.id || bookingId)) {
      const isMonth = bookingType === 'month' || Boolean(booking.startDate);

      const customerName =
        booking.username ||
        booking.user?.username ||
        booking.customerName ||
        (booking.email ? booking.email.split('@')[0] : '') ||
        'Khách Hàng';

      const customerPhone =
        booking.phone ||
        booking.userPhone ||
        booking.user?.phone ||
        (booking.user as any)?.detailUser?.phone ||
        '';

      const customerEmail =
        booking.email ||
        booking.user?.email ||
        '';

      const vendorName =
        booking.vendorName ||
        booking.yard?.vendor?.vendorName ||
        (booking.yard?.vendor as any)?.name ||
        'Cụm Sân Thể Thao';

      const vendorAddress =
        booking.vendorAddress ||
        booking.yard?.vendor?.vendorAddress ||
        (booking.yard?.vendor as any)?.address ||
        '';

      const yardName =
        booking.yardName ||
        booking.yard?.yardName ||
        (booking.yardId ? `Sân #${booking.yardId}` : '') ||
        (booking.yard?.id ? `Sân #${booking.yard.id}` : '') ||
        (booking.id ? `Sân #${booking.id}` : `Sân #${bookingId}`);

      const sportName =
        booking.sportName ||
        booking.yard?.sportType?.sportName ||
        'Sân thể thao';

      const typeName =
        booking.typeName ||
        booking.yard?.typeYard?.typeName ||
        '';

      const bookingDate = isMonth
        ? `${formatDateOnly(booking.startDate)} - ${formatDateOnly(booking.endDate)}`
        : formatDateOnly(booking.startTime);

      let timeSlot = '';
      let durationHours = 1;

      if (isMonth) {
        timeSlot = `${booking.startTime || '08:00'} - ${booking.endTime || '10:00'}`;
        const [sH, sM] = String(booking.startTime || '08:00').split(':').map(Number);
        const [eH, eM] = String(booking.endTime || '10:00').split(':').map(Number);
        if (!isNaN(sH) && !isNaN(eH)) {
          const diff = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
          if (diff > 0) durationHours = Math.round((diff / 60) * 10) / 10;
        }
      } else {
        const sDate = new Date(booking.startTime);
        const eDate = new Date(booking.endTime);
        const sTime = !isNaN(sDate.getTime()) ? sDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : String(booking.startTime || '');
        const eTime = !isNaN(eDate.getTime()) ? eDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : String(booking.endTime || '');
        timeSlot = `${sTime} - ${eTime}`;

        if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate.getTime() > sDate.getTime()) {
          durationHours = Math.round(((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60)) * 10) / 10;
        }
      }

      await printBookingInvoice({
        bookingId: booking.id || bookingId,
        orderCode: `#BK-${booking.id || bookingId}`,
        customerName,
        customerPhone,
        customerEmail,
        vendorName,
        vendorAddress,
        yardName,
        sportName,
        typeName,
        bookingDate,
        timeSlot,
        durationHours,
        totalPrice: Number(booking.priced || 0),
        paymentStatus: 'ĐÃ THANH TOÁN (PAID)',
        sig: sig || booking.sig,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`,
        verifyUrl: window.location.href,
        isMonth,
      });
    } else {
      await printElementAsPdf('#verify-card-container');
    }
  };

  /**
   * Formats input data into standard display format.
   */
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB] font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932] selection:bg-[#006241] selection:text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/user')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#FBF8F0] text-xs font-bold text-[#1E3932] transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#006241]" />
            <span>Trang Chủ Sporting ONE</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] text-[11px] font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SHA-256 VERIFIED SYSTEM</span>
          </div>
        </div>

        {isLoading && (
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[32px] p-12 text-center shadow-xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#006241]/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#006241] animate-spin" />
            </div>
            <h3 className="text-xl font-extrabold text-[#1E3932]">
              Đang Xác Thực Mã QR Đặt Sân...
            </h3>
            <p className="text-xs text-[#6F7E72] font-mono">
              Đang truy vấn dữ liệu đơn #{bookingId} và đối soát mã SHA256 với hệ thống
            </p>
          </div>
        )}

        {!isLoading && (errorMsg || !result) && (
          <div className="bg-[#FBF8F0] border border-red-200 rounded-[32px] p-8 text-center shadow-xl space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center ring-8 ring-red-50">
              <XCircle className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                <span>CẢNH BÁO VI PHẠM</span>
              </div>
              <h2 className="text-2xl font-extrabold text-red-700 tracking-tight">
                Mã QR Không Hợp Lệ Hoặc Giả Mạo!
              </h2>
              <p className="text-xs text-[#6F7E72] font-medium mt-2 leading-relaxed max-w-md mx-auto">
                {errorMsg || 'Mã chữ ký SHA256 không trùng khớp với dữ liệu gốc trong cơ sở dữ liệu.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-red-100 text-xs text-left space-y-2 text-[#1E3932]">
              <div className="font-bold text-red-700">Lưu ý bảo mật:</div>
              <ul className="list-disc list-inside space-y-1 text-[#6F7E72]">
                <li>Mọi hành vi chỉnh sửa tham số trên URL sẽ làm sai lệch chữ ký bảo mật SHA256.</li>
                <li>Chỉ mã QR do Sporting ONE tạo ra sau khi thanh toán mới có giá trị nhận sân.</li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={performVerification}
                className="px-5 py-2.5 rounded-full bg-[#1E3932] text-white text-xs font-bold hover:bg-[#006241] transition-all cursor-pointer"
              >
                Thử Xác Thực Lại
              </button>
              <button
                onClick={() => navigate('/user')}
                className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] text-xs font-bold hover:bg-[#E6E2D8] transition-all cursor-pointer"
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        )}

        {!isLoading && result && !errorMsg && (
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[32px] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {timeStatus === 'active' && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#006241] text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-400/30">
                  <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#006241] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  ✓ VÉ ĐẶT HỢP LỆ — XÁC THỰC THÀNH CÔNG
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#006241]">
                  ĐANG TRONG KHUNG GIỜ THI ĐẤU
                </h2>
                <p className="text-xs text-[#6F7E72] font-semibold">
                  {result.timeMessage || 'Khách hàng có thể nhận sân ngay bây giờ.'}
                </p>
              </div>
            )}

            {timeStatus === 'upcoming' && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg ring-4 ring-amber-400/30">
                  <Clock className="w-9 h-9 stroke-[2.5]" />
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  ⏳ ĐƠN ĐẶT HỢP LỆ — CHƯA ĐẾN GIỜ THI ĐẤU
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-amber-800">
                  LỊCH SẮP DIỄN RA
                </h2>
                <p className="text-xs text-amber-900 font-semibold">
                  {result.timeMessage || 'Vé hợp lệ nhưng chưa đến khung giờ nhận sân.'}
                </p>
              </div>
            )}

            {timeStatus === 'expired' && (
              <div className="p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg ring-4 ring-red-400/30">
                  <AlertTriangle className="w-9 h-9 stroke-[2.5]" />
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  ⚠️ ĐƠN ĐẶT SÂN ĐÃ HẾT HẠN SỬ DỤNG
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-red-700">
                  ĐÃ QUÁ HẠN GIỮ LỊCH
                </h2>
                <p className="text-xs text-red-900 font-semibold">
                  {result.timeMessage || 'Khung giờ thi đấu của đơn này đã kết thúc.'}
                </p>
              </div>
            )}

            {isCheckedIn && (
              <div className="p-3.5 rounded-2xl bg-[#006241] text-white flex items-center justify-between text-xs font-bold shadow-md animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>ĐÃ XÁC NHẬN CHO KHÁCH VÀO SÂN THÀNH CÔNG!</span>
                </div>
                <span className="font-mono text-[10px] opacity-80">{new Date().toLocaleTimeString('vi-VN')}</span>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-[#1E3932] text-sm border-b border-[#F2F0EB] pb-2.5">
                <Building2 className="w-4 h-4 text-[#006241]" />
                <span>THÔNG TIN SÂN THI ĐẤU</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Sân Thi Đấu:</span>
                  <span className="font-extrabold text-[#1E3932] text-sm">{booking.yardName || 'Cụm sân thể thao'}</span>
                </div>
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Cơ Sở / Vendor:</span>
                  <span className="font-bold text-[#1E3932]">{booking.vendorName || 'Chưa cập nhật'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Địa Chỉ Cơ Sở:</span>
                  <div className="flex items-start gap-1.5 mt-0.5 font-medium text-[#1E3932]">
                    <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0 mt-0.5" />
                    <span>{booking.vendorAddress || 'Chưa cập nhật địa chỉ'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-[#1E3932] text-sm border-b border-[#F2F0EB] pb-2.5">
                <User className="w-4 h-4 text-[#006241]" />
                <span>THÔNG TIN KHÁCH HÀNG</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Tên Người Dùng:</span>
                  <span className="font-extrabold text-[#1E3932]">{booking.username || 'Khách lẻ'}</span>
                </div>
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Email Liên Hệ:</span>
                  <span className="font-semibold text-[#1E3932] truncate block">{booking.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Số Điện Thoại:</span>
                  <span className="font-bold text-[#1E3932]">{booking.phone || booking.userPhone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-3">
              <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-2.5">
                <div className="flex items-center gap-2 font-extrabold text-[#1E3932] text-sm">
                  <Calendar className="w-4 h-4 text-[#006241]" />
                  <span>KHUNG GIỜ &amp; CHI PHÍ</span>
                </div>
                <span className="px-2.5 py-0.5 bg-[#006241]/10 text-[#006241] rounded-full text-[11px] font-mono font-bold uppercase">
                  {booking.startDate ? `MÃ GÓI THÁNG #BM-${booking.id || bookingId}` : `MÃ ĐƠN #${booking.id || bookingId}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {booking.startDate ? (
                  <>
                    <div>
                      <span className="text-[#6F7E72] font-semibold block text-[11px]">Thời Hạn Gói Tháng:</span>
                      <span className="font-bold font-mono text-[#1E3932]">Từ {String(booking.startDate).split('T')[0]} đến {String(booking.endDate).split('T')[0]}</span>
                    </div>
                    <div>
                      <span className="text-[#6F7E72] font-semibold block text-[11px]">Khung Giờ Hàng Ngày:</span>
                      <span className="font-bold font-mono text-[#1E3932]">{booking.startTime} - {booking.endTime}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[#6F7E72] font-semibold block text-[11px]">Thời Gian Bắt Đầu:</span>
                      <span className="font-bold font-mono text-[#1E3932]">{formatDateTime(booking.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-[#6F7E72] font-semibold block text-[11px]">Thời Gian Kết Thúc:</span>
                      <span className="font-bold font-mono text-[#1E3932]">{formatDateTime(booking.endTime)}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Chi Phí Thanh Toán:</span>
                  <span className="font-black text-sm text-[#006241] font-mono">
                    {Number(booking.priced || 0).toLocaleString('vi-VN')} Xu / VNĐ
                  </span>
                </div>
                <div>
                  <span className="text-[#6F7E72] font-semibold block text-[11px]">Trạng Thái Thanh Toán:</span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                    ✓ ĐÃ THANH TOÁN
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              {timeStatus === 'active' && !isCheckedIn && (
                <button
                  onClick={handleCheckIn}
                  className="w-full py-3.5 px-6 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs transition-all shadow-xl shadow-[#006241]/25 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider border border-emerald-400/30"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>🚀 XÁC NHẬN CHO KHÁCH VÀO SÂN THI ĐẤU</span>
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="py-2.5 px-3 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  title="In hoá đơn đặt sân chính thức qua thư viện PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>In Hoá Đơn (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/user')}
                  className="py-2.5 px-3 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Về Trang Chủ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyQrPage;
