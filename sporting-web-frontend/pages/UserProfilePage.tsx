import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Store, Wallet, Settings, HelpCircle, ArrowLeft, LogOut, ChevronRight, CheckCircle2, Shield, ChevronDown, ShoppingBag, UserPlus, Trash2, Coins, Calendar, Camera, Loader2, X, ExternalLink, Search, Heart, Bell, BellOff, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { UserProfileDetails, userProfileService, accountAvatarCache } from '../services/userProfileService';
import { walletService } from '../services/walletService';
import { socketService } from '../services/socketService';
import { ProfileInfoTab } from '../component/profile/ProfileInfoTab';
import { VendorManagementTab } from '../component/profile/VendorManagementTab';
import { WalletTab } from '../component/profile/WalletTab';
import { BookedYardsTab, evaluateBookedYardsList } from '../component/profile/BookedYardsTab';
import { tokenManager } from '../utils/tokenManager';
import { useAccounts } from '../hooks/useAccounts';
import { bookingService } from '../services/bookingService';
import { SUPPORT_PHONE, SUPPORT_EMAIL } from '../utils/appConfig';
import { notificationService, UserNotificationItem } from '../services/notificationService';

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
  const [visitedTabs, setVisitedTabs] = useState<Set<ProfileTabKey>>(() => new Set([getInitialTab()]));
  const [profile, setProfile] = useState<UserProfileDetails | null>(() => userProfileService.getCachedProfile());
  const [isLoading, setIsLoading] = useState<boolean>(() => !userProfileService.getCachedProfile());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState<number>(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [selectedNotifDetail, setSelectedNotifDetail] = useState<UserNotificationItem | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  const fetchNotifications = useCallback(async () => {
    const userId = currentUser?.id ? Number(currentUser.id) : null;
    if (!userId) return;
    try {
      setIsLoadingNotifs(true);
      const data = await notificationService.getUserNotifications(userId);
      setNotifications(data || []);
    } catch {
    } finally {
      setIsLoadingNotifs(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, currentUser?.id]);

  const handleNotifClick = async (item: UserNotificationItem) => {
    setNotifOpen(false);
    setSelectedNotifDetail(item);
    if (item.status !== 'read') {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, status: 'read' } : n)));
      try { await notificationService.markAsRead(item.id); } catch {}
    }
  };

  const handleMarkAllRead = async () => {
    const userId = currentUser?.id ? Number(currentUser.id) : null;
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    try { await notificationService.markAllAsRead(userId); toast.success('Đã đánh dấu tất cả là đã đọc!'); } catch {}
  };

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    if (selectedNotifDetail) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedNotifDetail(null); };
      window.addEventListener('keydown', handler);
      return () => { document.body.style.overflow = 'unset'; window.removeEventListener('keydown', handler); };
    }
  }, [selectedNotifDetail]);

  const fetchUpcomingCount = useCallback(async () => {
    const token = tokenManager.getActiveToken();
    if (!token) return;
    try {
      const [resDaily, resMonthly] = await Promise.all([
        bookingService.fetchMyBookings(),
        bookingService.fetchMyBookingsMonth(),
      ]);

      const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
        ...b,
        itemType: 'hourly',
      }));
      const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
        ...bm,
        itemType: 'monthly',
      }));

      const { upcomingCount } = evaluateBookedYardsList([...dailyList, ...monthlyList] as any, new Date());
      setUpcomingBookingsCount(upcomingCount);
    } catch { }
  }, []);

  const handleTabChange = (newTab: ProfileTabKey) => {
    if (newTab === activeTab) return;
    setActiveTabState(newTab);
    setVisitedTabs((prev) => (prev.has(newTab) ? prev : new Set(prev).add(newTab)));
    if (typeof window !== 'undefined' && window.scrollY > 80) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    try {
      sessionStorage.setItem('sporting_profile_active_tab', newTab);
      setSearchParams({ tab: newTab }, { replace: true });
    } catch { }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab && ['profile', 'booked-yards', 'vendor', 'wallet', 'settings', 'help'].includes(tabParam)) {
      const validTab = tabParam as ProfileTabKey;
      setActiveTabState(validTab);
      setVisitedTabs((prev) => (prev.has(validTab) ? prev : new Set(prev).add(validTab)));
    }
  }, [searchParams, activeTab]);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Executes load Profile Data operation.
   */
  const loadProfileData = async () => {
    if (!userProfileService.getCachedProfile() && !profile) {
      setIsLoading(true);
    }
    try {
      const res = await userProfileService.fetchProfileFromApi();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch {
      if (!profile) {
        toast.error('Không thể tải thông tin hồ sơ người dùng.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [currentUser?.username]);

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
      <header className="bg-[#1E3932] text-[#FBF8F0] border-b border-[#006241]/30 sticky top-0 z-40 shadow-md w-full">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 sm:gap-5 lg:gap-7 min-w-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => navigate('/user')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#FBF8F0] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Quay lại Trang Chủ</span>
                <span className="sm:hidden">Trang Chủ</span>
              </button>
              <span className="text-[#A3B1A8] text-xs font-mono hidden sm:inline">|</span>
              <span className="text-xs font-mono font-bold text-emerald-300 hidden sm:inline uppercase tracking-wider truncate">
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

          {/* Right side: action icons + user menu — grouped together like DashboardNavbar */}
          <div className="flex items-center gap-2.5 shrink-0">
          {/* Action icon buttons */}
          <div className="flex items-center gap-1.5">
            {/* Cart */}
            <button
              onClick={() => navigate('/cart')}
              className="flex w-9 h-9 items-center justify-center rounded-full text-[#A3B1A8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Giỏ hàng"
              title="Giỏ hàng & Đặt sân"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            {/* Wishlist */}
            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-[#A3B1A8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Yêu thích"
            >
              <Heart className="w-4 h-4" />
            </button>

            {/* Bell */}
            {currentUser && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { const next = !notifOpen; setNotifOpen(next); setUserMenuOpen(false); setSearchOpen(false); if (next) fetchNotifications(); }}
                  className={`flex w-9 h-9 items-center justify-center rounded-full transition-all cursor-pointer relative ${
                    notifOpen ? 'text-white bg-white/20' : 'text-[#A3B1A8] hover:text-white hover:bg-white/10'
                  }`}
                  aria-label="Thông báo"
                  title="Thông báo của bạn"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#1E3932] animate-pulse shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[min(calc(100vw-1.5rem),24rem)] bg-[#FBF8F0] border border-[#E6E2D8] rounded-[24px] shadow-2xl overflow-hidden z-50 text-[#1E3932]">
                    <div className="p-4 border-b border-[#E6E2D8] bg-[#F2F0EB] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs text-[#1E3932]">Thông Báo Của Bạn</h3>
                          <p className="text-[10px] text-[#6F7E72] font-medium">
                            {unreadCount > 0 ? `${unreadCount} thông báo mới chưa đọc` : 'Tất cả đã đọc'}
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006241] hover:underline cursor-pointer" title="Đánh dấu tất cả đã đọc">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Đã đọc hết</span>
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#F2F0EB] custom-scrollbar">
                      {isLoadingNotifs ? (
                        <div className="py-8 text-center text-xs text-[#6F7E72] font-medium">Đang tải thông báo...</div>
                      ) : notifications.length === 0 ? (
                        <div className="py-10 text-center px-4 space-y-2">
                          <div className="w-10 h-10 rounded-full bg-[#E6E2D8]/60 text-[#6F7E72] flex items-center justify-center mx-auto">
                            <BellOff className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-[#1E3932]">Chưa có thông báo nào</p>
                          <p className="text-[11px] text-[#6F7E72] leading-relaxed">Các thông báo từ hệ thống sẽ hiển thị tại đây.</p>
                        </div>
                      ) : (
                        notifications.map((item) => {
                          const isUnread = item.status !== 'read';
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleNotifClick(item)}
                              className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                                isUnread ? 'bg-emerald-50/70 hover:bg-emerald-50 border-l-4 border-l-[#006241]' : 'hover:bg-[#F2F0EB]/60'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                isUnread ? 'bg-[#006241] text-white' : 'bg-[#E6E2D8] text-[#6F7E72]'
                              }`}>
                                <Bell className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className={`text-xs truncate ${isUnread ? 'font-extrabold text-[#1E3932]' : 'font-bold text-[#6F7E72]'}`}>
                                    {item.notification?.notificationName || 'Thông báo mới'}
                                  </h4>
                                  {isUnread && <span className="w-2 h-2 rounded-full bg-[#006241] shrink-0" />}
                                </div>
                                <p className="text-[11px] text-[#6F7E72] line-clamp-2 leading-relaxed">{item.notification?.contents || ''}</p>
                                <div className="flex items-center justify-between pt-0.5 text-[10px] text-[#6F7E72] font-mono">
                                  <span>{item.notification?.user?.username ? `Bởi: ${item.notification.user.username}` : 'Hệ thống'}</span>
                                  <span>{new Date(item.createdAt || item.notification?.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>{/* end action icons */}

          <div className="relative shrink-0" ref={userMenuRef}>
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
                return (
                  <>
                    {navAvatar && (
                      <img
                        src={navAvatar}
                        alt={displayName}
                        className="w-6 h-6 rounded-full object-cover shadow"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fb = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fb) fb.style.display = 'flex';
                        }}
                      />
                    )}
                    <div
                      style={{ display: navAvatar ? 'none' : 'flex' }}
                      className="w-6 h-6 rounded-full bg-[#006241] items-center justify-center font-extrabold text-[#FBF8F0] text-xs shadow"
                    >
                      {avatarLetter}
                    </div>
                  </>
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
                    <div className="flex items-center gap-1 shrink-0 bg-[#006241]/10 px-2.5 py-0.5 rounded-full border border-[#006241]/20 text-[#006241]">
                      <Coins className="w-3 h-3 text-[#006241] shrink-0" />
                      <span className="text-[11px] font-extrabold font-mono whitespace-nowrap">
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
          </div>{/* end user menu */}
          </div>{/* end right group */}
        </div>
      </header>

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-20 sm:pt-24 pb-10 flex flex-col md:flex-row items-start gap-6 min-w-0">
        <aside className="w-full md:w-64 shrink-0 space-y-4 min-w-0 max-w-full md:sticky md:top-24">
          <div className="p-4 sm:p-5 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-4 sm:space-y-6 min-w-0 max-w-full overflow-hidden md:overflow-visible">
            <div className="p-4 rounded-2xl bg-[#F2F0EB]/70 border border-[#E6E2D8] text-center min-w-0">
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

            <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1.5 pb-1 md:pb-0 custom-scrollbar min-w-0 w-full max-w-full">
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

        <main className="flex-1 space-y-6 min-w-0 w-full max-w-full">
          <div className="p-3.5 sm:p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-sm flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono font-bold text-[#6F7E72] min-w-0 flex-1">
              <span className="shrink-0">Tài Khoản</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#6F7E72]/50" />
              <span className="shrink-0">Hồ Sơ</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#6F7E72]/50" />
              <span className="text-[#1E3932] font-black uppercase truncate">
                {SIDEBAR_ITEMS.find((i) => i.key === activeTab)?.label}
              </span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#006241] font-bold shrink-0">
              <Shield className="w-4 h-4" />
              <span>Bảo mật 100%</span>
            </div>
          </div>

          <div className="min-h-[calc(100vh-200px)] sm:min-h-[680px]">
            {visitedTabs.has('profile') && (
              <div className={activeTab === 'profile' ? 'animate-tab-transition' : 'hidden'}>
                <ProfileInfoTab
                  profile={profile}
                  onProfileUpdated={loadProfileData}
                  onAvatarClick={() => profile?.avatar && setIsPreviewAvatarOpen(true)}
                />
              </div>
            )}

            {visitedTabs.has('booked-yards') && (
              <div className={activeTab === 'booked-yards' ? 'animate-tab-transition' : 'hidden'}>
                <BookedYardsTab
                  currentUser={currentUser}
                  onCountsChange={({ upcoming }) => setUpcomingBookingsCount(upcoming)}
                />
              </div>
            )}

            {visitedTabs.has('vendor') && (
              <div className={activeTab === 'vendor' ? 'animate-tab-transition' : 'hidden'}>
                <VendorManagementTab />
              </div>
            )}

            {visitedTabs.has('wallet') && (
              <div className={activeTab === 'wallet' ? 'animate-tab-transition' : 'hidden'}>
                <WalletTab />
              </div>
            )}

            {visitedTabs.has('settings') && (
              <div className={activeTab === 'settings' ? 'animate-tab-transition' : 'hidden'}>
                <div className="p-8 text-center rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-3">
                  <Settings className="w-10 h-10 text-[#006241] mx-auto" />
                  <h3 className="text-base font-extrabold text-[#1E3932]">Cài Đặt Bảo Mật &amp; Thông Báo</h3>
                  <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
                    Tính năng thay đổi mật khẩu, xác thực 2 lớp (2FA) và cấu hình nhận email thông báo đang được nâng cấp.
                  </p>
                </div>
              </div>
            )}

            {visitedTabs.has('help') && (
              <div className={activeTab === 'help' ? 'animate-tab-transition' : 'hidden'}>
                <div className="p-8 text-center rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-3">
                  <HelpCircle className="w-10 h-10 text-[#006241] mx-auto" />
                  <h3 className="text-base font-extrabold text-[#1E3932]">Trung Tâm Hỗ Trợ Khách Hàng Sporting ONE</h3>
                  <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
                    Hotline hỗ trợ 24/7: <strong className="text-[#1E3932] font-mono">{SUPPORT_PHONE}</strong> · Email: <strong className="text-[#1E3932] font-mono">{SUPPORT_EMAIL}</strong>
                  </p>
                </div>
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
