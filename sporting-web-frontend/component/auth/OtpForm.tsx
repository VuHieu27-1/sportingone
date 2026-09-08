import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface OtpFormProps {
  otp: string[];
  pendingEmail: string;
  email: string;
  countdown: number;
  isLoading: boolean;
  handleOtpChange: (index: number, val: string, targetPrefix?: string) => void;
  handleOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>, targetPrefix?: string) => void;
  handleOtpSubmit: (e: React.FormEvent) => void;
  handleResendOtp: () => void;
  handleSwitchMode: (mode: 'register') => void;
}

export const OtpForm: React.FC<OtpFormProps> = ({
  otp,
  pendingEmail,
  email,
  countdown,
  isLoading,
  handleOtpChange,
  handleOtpPaste,
  handleOtpSubmit,
  handleResendOtp,
  handleSwitchMode,
}) => {
  return (
    <form onSubmit={handleOtpSubmit} className="space-y-5">
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto text-emerald-300">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Xác thực Email</h2>
        <p className="text-xs text-slate-300 max-w-xs mx-auto">
          Mã OTP 6 chữ số đã gửi đến email <strong className="text-white">{pendingEmail || email}</strong>
        </p>
      </div>

      <div className="flex justify-between items-center gap-1.5 sm:gap-2 py-2">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            id={`otp-input-${idx}`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            tabIndex={idx + 1}
            value={digit}
            onChange={(e) => handleOtpChange(idx, e.target.value, 'otp-input-')}
            onPaste={(e) => handleOtpPaste(e, 'otp-input-')}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && idx > 0) {
                const prevInput = document.getElementById(`otp-input-${idx - 1}`);
                if (prevInput) prevInput.focus();
              }
            }}
            className="w-9 h-11 sm:w-11 sm:h-12 rounded-xl bg-white/95 text-center font-mono font-extrabold text-lg sm:text-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>Không nhận được mã?</span>
        {countdown > 0 ? (
          <span className="text-slate-400 font-mono">Gửi lại sau {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading}
            className="font-bold text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            Gửi lại OTP
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        tabIndex={7}
        className="w-full py-3.5 px-4 rounded-2xl bg-[#00a86b] hover:bg-[#00c87f] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>XÁC THỰC EMAIL</span>}
      </button>

      <div className="text-xs text-slate-300 text-center pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => handleSwitchMode('register')}
          className="font-bold text-white underline hover:text-emerald-300 transition-colors cursor-pointer"
        >
          Quay lại Đăng ký
        </button>
      </div>
    </form>
  );
};
