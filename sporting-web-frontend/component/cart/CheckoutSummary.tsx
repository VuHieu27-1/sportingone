import React, { useState } from 'react';
import { Ticket, Loader2, ShieldCheck, QrCode, Coins, AlertCircle, Sparkles } from 'lucide-react';

interface CheckoutSummaryProps {
  selectedCount: number;
  totalAmount: number;
  paymentMethod: 'PAYOS' | 'WALLET';
  onSelectPaymentMethod: (method: 'PAYOS' | 'WALLET') => void;
  walletBalance: number;
  onCheckout: () => void;
  isProcessing: boolean;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  selectedCount,
  totalAmount,
  paymentMethod,
  onSelectPaymentMethod,
  walletBalance,
  onCheckout,
  isProcessing,
}) => {
  const [promoCode, setPromoCode] = useState('');

  const discountAmount = 0;
  const platformFee = 0;
  const totalPayable = Math.max(0, totalAmount - discountAmount + platformFee);

  const isWalletInsufficient = paymentMethod === 'WALLET' && walletBalance < totalPayable;

  return (
    <div className="bg-[#FBF8F0] rounded-[32px] border border-[#E6E2D8] p-6 sm:p-7 shadow-md font-['Plus_Jakarta_Sans',sans-serif] space-y-6 text-[#1E3932]">
            <div className="border-b border-[#E6E2D8] pb-4">
        <h3 className="text-xl sm:text-2xl font-black text-[#1E3932] tracking-tight flex items-center justify-between">
          <span>Tóm Tắt Thanh Toán</span>
          <Sparkles className="w-5 h-5 text-[#006241]" />
        </h3>
        <p className="text-xs sm:text-sm text-[#6F7E72] font-medium mt-1">
          Chọn phương thức và xác nhận để hoàn tất đặt giữ lịch
        </p>
      </div>

            <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Ticket className="w-4 h-4 text-[#6F7E72] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            tabIndex={1}
            placeholder="Mã giảm giá / Promo Code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/15 transition-all shadow-2xs"
          />
        </div>
        <button
          type="button"
          tabIndex={2}
          onClick={() => {}}
          className="px-5 py-3 rounded-2xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-extrabold transition-all cursor-pointer border border-[#E6E2D8] shrink-0"
        >
          Áp dụng
        </button>
      </div>

            <div className="space-y-3 text-xs sm:text-sm font-medium text-[#6F7E72] bg-white/70 p-4 sm:p-5 rounded-2xl border border-[#E6E2D8]">
        <div className="flex justify-between items-center">
          <span>Số sân chọn thanh toán:</span>
          <span className="font-bold text-[#1E3932] font-mono text-sm">{selectedCount} sân</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Tổng chi phí thuê sân:</span>
          <span className="font-bold text-[#1E3932] font-mono text-sm">
            {totalAmount.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Giảm giá ưu đãi:</span>
          <span className="font-bold text-[#006241] font-mono text-sm">
            -{discountAmount.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Phí dịch vụ:</span>
          <span className="font-extrabold text-[#006241] font-mono text-xs uppercase px-2.5 py-0.5 bg-[#006241]/10 rounded-full">
            Miễn phí
          </span>
        </div>

                <div className="pt-3.5 border-t border-[#E6E2D8] flex justify-between items-center">
          <span className="text-sm sm:text-base font-black text-[#1E3932]">Tổng Cần Thanh Toán:</span>
          <span className="text-2xl sm:text-3xl font-black text-[#006241] font-mono tracking-tight">
            {totalPayable.toLocaleString('vi-VN')}đ
          </span>
        </div>
      </div>

            <div className="space-y-3.5 pt-1">
        <span className="text-xs font-extrabold text-[#1E3932] block uppercase tracking-wider">
          CHỌN PHƯƠNG THỨC THANH TOÁN:
        </span>

                <div
          onClick={() => onSelectPaymentMethod('PAYOS')}
          className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer space-y-2.5 ${
            paymentMethod === 'PAYOS'
              ? 'bg-white border-[#006241] ring-4 ring-[#006241]/10 shadow-md'
              : 'bg-[#F2F0EB]/60 border-[#E6E2D8] hover:bg-white hover:border-[#006241]/40'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  paymentMethod === 'PAYOS'
                    ? 'bg-[#006241] text-white shadow-sm'
                    : 'bg-[#E6E2D8] text-[#6F7E72]'
                }`}
              >
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-[#1E3932]">
                  Thanh Toán Ngân Hàng (Chuyển Khoản VietQR)
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-[11px] font-extrabold border border-[#006241]/20">
                ⚡ Tự động 24/7
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  paymentMethod === 'PAYOS'
                    ? 'border-[#006241] bg-[#006241]'
                    : 'border-[#9EABA0]'
                }`}
              >
                {paymentMethod === 'PAYOS' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F2F0EB]">
            <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
              Quét mã QR chuyển khoản bằng ứng dụng Ngân Hàng hoặc MoMo
            </p>
            <span className="sm:hidden px-2 py-0.5 rounded-full bg-[#006241]/10 text-[#006241] text-[10px] font-extrabold shrink-0">
              24/7
            </span>
          </div>
        </div>

                <div
          onClick={() => onSelectPaymentMethod('WALLET')}
          className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer space-y-2.5 ${
            paymentMethod === 'WALLET'
              ? 'bg-white border-[#006241] ring-4 ring-[#006241]/10 shadow-md'
              : 'bg-[#F2F0EB]/60 border-[#E6E2D8] hover:bg-white hover:border-[#006241]/40'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  paymentMethod === 'WALLET'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#E6E2D8] text-[#6F7E72]'
                }`}
              >
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-[#1E3932]">
                  Thanh Toán Bằng Xu Ví Account
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-mono font-black border border-amber-500/20">
                Ví: {walletBalance.toLocaleString('vi-VN')} Xu
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  paymentMethod === 'WALLET'
                    ? 'border-[#006241] bg-[#006241]'
                    : 'border-[#9EABA0]'
                }`}
              >
                {paymentMethod === 'WALLET' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F2F0EB]">
            <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
              Trừ xu trong ví &amp; chuyển trực tiếp cho chủ sở hữu sân
            </p>
          </div>
        </div>

                {isWalletInsufficient && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="leading-snug">
              Số dư xu không đủ (Thiếu {(totalPayable - walletBalance).toLocaleString('vi-VN')} Xu). Vui lòng chọn VietQR hoặc Nạp Xu vào ví!
            </span>
          </div>
        )}
      </div>

            <button
        type="button"
        tabIndex={3}
        onClick={onCheckout}
        disabled={selectedCount === 0 || isProcessing || isWalletInsufficient}
        className="w-full py-4 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-5 h-5" />
        )}
        <span>
          {isProcessing
            ? 'Đang Xử Lý Thanh Toán...'
            : paymentMethod === 'WALLET'
              ? `XÁC NHẬN THANH TOÁN (${totalPayable.toLocaleString('vi-VN')} XU)`
              : `HOÀN TẤT THANH TOÁN (${totalPayable.toLocaleString('vi-VN')}đ)`}
        </span>
      </button>
    </div>
  );
};
