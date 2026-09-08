import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Store, Wallet, Settings, HelpCircle, ArrowLeft, LogOut, ChevronRight, CheckCircle2, Shield, ChevronDown, ShoppingBag, UserPlus, Trash2, Coins, Calendar, Camera, Loader2, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { UserProfileDetails, userProfileService, accountAvatarCache } from '../services/userProfileService';
import { walletService } from '../services/walletService';
import { socketService } from '../services/socketService';
import { ProfileInfoTab } from '../component/profile/ProfileInfoTab';
import { VendorManagementTab } from '../component/profile/VendorManagementTab';
import { WalletTab } from '../component/profile/WalletTab';
import { BookedYardsTab } from '../component/profile/BookedYardsTab';
import { tokenManager } from '../utils/tokenManager';
import { useAccounts } from '../hooks/useAccounts';
import { bookingService } from '../services/bookingService';
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '../utils/appConfig';

interface UserProfilePageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

type ProfileTabKey = 'profile' | 'booked-yards' | 'vendor' | 'wallet' | 'settings' | 'help';

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const savedAccounts = useAccounts();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = (): ProfileTabKey => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'booked-yards', 'vendor', 'wallet', 'settings', 'help'].includes(tabParam)) {
      return tabParam as ProfileTabKey;
    }
    try {
      const saved = sessionStorage.getItem('sporting_profile_active_tab');
      if (saved && ['profile', 'booked-yards', 'vendor', 'wallet', 'settings', 'help'].includes(saved)) {
        return saved as ProfileTabKey;
      }
    } catch { }
    return 'profile';
  };

  const [activeTab, setActiveTabState] = useState<ProfileTabKey>(getInitialTab);
  const [profile, setProfile] = useState<UserProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState<number>(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchUpcomingCount = useCallback(async () => {
    const token = tokenManager.getActiveToken();
    if (!token) return;
    try {
      const [resDaily, resMonthly] = await Promise.all([
        bookingService.fetchMyBookings(),
        bookingService.fetchMyBookingsMonth(),
      ]);

      const now = new Date().getTime();
      let dailyCount = 0;
      let monthlyCount = 0;

      if (resDaily.success && Array.isArray(resDaily.data)) {
        dailyCount = resDaily.data.filter((b) => {
          if (b.status !== 'paid') return false;
          const start = new Date(b.startTime).getTime();
          return !isNaN(start) && start > now;
        }).length;
      }

      if (resMonthly.success && Array.isArray(resMonthly.data)) {
        monthlyCount = resMonthly.data.filter((bm) => {
          if (bm.status !== 'paid') return false;
          const end = new Date(bm.endDate ? `${String(bm.endDate).split('T')[0]}T${bm.endTime || '23:59'}:00` : bm.createdAt).getTime();
          return !isNaN(end) && end > now;
        }).length;
      }

      setUpcomingBookingsCount(dailyCount + monthlyCount);
    } catch { }
  }, []);

  const handleTabChange = (newTab: ProfileTabKey) => {
    setActiveTabState(newTab);
    try {
      sessionStorage.setItem('sporting_profile_active_tab', newTab);
      setSearchParams({ tab: newTab }, { replace: true });
    } catch { }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'booked-yards', 'vendor', 'wallet', 'settings', 'help'].includes(tabParam)) {
      setActiveTabState(tabParam as ProfileTabKey);
    }
  }, [searchParams]);

  const fetchWalletBalance = useCallback(async () => {
    const token = tokenManager.getActiveToken();
    if (!token) return;
    setIsLoadingWallet(true);
    try {
      const res = await walletService.getMyWallet();
      if (res.success && res.data) {
        setWalletBalance(Number(res.data.balance || 0));
      }
    } catch {
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance();
    fetchUpcomingCount();
  }, [fetchWalletBalance, fetchUpcomingCount, currentUser?.username]);

  const [isPreviewAvatarOpen, setIsPreviewAvatarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewAvatarOpen(false);
      }
    };
    if (isPreviewAvatarOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewAvatarOpen]);

  useEffect(() => {
    /**
     * Handles event processing for handleClickOutside.
     */
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Executes load Profile Data operation.
   */
  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const res = await userProfileService.fetchProfileFromApi();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch {
      toast.error('Không thể tải thông tin hồ sơ người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [currentUser?.username, currentUser?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 10MB');
      return;
    }

    setIsUploadingAvatar(true);
    const loadingToast = toast.loading('Đang tải ảnh đại diện lên Sporting One...');
    try {
      const res = await userProfileService.uploadAvatar(file);
      toast.dismiss(loadingToast);
      if (res.success && res.data?.avatar) {
        toast.success('Cập nhật ảnh đại diện lên Sporting One thành công!');
        setProfile((prev) => (prev ? { ...prev, avatar: res.data!.avatar } : null));
      } else {
        toast.error(res.message || 'Tải ảnh đại diện thất bại');
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error('Không thể kết nối đến máy chủ khi tải ảnh');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, onLogout);
    navigate('/login');
  };

  const displayName =
    (profile?.fullName) ||
    currentUser?.fullName ||
    currentUser?.username ||
    'Người chơi';

  const displayEmail =
    (profile?.email) ||
    currentUser?.email ||
    (currentUser?.username ? `${currentUser.username}@gmail.com` : '');

  const avatarLetter = displayName.charAt(0).toUpperCase();

  const effectiveAvatar =
    profile?.avatar ||
    currentUser?.avatarUrl ||
    accountAvatarCache.getAvatar(displayName) ||
    accountAvatarCache.getAvatar(currentUser?.username || '') ||
    accountAvatarCache.getAvatar(profile?.username || '');

  const SIDEBAR_ITEMS: { key: ProfileTabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'profile', label: 'Thông tin cá nhân', icon: User },
    { key: 'booked-yards', label: 'Sân đã đặt', icon: Calendar },
    { key: 'vendor', label: 'Đăng ký & Quản lý Vendor', icon: Store },
    { key: 'wallet', label: 'Ví tài khoản & Xu', icon: Wallet },
    { key: 'settings', label: 'Cài đặt tài khoản', icon: Settings },
    { key: 'help', label: 'Trung tâm trợ giúp', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F2F0EB] text-[#1E3932] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      <header className="bg-[#1E3932] text-[#FBF8F0] border-b border-[#006241]/30 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5 lg:gap-7">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/user')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#FBF8F0] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Quay lại Trang Chủ</span>
                <span className="sm:hidden">Trang Chủ</span>
              </button>
              <span className="text-[#A3B1A8] text-xs font-mono hidden sm:inline">|</span>
              <span className="text-xs font-mono font-bold text-emerald-300 hidden sm:inline uppercase tracking-wider">
                SPORTING ONE PLATFORM
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              {[
                { id: 'home', label: 'Trang Chủ', href: '/user' },
                { id: 'venues', label: 'Danh Sách Sân', href: '/user#venues' },
                { id: 'vendor', label: 'Quản Lý Vendor', href: '/user/profile?tab=vendor' },
              ].map((item) => {
                const isActive = activeTab === 'vendor' ? item.id === 'vendor' : false;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.id === 'vendor') {
                        handleTabChange('vendor');
                      } else if (item.id === 'home') {
                        navigate('/user');
                      } else if (item.id === 'venues') {
                        navigate('/user#venues');
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${isActive
                      ? 'text-white bg-[#006241] shadow-sm'
                      : 'text-[#A3B1A8] hover:text-[#FBF8F0] hover:bg-white/10'
                      }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                const nextState = !userMenuOpen;
                setUserMenuOpen(nextState);
                if (nextState) {
                  fetchWalletBalance();
                  fetchUpcomingCount();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer select-none"
            >
              {(() => {
                const navAvatar =
                  profile?.avatar ||
                  currentUser?.avatarUrl ||
                  accountAvatarCache.getAvatar(currentUser?.username || '') ||
                  accountAvatarCache.getAvatar(displayName);
                return navAvatar ? (
                  <img src={navAvatar} alt={displayName} className="w-6 h-6 rounded-full object-cover shadow" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#006241] flex items-center justify-center font-extrabold text-[#FBF8F0] text-xs shadow">
                    {avatarLetter}
                  </div>
                );
              })()}
              <span className="text-xs font-bold text-[#FBF8F0] max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#A3B1A8] transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-[min(calc(100vw-1.5rem),18rem)] bg-[#FBF8F0] border border-[#E6E2D8] rounded-[24px] shadow-2xl overflow-hidden z-50 text-[#1E3932]">
                <div className="p-4 border-b border-[#E6E2D8] bg-[#F2F0EB]">
                  <div className="font-extrabold text-[#1E3932] text-sm line-clamp-1">{displayName}</div>
                  {displayEmail && (
                    <div className="text-xs text-[#6F7E72] mt-0.5 truncate font-medium">{displayEmail}</div>
                  )}
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#006241]/10 border border-[#006241]/20 rounded-full text-[#006241] text-[10px] font-mono font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006241] animate-pulse" />
                    Đang Hoạt Động
                  </div>
                </div>

                <div className="p-2 border-b border-[#E6E2D8] space-y-0.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleTabChange('wallet');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer group"
                    title="Xem Ví xu & nạp tiền"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Wallet className="w-4 h-4 text-[#006241] shrink-0" />
                      <span className="truncate">Ví Xu Số Dư</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 max-w-[120px] bg-[#006241]/10 px-2.5 py-0.5 rounded-full border border-[#006241]/20 text-[#006241]">
                      <Coins className="w-3 h-3 text-[#006241] shrink-0" />
                      <span className="text-[11px] font-extrabold font-mono truncate">
                        {isLoadingWallet ? '...' : `${walletBalance.toLocaleString('vi-VN')} Xu`}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/cart');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#006241]" />
                    Giỏ Hàng &amp; Đặt Sân
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleTabChange('booked-yards');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-4 h-4 text-[#006241] shrink-0" />
                      <span className="truncate">Sân Đã Đặt</span>
                    </div>
                    {upcomingBookingsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-800 text-[10px] font-black font-mono shrink-0">
                        {upcomingBookingsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleTabChange('profile');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#006241]" />
                    Hồ Sơ Của Tôi
                  </button>
                </div>

                <div className="p-2 border-b border-[#E6E2D8] space-y-1">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
                    Danh sách tài khoản ({savedAccounts.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {savedAccounts.map((acc) => {
                      const accAvatar = (acc.isActive && profile?.avatar) || accountAvatarCache.getAvatar(acc.username);
                      return (
                        <div
                          key={acc.username}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${acc.isActive
                            ? 'bg-[#006241]/10 border border-[#006241]/30'
                            : 'hover:bg-[#F2F0EB] cursor-pointer'
                            }`}
                          onClick={() => {
                            if (!acc.isActive) {
                              tokenManager.switchAccountInNewTab(acc.username);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {accAvatar ? (
                              <img
                                src={accAvatar}
                                alt={acc.username}
                                className="w-6 h-6 rounded-full object-cover shrink-0 shadow"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#006241] text-[#FBF8F0] flex items-center justify-center font-bold text-xs shrink-0 shadow">
                                {acc.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="truncate text-xs font-bold text-[#1E3932]">
                              {acc.username}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {acc.isActive && (
                              <span className="px-2 py-0.5 bg-[#006241] text-[#FBF8F0] text-[9px] font-bold rounded-full">
                                Đang dùng
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success(`Đã xóa tài khoản ${acc.username}!`, { id: `logout-${acc.username}` });
                                if (acc.isActive) {
                                  tokenManager.handleActiveLogoutOrAutoSwitch(acc.username, onLogout);
                                } else {
                                  tokenManager.removeAccountToken(acc.username);
                                }
                              }}
                              className="p-1 text-[#6F7E72] hover:text-red-600 transition-colors cursor-pointer"
                              title={`Đăng xuất và xóa tài khoản ${acc.username}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/add-account');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[#006241] hover:bg-[#006241]/10 text-xs font-bold transition-all text-left cursor-pointer border border-dashed border-[#006241]/30 mt-1"
                  >
                    <UserPlus className="w-4 h-4 text-[#006241]" />
                    Thêm tài khoản mới
                  </button>
                </div>

                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[#DC2626] hover:bg-red-50 text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng Xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-20 sm:pt-24 pb-10 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="p-5 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-6">
            <div className="p-4 rounded-2xl bg-[#F2F0EB]/70 border border-[#E6E2D8] text-center">
              <div className="relative w-16 h-16 mx-auto mb-2 group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                />
                {effectiveAvatar ? (
                  <img
                    src={effectiveAvatar}
                    alt={displayName}
                    onClick={() => setIsPreviewAvatarOpen(true)}
                    title="Bấm để xem ảnh đại diện phóng to toàn màn hình"
                    className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-[#006241]/20 cursor-pointer hover:scale-105 hover:border-emerald-500/50 transition-all"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#006241] text-[#FBF8F0] font-black text-xl flex items-center justify-center shadow-md">
                    {avatarLetter}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Đổi ảnh đại diện"
                  className="absolute bottom-0 right-0 p-1.5 bg-[#006241] text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors border border-white cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <h3 className="font-extrabold text-[#1E3932] text-sm truncate">{displayName}</h3>
              <p className="text-[11px] text-[#6F7E72] font-mono mt-0.5 truncate">{displayEmail}</p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-mono font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã Xác Thực (Active)
              </div>
            </div>

            <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1.5 pb-1 md:pb-0 custom-scrollbar">
              <div className="text-[10px] font-mono font-extrabold text-[#6F7E72] uppercase tracking-wider px-3 mb-2 hidden md:block">
                Danh Mục Hồ Sơ
              </div>
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`flex items-center justify-between gap-2 px-3.5 md:px-4 py-2 md:py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer shrink-0 md:shrink md:w-full whitespace-nowrap md:whitespace-normal ${isActive
                      ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                      : 'text-[#1E3932] hover:bg-[#F2F0EB] bg-[#F8F7F4] md:bg-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-[#006241]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.key === 'booked-yards' && upcomingBookingsCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${isActive
                            ? 'bg-amber-400 text-[#1E3932]'
                            : 'bg-amber-500/15 border border-amber-500/30 text-amber-700'
                            }`}
                        >
                          {upcomingBookingsCount}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-4 h-4 text-emerald-400 hidden md:block" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main key={activeTab} className="flex-1 space-y-6 min-w-0">
          <div className="p-4 sm:p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#6F7E72]">
              <span>Tài Khoản</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Hồ Sơ</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#1E3932] font-black uppercase">
                {SIDEBAR_ITEMS.find((i) => i.key === activeTab)?.label}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-[#006241] font-bold">
              <Shield className="w-4 h-4" />
              <span>Bảo mật 100%</span>
            </div>
          </div>

          <div className="animate-tab-transition">
            {activeTab === 'profile' && (
              <ProfileInfoTab
                profile={profile}
                onProfileUpdated={loadProfileData}
                onAvatarClick={() => profile?.avatar && setIsPreviewAvatarOpen(true)}
              />
            )}

            {activeTab === 'booked-yards' && <BookedYardsTab currentUser={currentUser} />}

            {activeTab === 'vendor' && <VendorManagementTab />}

            {activeTab === 'wallet' && <WalletTab />}

            {activeTab === 'settings' && (
              <div className="p-8 text-center rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-3">
                <Settings className="w-10 h-10 text-[#006241] mx-auto" />
                <h3 className="text-base font-extrabold text-[#1E3932]">Cài Đặt Bảo Mật &amp; Thông Báo</h3>
                <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
                  Tính năng thay đổi mật khẩu, xác thực 2 lớp (2FA) và cấu hình nhận email thông báo đang được nâng cấp.
                </p>
              </div>
            )}

            {activeTab === 'help' && (
              <div className="p-8 text-center rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-3">
                <HelpCircle className="w-10 h-10 text-[#006241] mx-auto" />
                <h3 className="text-base font-extrabold text-[#1E3932]">Trung Tâm Hỗ Trợ Khách Hàng Sporting ONE</h3>
                <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
                  Hotline hỗ trợ 24/7: <strong className="text-[#1E3932] font-mono">{SUPPORT_PHONE}</strong> · Email: <strong className="text-[#1E3932] font-mono">{SUPPORT_EMAIL}</strong>
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Fullscreen Avatar Modal */}
      {isPreviewAvatarOpen && effectiveAvatar && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPreviewAvatarOpen(false)}
        >
          {/* Close button in top-right corner */}
          <div className="absolute top-5 right-5 flex items-center gap-3 z-10">
            <a
              href={effectiveAvatar}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm cursor-pointer border border-white/20"
              title="Mở ảnh gốc trong tab mới"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={() => setIsPreviewAvatarOpen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500/80 text-white transition-all backdrop-blur-sm cursor-pointer border border-white/20"
              title="Đóng xem ảnh (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large image display area */}
          <div
            className="relative max-w-4xl max-h-[85vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative group">
              <img
                src={effectiveAvatar}
                alt={displayName}
                className="max-w-[85vw] max-h-[70vh] sm:max-h-[75vh] w-auto h-auto rounded-3xl object-contain shadow-2xl border-4 border-white/20 ring-8 ring-black/40"
              />
              <button
                type="button"
                onClick={() => {
                  setIsPreviewAvatarOpen(false);
                  fileInputRef.current?.click();
                }}
                disabled={isUploadingAvatar}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-[#006241]/90 hover:bg-[#006241] text-white text-xs font-bold rounded-full shadow-xl backdrop-blur-sm border border-white/30 transition-all cursor-pointer"
                title="Thay đổi ảnh đại diện"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Đổi ảnh</span>
              </button>
            </div>

            {/* Info beneath image */}
            <div className="mt-4 text-center text-white space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-[#FBF8F0] tracking-wide flex items-center justify-center gap-2">
                <span>{displayName}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
              </h3>
              <p className="text-xs text-white/60 font-mono">{displayEmail}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
