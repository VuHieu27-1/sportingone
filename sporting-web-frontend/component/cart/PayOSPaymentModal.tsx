import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { X, Copy, CheckCircle2, AlertCircle, ShieldCheck, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { PayOSCreatePaymentData, payosService } from '../../services/payosService';
import { BackendBooking } from '../../services/bookingService';
import { getPayOSQrImageUrl } from '../../utils/payosQr';
import { triggerPaymentSuccessCelebration } from '../../utils/celebrationEffects';

interface PayOSPaymentModalProps {
  isOpen: boolean;
  paymentData: PayOSCreatePaymentData | null;
  booking: BackendBooking | null;
  selectedBookings?: BackendBooking[];
  onClose: () => void;
  onSuccess: (bookingId: number) => void;
  onCancelPayment: (orderCode: number) => void;
}

export const PayOSPaymentModal: React.FC<PayOSPaymentModalProps> = ({
  isOpen,
  paymentData,
  booking,
  selectedBookings,
  onClose,
  onSuccess,
  onCancelPayment,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'CANCELLED' | 'CONFLICT'>('PENDING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isBatch = Boolean(selectedBookings && selectedBookings.length > 1);
  const bookingIdsList = isBatch ? selectedBookings!.map((b) => b.id) : undefined;
  const orderCode = paymentData?.orderCode;
  const bookingId = booking?.id;

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    setPaymentStatus('PENDING');
    setErrorMessage('');
  }, [orderCode]);

  useEffect(() => {
    if (!isOpen || !orderCode || paymentStatus === 'PAID' || paymentStatus === 'CANCELLED' || paymentStatus === 'CONFLICT') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await payosService.updatePaymentStatus(
          orderCode,
          bookingId,
          bookingIdsList,
        );
        if (res.success && res.data) {
          const currentStatus = res.data.status;
          if (currentStatus === 'paid') {
            setPaymentStatus('PAID');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            toast.success('Thanh toán thành công! Sân đã được giữ lịch 100%.', { id: 'payos-polling-status' });
            onSuccessRef.current(res.data?.bookingId || bookingId || orderCode);
          } else if (currentStatus === 'refund') {
            setPaymentStatus('CONFLICT');
            const msg = 'Rất tiếc! Sân đã được người dùng khác đặt và thanh toán trước đó. Đơn đặt của bạn đã được chuyển sang Chờ Hoàn Tiền.';
            setErrorMessage(msg);
            toast.error(msg, { id: 'payos-polling-status' });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (currentStatus === 'cancelled') {
            setPaymentStatus('CANCELLED');
            setErrorMessage('Giao dịch thanh toán đã bị hủy.');
            toast.error('Giao dịch thanh toán đã bị hủy.', { id: 'payos-polling-status' });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        } else if (!res.success && res.message) {
          if (res.message.includes('khác đặt') || res.message.includes('đã được người dùng khác') || res.message.includes('hoàn tiền') || res.message.includes('refund')) {
            setPaymentStatus('CONFLICT');
            setErrorMessage(res.message);
            toast.error(res.message, { id: 'payos-polling-status' });
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      } catch {
      }
    };

    checkStatus();

    pollIntervalRef.current = setInterval(checkStatus, 6000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, orderCode, bookingId, paymentStatus]);

  if (!isOpen || !paymentData || !booking) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Đã sao chép ${label}!`, { id: 'payos-copy-toast' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const amountFormatted = (paymentData.amount || 0).toLocaleString('vi-VN');

  const qrImageSrc = getPayOSQrImageUrl(
    paymentData.qrCode,
    paymentData.bin || '970422',
    paymentData.accountNumber || 'V3CAS5601571936',
    paymentData.amount || Number(booking.priced || 0),
    paymentData.description || `TT Booking ${booking.id}`,
    paymentData.accountName || 'SPORTING ONE',
  );

  const startTimeStr = booking.startTime
    ? new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const endTimeStr = booking.endTime
    ? new Date(booking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const dateStr = booking.startTime
    ? new Date(booking.startTime).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const displayYardTitle = isBatch
    ? `Thanh toán gộp ${selectedBookings!.length} sân`
    : (booking.yard?.yardName || 'Sân Thể Thao');

  const displayYardSubtitle = isBatch
    ? selectedBookings!.map((b) => b.yard?.yardName || 'Sân').join(', ')
    : `⏰ ${startTimeStr} - ${endTimeStr} (${dateStr})`;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">

        <div className="px-6 py-4 border-b border-slate-100 bg-[#FBFBF9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#006241]/10 flex items-center justify-center text-[#006241]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#1E3932] tracking-tight">Thanh Toán Đặt Sân - VietQR</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {paymentStatus === 'PAID' ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-3.5 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#006241] shadow-md shadow-emerald-900/5 animate-success-pop">
                <CheckCircle2 className="w-8 h-8 text-[#006241]" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#006241]/10 text-[#006241] text-[11px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Giao Dịch Thành Công</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#1E3932]">Đã Xác Nhận Giữ Lịch 100%!</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Số tiền <span className="font-bold text-[#006241] font-mono">{amountFormatted} đ</span> đã thanh toán thành công. Hệ thống đang chuyển đến vé QR...
                </p>
              </div>

              <button
                onClick={() => onSuccess(bookingId || orderCode || 0)}
                className="mt-1 px-5 py-2.5 rounded-xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Xem Mã QR Đặt Sân</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {paymentStatus === 'CONFLICT' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{errorMessage || 'Sân đã được người dùng khác đặt. Đơn đặt của bạn được chuyển sang Chờ Hoàn Tiền.'}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center bg-[#FAF8F5] border border-slate-200/70 rounded-2xl p-4 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-sm w-full max-w-[240px]">
                    <img
                      src={qrImageSrc}
                      alt="VietQR PayOS"
                      className="w-full h-auto object-contain rounded-md max-h-[240px]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div className="p-3 bg-[#FBFBF9] border border-slate-200/70 rounded-xl space-y-0.5">
                    <div className="text-[10px] font-bold text-[#006241] uppercase tracking-wider">
                      {isBatch ? `Sân đã chọn (${selectedBookings!.length} sân)` : 'Sân đã chọn'}
                    </div>
                    <div className="text-sm font-extrabold text-[#1E3932] line-clamp-1">{displayYardTitle}</div>
                    <div className="text-xs text-slate-500 font-medium line-clamp-2">{displayYardSubtitle}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span>Chuyển khoản thủ công</span>
                      <span className="text-emerald-700 font-bold">NAPAS 24/7</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Chủ tài khoản:</span>
                      <span className="font-bold text-[#1E3932] uppercase">{paymentData.accountName || 'SPORTING ONE'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Số tài khoản:</span>
                      <div className="flex items-center gap-1.5 font-mono font-extrabold text-[#006241] text-sm">
                        <span>{paymentData.accountNumber}</span>
                        <button
                          onClick={() => handleCopy(paymentData.accountNumber, 'Số tài khoản')}
                          className="p-1 rounded-md bg-slate-100 hover:bg-[#006241] hover:text-white text-slate-500 transition-colors cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Số tiền:</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-[#006241] text-sm">
                        <span>{amountFormatted} đ</span>
                        <button
                          onClick={() => handleCopy(String(paymentData.amount), 'Số tiền')}
                          className="p-1 rounded-md bg-slate-100 hover:bg-[#006241] hover:text-white text-slate-500 transition-colors cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-900">
                      <span className="font-medium text-[11px]">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5 font-mono font-extrabold text-amber-800 text-xs">
                        <span>{paymentData.description}</span>
                        <button
                          onClick={() => handleCopy(paymentData.description, 'Nội dung chuyển khoản')}
                          className="p-1 rounded bg-white hover:bg-amber-700 hover:text-white border border-amber-300 text-amber-700 transition-colors cursor-pointer"
                          title="Sao chép nội dung"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {paymentStatus !== 'PAID' && (
          <div className="px-6 py-3.5 border-t border-slate-100 bg-[#FBFBF9] flex items-center justify-between text-xs">
            <button
              onClick={() => onCancelPayment(paymentData.orderCode)}
              className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200/80 transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Hủy giao dịch thanh toán này</span>
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
