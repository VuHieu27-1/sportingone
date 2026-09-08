import React from 'react';
import { User, Mail, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { AuthMode } from '../../types/auth';

interface ForgotPasswordFormProps {
  forgotStep: 1 | 2 | 3;
  username: string;
  setUsername: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  otp: string[];
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  countdown: number;
  isLoading: boolean;
  handleOtpChange: (index: number, val: string, targetPrefix?: string) => void;
  handleOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>, targetPrefix?: string) => void;
  handleResendForgotPasswordOtp: () => void;
  handleForgotPasswordSubmit: (e: React.FormEvent) => void;
  handleSwitchMode: (mode: AuthMode) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  forgotStep,
  username,
  setUsername,
  email,
  setEmail,
  otp,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  countdown,
  isLoading,
  handleOtpChange,
  handleOtpPaste,
  handleResendForgotPasswordOtp,
  handleForgotPasswordSubmit,
  handleSwitchMode,
}) => {
  return (
    <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
      <div className="space-y-1 text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Quên mật khẩu</h2>
        <p className="text-xs text-slate-300">
          {forgotStep === 1
            ? 'Nhập Tên người dùng và Email tài khoản để nhận mã khôi phục.'
            : forgotStep === 2
              ? 'Nhập mã OTP 6 chữ số vừa gửi đến Email của bạn.'
              : 'Nhập mật khẩu mới cho tài khoản của bạn.'}
        </p>
      </div>

      {forgotStep === 1 && (
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Tên người dùng (Username)</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                required
                tabIndex={1}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vuhieu1"
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Email đăng ký</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                required
                tabIndex={2}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            tabIndex={3}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#00a86b] hover:bg-[#00c87f] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>GỬI MÃ KHÔI PHỤC OTP</span>}
          </button>
        </div>
      )}

      {forgotStep === 2 && (
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Nhập 6 chữ số OTP vừa nhận</label>
            <div className="flex justify-between items-center gap-1.5 py-1">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`forgot-otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  tabIndex={idx + 1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value, 'forgot-otp-input-')}
                  onPaste={(e) => handleOtpPaste(e, 'forgot-otp-input-')}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && idx > 0) {
                      const prevInput = document.getElementById(`forgot-otp-input-${idx - 1}`);
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-white/95 text-center font-mono font-extrabold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 pt-2">
              <span>Chưa nhận được mã?</span>
              {countdown > 0 ? (
                <span className="text-slate-400 font-mono">Gửi lại sau {countdown}s</span>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleResendForgotPasswordOtp}
                  disabled={isLoading}
                  className="font-bold text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            tabIndex={7}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#00a86b] hover:bg-[#00c87f] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>XÁC THỰC MÃ OTP</span>}
          </button>
        </div>
      )}

      {forgotStep === 3 && (
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                tabIndex={1}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                tabIndex={2}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            tabIndex={3}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#00a86b] hover:bg-[#00c87f] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ĐỔI MẬT KHẨU</span>}
          </button>
        </div>
      )}

      <div className="text-xs text-slate-300 text-center pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => handleSwitchMode('login')}
          className="font-bold text-white underline hover:text-emerald-300 transition-colors cursor-pointer"
        >
          Nhớ ra mật khẩu? Quay lại Đăng nhập
        </button>
      </div>
    </form>
  );
};
