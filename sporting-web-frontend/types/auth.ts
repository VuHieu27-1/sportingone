export type UserRole = 'USER' | 'VENDOR' | 'ADMIN' | 'GUEST';

export interface LoginDTO {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms?: boolean;
}

export interface VerifyOtpDTO {
  email: string;
  otp: string;
}

export interface RequestForgotPasswordDTO {
  username: string;
  email: string;
}

export interface ResetPasswordDTO {
  username: string;
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
}

export type AuthMode = 'login' | 'register' | 'otp' | 'forgot';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeMode: AuthMode;
  pendingEmail?: string;
}
