import React, { useState, useEffect, useRef } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { AuthUser, AuthMode } from '../types/auth';
import { authService } from '../services/authService';
import { userProfileService } from '../services/userProfileService';
import { ASSETS } from '../asset/constants';
import { showSmartToastError } from '../utils/toastUtils';

import { AuthSportsBackground } from '../component/auth/AuthSportsBackground';
import { AuthInfoPanel } from '../component/auth/AuthInfoPanel';
import { LoginForm } from '../component/auth/LoginForm';
import { RegisterForm } from '../component/auth/RegisterForm';
import { OtpForm } from '../component/auth/OtpForm';
import { ForgotPasswordForm } from '../component/auth/ForgotPasswordForm';

interface AuthPageProps {
  defaultMode?: AuthMode;
  onSuccess: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ defaultMode, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % ASSETS.AUTH_SPORTS_BGS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getModeFromPath = (): AuthMode => {
    if (defaultMode) return defaultMode;
    const path = location.pathname.replace('/', '');
    if (path === 'register') return 'register';
    if (path === 'otp') return 'otp';
    if (path === 'forgot-password' || path === 'forgot') return 'forgot';
    return 'login';
  };

  const [mode, setMode] = useState<AuthMode>(getModeFromPath());

  useEffect(() => {
    setMode(getModeFromPath());
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [location.pathname]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pendingEmail, setPendingEmail] = useState('');
  const [countdown, setCountdown] = useState(20);

  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((mode === 'otp' || (mode === 'forgot' && forgotStep === 2)) && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode, forgotStep, countdown]);

  const processedQueryRef = useRef('');

  useEffect(() => {

    if (!location.search || processedQueryRef.current === location.search) return;
    processedQueryRef.current = location.search;

    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    const usernameParam = query.get('username');
    const roleParam = query.get('role');
    const emailParam = query.get('email');

    // Clear query parameters from URL bar to prevent re-triggering on state updates
    window.history.replaceState({}, document.title, window.location.pathname);

    if (token && usernameParam) {
      import('../utils/tokenManager').then(({ tokenManager }) => {
        tokenManager.saveAccountToken(usernameParam, token);
        toast.success('Đăng nhập bằng Google thành công!', { id: 'auth-login' });
        authService.fetchCurrentUser().then((user) => {
          if (user) {
            onSuccess(user);
            userProfileService.ensureAutoFillUserProfile(user.username).catch(() => { });
            const targetUrl = user.role === 'ADMIN' ? '/admin' : '/user';
            navigate(targetUrl, { replace: true });
          } else {
            const fallbackUser: AuthUser = {
              id: 'user_' + Date.now(),
              username: usernameParam,
              fullName: usernameParam,
              email: emailParam || '',
              phone: '',
              role: (roleParam?.toUpperCase() as any) || 'USER',
              isVerified: true,
            };
            onSuccess(fallbackUser);
            const targetUrl = fallbackUser.role === 'ADMIN' ? '/admin' : '/user';
            navigate(targetUrl, { replace: true });
          }
        });
      });
    }

  }, [location.search]);




  /**
   * Executes clear Alerts operation.
   */
  const clearAlerts = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  /**
   * Handles event processing for handleSwitchMode.
   */
  const handleSwitchMode = (targetMode: AuthMode) => {
    clearAlerts();
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForgotStep(1);
    setMode(targetMode);

    if (location.pathname === '/add-account') {
      return;
    }

    if (targetMode === 'login') navigate('/login');
    else if (targetMode === 'register') navigate('/register');
    else if (targetMode === 'forgot') navigate('/forgot-password');
    else if (targetMode === 'otp') navigate('/otp');
  };

  /**
   * Handles event processing for handleLoginSubmit.
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setIsLoading(true);

    try {
      const res = await authService.login({ username, password, rememberMe });
      if (res.success && res.data) {
        toast.success('Đăng nhập thành công! Chào mừng bạn quay trở lại.', { id: 'auth-login' });
        userProfileService.ensureAutoFillUserProfile(res.data.username).catch(() => { });
        onSuccess(res.data);
        const targetUrl = res.data.role === 'ADMIN' ? '/admin' : '/user';
        navigate(targetUrl, { replace: true });
      } else {
        const msg = res.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu!';
        setErrorMessage(msg);
        showSmartToastError(msg);
      }
    } catch {
      const msg = 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại!';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles event processing for handleRegisterSubmit.
   */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setIsLoading(true);

    try {
      const res = await authService.register({
        username,
        email,
        password,
        confirmPassword,
        agreeTerms,
      });

      if (res.success) {
        setPendingEmail(email);
        setCountdown(20);
        handleSwitchMode('otp');
        const msg = 'Mã OTP gồm 6 chữ số đã được gửi đến email của bạn!';
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        const msg = res.message || 'Đăng ký tài khoản thất bại!';
        setErrorMessage(msg);
        showSmartToastError(msg);
      }
    } catch {
      const msg = 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại!';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles event processing for handleOtpPaste.
   */
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>, targetPrefix: string = 'otp-input-') => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const digits = pastedData.split('');
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    const focusIndex = Math.min(digits.length - 1, 5);
    const targetInput = document.getElementById(`${targetPrefix}${focusIndex}`);
    if (targetInput) targetInput.focus();
  };

  /**
   * Handles event processing for handleOtpChange.
   */
  const handleOtpChange = (index: number, val: string, targetPrefix: string = 'otp-input-') => {
    const cleanedVal = val.replace(/\D/g, '');

    if (cleanedVal.length > 1) {
      const digits = cleanedVal.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);

      const focusIndex = Math.min(digits.length - 1, 5);
      const targetInput = document.getElementById(`${targetPrefix}${focusIndex}`);
      if (targetInput) targetInput.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanedVal;
    setOtp(newOtp);

    if (cleanedVal && index < 5) {
      const nextInput = document.getElementById(`${targetPrefix}${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  /**
   * Handles event processing for handleOtpSubmit.
   */
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      const msg = 'Vui lòng nhập đầy đủ 6 chữ số của mã OTP!';
      showSmartToastError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyOtp({ email: pendingEmail || email, otp: otpCode });
      if (res.success && res.data) {
        toast.success('Tạo tài khoản thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.');
        handleSwitchMode('login');
      } else {
        const msg = res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!';
        showSmartToastError(msg);
      }
    } catch {
      const msg = 'Lỗi xác thực mã OTP. Vui lòng thử lại!';
      showSmartToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Handles event processing for handleResendOtp.
   */
  const handleResendOtp = async () => {
    clearAlerts();
    setIsLoading(true);
    try {
      const res = await authService.resendOtp(pendingEmail || email);
      if (res.success) {
        setCountdown(60);
        const msg = 'Mã OTP mới đã được gửi thành công!';
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        const msg = res.message || 'Gửi lại mã OTP thất bại!';
        setErrorMessage(msg);
        showSmartToastError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles event processing for handleResendForgotPasswordOtp.
   */
  const handleResendForgotPasswordOtp = async () => {
    clearAlerts();
    setIsLoading(true);
    try {
      const res = await authService.forgotPassword({
        username: username || email.split('@')[0],
        email,
      });
      if (res.success) {
        setCountdown(60);
        const msg = 'Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn!';
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        const msg = res.message || 'Gửi lại mã OTP đặt lại mật khẩu thất bại!';
        setErrorMessage(msg);
        showSmartToastError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles event processing for handleForgotPasswordSubmit.
   */
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setIsLoading(true);

    try {
      if (forgotStep === 1) {
        const res = await authService.forgotPassword({ username: username || email.split('@')[0], email });
        if (res.success) {
          setForgotStep(2);
          const msg = 'Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn!';
          setSuccessMessage(msg);
          toast.success(msg);
        } else {
          const msg = res.message || 'Tên đăng nhập hoặc Email không chính xác!';
          setErrorMessage(msg);
          showSmartToastError(msg);
        }
      } else if (forgotStep === 2) {
        const otpCode = otp.join('');
        const res = await authService.verifyForgotPasswordOtp({ email, token: otpCode });
        if (res.success) {
          setForgotStep(3);
          const msg = 'Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.';
          setSuccessMessage(msg);
          toast.success(msg);
        } else {
          const msg = res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!';
          setErrorMessage(msg);
          showSmartToastError(msg);
        }
      } else {
        const otpCode = otp.join('');
        const res = await authService.resetPassword({
          username: username || email.split('@')[0],
          email,
          otp: otpCode,
          newPassword,
          confirmNewPassword,
        });

        if (res.success) {
          const msg = 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.';
          setSuccessMessage(msg);
          toast.success(msg);
          setTimeout(() => {
            handleSwitchMode('login');
            setForgotStep(1);
          }, 1500);
        } else {
          const msg = res.message || 'Đổi mật khẩu thất bại!';
          setErrorMessage(msg);
          showSmartToastError(msg);
        }
      }
    } catch {
      const msg = 'Đã có lỗi xảy ra. Vui lòng thử lại!';
      setErrorMessage(msg);
      showSmartToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#006241] selection:text-white">
      <AuthSportsBackground bgIndex={bgIndex} />

      <button
        onClick={() => {
          navigate('/');
        }}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition-all shadow-xl cursor-pointer hover:scale-105"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Về trang chủ</span>
      </button>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-8">
        <div className="lg:col-span-5">
          <AuthInfoPanel />
        </div>

        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#071711]/92 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            {mode === 'login' && (
              <LoginForm
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                rememberMe={rememberMe}
                setRememberMe={setRememberMe}
                isLoading={isLoading}
                handleLoginSubmit={handleLoginSubmit}
                handleSwitchMode={handleSwitchMode}
              />
            )}

            {mode === 'register' && (
              <RegisterForm
                username={username}
                setUsername={setUsername}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                agreeTerms={agreeTerms}
                setAgreeTerms={setAgreeTerms}
                isLoading={isLoading}
                handleRegisterSubmit={handleRegisterSubmit}
                handleSwitchMode={handleSwitchMode}
              />
            )}

            {mode === 'otp' && (
              <OtpForm
                otp={otp}
                pendingEmail={pendingEmail}
                email={email}
                countdown={countdown}
                isLoading={isLoading}
                handleOtpChange={handleOtpChange}
                handleOtpPaste={handleOtpPaste}
                handleOtpSubmit={handleOtpSubmit}
                handleResendOtp={handleResendOtp}
                handleSwitchMode={handleSwitchMode}
              />
            )}

            {mode === 'forgot' && (
              <ForgotPasswordForm
                forgotStep={forgotStep}
                username={username}
                setUsername={setUsername}
                email={email}
                setEmail={setEmail}
                otp={otp}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword}
                setConfirmNewPassword={setConfirmNewPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                countdown={countdown}
                isLoading={isLoading}
                handleOtpChange={handleOtpChange}
                handleOtpPaste={handleOtpPaste}
                handleResendForgotPasswordOtp={handleResendForgotPasswordOtp}
                handleForgotPasswordSubmit={handleForgotPasswordSubmit}
                handleSwitchMode={handleSwitchMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
