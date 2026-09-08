import React from 'react';
import { User, Mail, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { AuthMode } from '../../types/auth';

interface RegisterFormProps {
  username: string;
  setUsername: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (agree: boolean) => void;
  isLoading: boolean;
  handleRegisterSubmit: (e: React.FormEvent) => void;
  handleSwitchMode: (mode: AuthMode) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  agreeTerms,
  setAgreeTerms,
  isLoading,
  handleRegisterSubmit,
  handleSwitchMode,
}) => {
  return (
    <form onSubmit={handleRegisterSubmit} className="space-y-4">
      <div className="space-y-1 text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Đăng ký tài khoản</h2>
        <p className="text-xs text-slate-300">Nhập đầy đủ thông tin bên dưới để trải nghiệm ngay.</p>
      </div>

      <div className="space-y-3.5 text-left">
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
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
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
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              tabIndex={3}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1">Xác nhận mật khẩu</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              tabIndex={4}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="agreeTerms"
            tabIndex={5}
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
          />
          <label htmlFor="agreeTerms" className="text-[11px] text-slate-300 leading-tight cursor-pointer">
            Tôi đồng ý với các <span className="text-white underline font-medium">Điều khoản Dịch vụ</span> &amp;{' '}
            <span className="text-white underline font-medium">Chính sách Bảo mật</span>.
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          tabIndex={6}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#00a86b] hover:bg-[#00c87f] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ĐĂNG KÝ TÀI KHOẢN</span>}
        </button>
      </div>

      <div className="text-xs text-slate-300 text-center pt-2 border-t border-white/10">
        Đã có tài khoản?{' '}
        <button
          type="button"
          onClick={() => handleSwitchMode('login')}
          className="font-bold text-white underline hover:text-emerald-300 transition-colors cursor-pointer"
        >
          Đăng nhập ngay
        </button>
      </div>
    </form>
  );
};
