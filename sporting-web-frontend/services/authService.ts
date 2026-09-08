import { LoginDTO, RegisterDTO, VerifyOtpDTO, RequestForgotPasswordDTO, ResetPasswordDTO, AuthUser, UserRole } from '../types/auth';
import { apiClient, ApiResponse } from './apiClient';
import { tokenManager } from '../utils/tokenManager';

export function extractUserRole(userData: any): UserRole {
  if (!userData) return 'USER';
  const roleObj = userData.role;
  const roleName = (
    typeof roleObj === 'string'
      ? roleObj
      : roleObj?.roleName || roleObj?.name || userData.roleName || ''
  ).toString().trim().toLowerCase();

  if (roleName === 'admin' || roleName.includes('admin')) {
    return 'ADMIN';
  }
  if (roleName === 'vendor' || roleName.includes('vendor')) {
    return 'VENDOR';
  }
  return 'USER';
}

export const authService = {
  /**
   * Initiates Google OAuth2 login flow by redirecting to backend Google Auth endpoint.
   */
  loginWithGoogle(fromAddAccount: boolean = false) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    const stateQuery = fromAddAccount ? '?state=add-account' : '';
    window.location.href = `${apiBaseUrl}/auth/google${stateQuery}`;
  },



  /**
   * Authenticates a user and returns a JWT access token.
   */
  async login(payload: LoginDTO): Promise<ApiResponse<AuthUser>> {

    if (!payload.username || !payload.password) {
      return { success: false, message: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.' };
    }

    const res = await apiClient.post<any>('/auth/login', {
      username: payload.username.trim(),
      password: payload.password,
    });

    if (res.success && res.data) {
      const userData = res.data.user || res.data;
      const username = userData.username || payload.username.trim();
      const token = res.access_token || res.data.access_token;
      const refreshToken = res.data?.refresh_token || (res as any).refresh_token;
      if (token) {
        tokenManager.saveAccountToken(username, token, refreshToken);
      }

      const userRole = extractUserRole(userData);
      const avatarUrl = userData.avatar || userData.avatarUrl || undefined;

      const formattedUser: AuthUser = {
        id: String(userData.id || 'user_' + Date.now()),
        username: userData.username || payload.username,
        fullName: userData.fullName || userData.username || payload.username,
        email: userData.email || '',
        phone: userData.phone || '',
        role: userRole,
        avatarUrl,
        isVerified: true,
      };

      return {
        success: true,
        message: 'Đăng nhập thành công!',
        data: formattedUser,
      };
    }

    return {
      success: false,
      message: res.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu!',
    };
  },

  /**
   * Registers a new user account.
   */
  async register(payload: RegisterDTO): Promise<ApiResponse<{ email: string }>> {
    if (!payload.username || !payload.email || !payload.password) {
      return { success: false, message: 'Vui lòng điền đầy đủ các thông tin: Tên đăng nhập, Email và Mật khẩu.' };
    }

    if (payload.password !== payload.confirmPassword) {
      return { success: false, message: 'Mật khẩu xác nhận không khớp!' };
    }

    if (payload.agreeTerms === false) {
      return { success: false, message: 'Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục.' };
    }

    const res = await apiClient.post<any>('/auth/register', {
      username: payload.username.trim(),
      email: payload.email.trim(),
      password: payload.password,
    });

    if (res.success) {
      return {
        success: true,
        message: res.message || 'Đăng ký thành công! Mã xác thực OTP đã được gửi đến email của bạn.',
        data: { email: payload.email },
      };
    }

    return {
      success: false,
      message: res.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại!',
    };
  },

  /**
   * Validates and verifies parameters for verifyOtp.
   */
  async verifyOtp(payload: VerifyOtpDTO): Promise<ApiResponse<AuthUser>> {
    if (!payload.otp || payload.otp.trim().length < 6) {
      return { success: false, message: 'Vui lòng nhập đủ 6 chữ số của mã OTP.' };
    }

    const res = await apiClient.post<any>('/register-user/verify', {
      email: payload.email.trim(),
      token: payload.otp.trim(),
    });

    if (res.success) {
      const userData = res.data?.user || res.data;

      const formattedUser: AuthUser = {
        id: String(userData?.id || Date.now()),
        username: userData?.username || payload.email.split('@')[0],
        fullName: userData?.fullName || userData?.username || payload.email.split('@')[0],
        email: payload.email,
        phone: userData?.phone || '',
        role: 'USER',
        isVerified: true,
      };

      return {
        success: true,
        message: 'Xác thực email thành công!',
        data: formattedUser,
      };
    }

    return {
      success: false,
      message: res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.',
    };
  },

  /**
   * Executes resend Otp operation.
   */
  async resendOtp(email: string): Promise<ApiResponse<null>> {
    const username = email.split('@')[0];
    const res = await apiClient.post<null>('/register-user', {
      email: email.trim(),
      username: username.trim(),
      password: 'TemporaryPassword123!',
    });

    if (res.success) {
      return {
        success: true,
        message: 'Mã OTP mới đã được gửi đến email của bạn.',
      };
    }

    return {
      success: false,
      message: res.message || 'Gửi lại mã OTP thất bại. Vui lòng thử lại!',
    };
  },

  /**
   * Executes forgot Password operation.
   */
  async forgotPassword(payload: RequestForgotPasswordDTO): Promise<ApiResponse<null>> {
    if (!payload.email || !payload.email.includes('@')) {
      return { success: false, message: 'Vui lòng nhập một địa chỉ email hợp lệ.' };
    }

    const res = await apiClient.post<null>('/forgot-password', {
      username: payload.username ? payload.username.trim() : payload.email.split('@')[0],
      email: payload.email.trim(),
    });

    if (res.success) {
      return {
        success: true,
        message: 'Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn.',
      };
    }

    return {
      success: false,
      message: res.message || 'Không tìm thấy tài khoản phù hợp với thông tin đã nhập.',
    };
  },

  /**
   * Validates and verifies parameters for verifyForgotPasswordOtp.
   */
  async verifyForgotPasswordOtp(payload: { email: string; token: string }): Promise<ApiResponse<null>> {
    if (!payload.token || payload.token.trim().length < 6) {
      return { success: false, message: 'Vui lòng nhập đủ 6 chữ số của mã OTP.' };
    }

    const res = await apiClient.post<null>('/forgot-password/verify', {
      email: payload.email.trim(),
      token: payload.token.trim(),
    });

    if (res.success) {
      return {
        success: true,
        message: 'Mã OTP đặt lại mật khẩu đã được xác thực thành công!',
      };
    }

    return {
      success: false,
      message: res.message || 'Mã OTP đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    };
  },

  /**
   * Resets the user's password after OTP verification.
   */
  async resetPassword(payload: ResetPasswordDTO): Promise<ApiResponse<null>> {
    if (!payload.newPassword || payload.newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
    }

    if (payload.newPassword !== payload.confirmNewPassword) {
      return { success: false, message: 'Mật khẩu xác nhận không khớp!' };
    }

    const res = await apiClient.post<null>('/forgot-password/reset', {
      username: payload.username ? payload.username.trim() : payload.email.split('@')[0],
      email: payload.email.trim(),
      newPassword: payload.newPassword,
    });

    if (res.success) {
      return {
        success: true,
        message: 'Đổi mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
      };
    }

    return {
      success: false,
      message: res.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại!',
    };
  },

  /**
   * Retrieves CurrentUser information.
   */
  async fetchCurrentUser(): Promise<AuthUser | null> {
    const token = tokenManager.getActiveToken();
    if (!token) return null;

    try {
      const res = await apiClient.get<any>('/users/profile');
      if (res.success && res.data) {
        const userData = res.data;
        if (userData.username) {
          tokenManager.updateActiveUsername(userData.username);
        }
        const userRole = extractUserRole(userData);
        const avatarUrl = userData.avatar || userData.avatarUrl || undefined;

        return {
          id: String(userData.id),
          username: userData.username || '',
          fullName: userData.fullName || userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          role: userRole,
          avatarUrl,
          isVerified: true,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
