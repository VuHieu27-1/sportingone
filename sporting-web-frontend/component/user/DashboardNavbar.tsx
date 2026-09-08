import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Heart,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShoppingBag,
  UserPlus,
  Trash2,
  Wallet,
  Coins,
  Store,
  ShieldCheck,
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  Calendar,
} from 'lucide-react';
import { AuthUser } from '../../types/auth';
import { userProfileService, UserProfileDetails, accountAvatarCache } from '../../services/userProfileService';
import { walletService } from '../../services/walletService';
import { socketService } from '../../services/socketService';
import { notificationService, UserNotificationItem } from '../../services/notificationService';
import { tokenManager } from '../../utils/tokenManager';
import { useAccounts } from '../../hooks/useAccounts';
import { bookingService } from '../../services/bookingService';
import { SportLogoIcon } from '../common/SportLogoIcon';

interface DashboardNavbarProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  currentUser,
  onLogout,
  searchKeyword,
  setSearchKeyword,
}) => {
  const navigate = useNavigate();
  const savedAccounts = useAccounts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [selectedNotifDetail, setSelectedNotifDetail] = useState<UserNotificationItem | null>(null);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileDetails | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleNotificationClick = async (item: UserNotificationItem) => {
    setNotifOpen(false);
    setSelectedNotifDetail(item);
    if (item.status !== 'read') {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: 'read' } : n))
      );
      try {
        await notificationService.markAsRead(item.id);
      } catch {
      }
    }
  };

  useEffect(() => {
    if (selectedNotifDetail) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedNotifDetail(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedNotifDetail]);

  const handleMarkAllAsRead = async () => {
    const userId = currentUser?.id ? Number(currentUser.id) : null;
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    try {
      await notificationService.markAllAsRead(userId);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc!');
    } catch {
    }
  };

  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState<number>(0);

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
    } catch {}
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    const token = tokenManager.getActiveToken();
    if (token) {
      socketService.fetchUsersStatusRest().catch(() => {});
      if (currentUser) {
        userProfileService.fetchProfileFromApi().then((res) => {
          if (isMounted) {
            if (res.success && res.data) {
              setProfile(res.data);
            } else {
              setProfile(null);
            }
          }
        });
      }
    } else {
      setProfile(null);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.username, currentUser?.email, currentUser?.id]);

  const handleLogout = () => {
    tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, onLogout);
    navigate('/login');
  };

  const isProfileMatchingUser =
    profile &&
    currentUser &&
    profile.username &&
    profile.username.toLowerCase() === currentUser.username.toLowerCase();

  const displayName =
    (isProfileMatchingUser && profile?.fullName) ||
    currentUser?.fullName ||
    currentUser?.username ||
    'Người chơi';

  const displayEmail =
    (isProfileMatchingUser && profile?.email) ||
    currentUser?.email ||
    (currentUser?.username ? `${currentUser.username}@gmail.com` : '');

  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarUrl =
    (isProfileMatchingUser && profile?.avatar) ||
    currentUser?.avatarUrl ||
    accountAvatarCache.getAvatar(currentUser?.username || '') ||
    accountAvatarCache.getAvatar(displayName);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    /**
     * Handles event processing for handleClickOutside.
     */
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [activeNav, setActiveNav] = useState<'home' | 'venues' | 'vendor' | null>(() => {
    if (window.location.pathname === '/user/profile' && window.location.search.includes('tab=vendor')) {
      return 'vendor';
    }
    if (window.location.pathname !== '/user') {
      if (window.location.hash === '#venues') return 'venues';
      return null;
    }
    if (window.location.hash === '#venues') return 'venues';
    return 'home';
  });

  useEffect(() => {
    if (window.location.pathname === '/user/profile' && window.location.search.includes('tab=vendor')) {
      setActiveNav('vendor');
    } else if (window.location.pathname !== '/user') {
      if (window.location.hash === '#venues') setActiveNav('venues');
      else setActiveNav(null);
    } else {
      if (window.location.hash === '#venues') setActiveNav('venues');
      else if (!window.location.hash) setActiveNav('home');
    }
  }, [window.location.pathname, window.location.hash, window.location.search]);

  useEffect(() => {
    /**
     * Handles event processing for handleScroll.
     */
    const handleScroll = () => {
      if (window.location.pathname !== '/user') return;
      const venuesElem = document.getElementById('venues');
      const scrollPos = window.scrollY + 250;

      if (venuesElem && scrollPos >= venuesElem.offsetTop) {
        setActiveNav('venues');
      } else {
        setActiveNav('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent,
    navId: 'home' | 'venues' | 'vendor',
    href: string
  ) => {
    e.preventDefault();
    setActiveNav(navId);

    if (navId === 'vendor') {
      navigate('/user/profile?tab=vendor');
      return;
    }

    if (navId === 'home') {
      if (window.location.pathname !== '/user') {
        navigate('/user');
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.history.replaceState(null, '', '/user');
      return;
    }

    if (href.startsWith('#')) {
      const targetId = href.replace('#', '');
      if (window.location.pathname !== '/user') {
        navigate('/user' + href);
        setTimeout(() => {
          const elem = document.getElementById(targetId);
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
      } else {
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
          window.history.replaceState(null, '', href);
        }
      }
    } else {
      navigate(href);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1E3932]/95 backdrop-blur-md border-b border-white/10 shadow-lg font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div
            onClick={(e) => handleNavClick(e, 'home', '/user')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <SportLogoIcon className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-105 transition-transform duration-300" />
            <div className="flex flex-col justify-center">
              <div className="font-extrabold text-[#FBF8F0] text-sm tracking-wider uppercase leading-none">
                SPORTING
              </div>
              <div className="font-mono text-emerald-400 text-[10px] tracking-[0.25em] uppercase leading-none mt-0.5">
                ONE PLATFORM
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            {[
              { id: 'home', label: 'Trang Chủ', href: '/user' },
              { id: 'venues', label: 'Danh Sách Sân', href: '#venues' },
              { id: 'vendor', label: 'Quản Lý Vendor', href: '/user/profile?tab=vendor' },
            ].map((item) => {
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) =>
                    handleNavClick(e, item.id as 'home' | 'venues' | 'vendor', item.href)
                  }
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${isActive
                      ? 'text-white bg-[#006241] shadow-sm'
                      : 'text-[#A3B1A8] hover:text-[#FBF8F0] hover:bg-white/10'
                    }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setUserMenuOpen(false);
                }}
                className={`flex w-9 h-9 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${searchOpen
                  ? 'bg-[#006241] text-white shadow-md'
                  : 'text-[#A3B1A8] hover:text-white hover:bg-white/10'
                  }`}
                aria-label="Tìm kiếm"
              >
                <Search className="w-4 h-4" />
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-3 w-[min(calc(100vw-1.5rem),20rem)] bg-[#FBF8F0] border border-[#E6E2D8] rounded-[24px] shadow-2xl z-50 overflow-hidden text-[#1E3932]">
                  <div className="p-4">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E6E2D8] rounded-full focus-within:border-[#006241] focus-within:ring-2 focus-within:ring-[#006241]/20 transition-all">
                      <Search className="w-4 h-4 text-[#6F7E72] shrink-0" />
                      <input
                        ref={inputRef}
                        type="text"
                        tabIndex={1}
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Tìm tên sân hoặc Vendor..."
                        className="flex-1 text-xs font-semibold text-[#1E3932] placeholder:text-[#6F7E72] bg-transparent focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setSearchOpen(false);
                          if (e.key === 'Enter') {
                            setSearchOpen(false);
                            document.getElementById('venues')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      />
                      {searchKeyword && (
                        <button
                          onClick={() => setSearchKeyword('')}
                          className="text-[#6F7E72] hover:text-[#1E3932] cursor-pointer transition-colors"
                          aria-label="Xoá tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] font-mono text-[#6F7E72] font-semibold mt-2.5 px-2">
                      Nhấn <kbd className="px-1.5 py-0.5 bg-[#F2F0EB] border border-[#E6E2D8] rounded text-[#1E3932]">Enter</kbd> xem kết quả · <kbd className="px-1.5 py-0.5 bg-[#F2F0EB] border border-[#E6E2D8] rounded text-[#1E3932]">Esc</kbd> đóng
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/cart')}
              className="flex w-9 h-9 items-center justify-center rounded-full text-[#A3B1A8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Giỏ hàng đặt sân"
              title="Giỏ hàng & Quản lý đơn đặt sân"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-[#A3B1A8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Yêu thích"
            >
              <Heart className="w-4 h-4" />
            </button>

            {/* Notification Bell Dropdown */}
            {currentUser && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    const next = !notifOpen;
                    setNotifOpen(next);
                    setUserMenuOpen(false);
                    setSearchOpen(false);
                    if (next) fetchNotifications();
                  }}
                  className={`flex w-9 h-9 items-center justify-center rounded-full transition-all cursor-pointer relative ${
                    notifOpen
                      ? 'text-white bg-white/20'
                      : 'text-[#A3B1A8] hover:text-white hover:bg-white/10'
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
                  <div className="absolute right-0 top-full mt-3 w-[min(calc(100vw-1.5rem),24rem)] bg-[#FBF8F0] border border-[#E6E2D8] rounded-[24px] shadow-2xl overflow-hidden z-50 text-[#1E3932] animate-scale-in font-['Plus_Jakarta_Sans',sans-serif]">
                    {/* Header */}
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
                        <button
                          onClick={handleMarkAllAsRead}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006241] hover:underline cursor-pointer transition-colors"
                          title="Đánh dấu tất cả là đã đọc"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Đã đọc hết</span>
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#F2F0EB] custom-scrollbar">
                      {isLoadingNotifs ? (
                        <div className="py-8 text-center text-xs text-[#6F7E72] font-medium">
                          Đang tải thông báo...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-10 text-center px-4 space-y-2">
                          <div className="w-10 h-10 rounded-full bg-[#E6E2D8]/60 text-[#6F7E72] flex items-center justify-center mx-auto">
                            <BellOff className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-[#1E3932]">Chưa có thông báo nào</p>
                          <p className="text-[11px] text-[#6F7E72] leading-relaxed">
                            Các thông báo từ ban quản trị và hệ thống sẽ hiển thị tại đây.
                          </p>
                        </div>
                      ) : (
                        notifications.map((item) => {
                          const isUnread = item.status !== 'read';
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`p-3.5 transition-colors cursor-pointer text-left flex items-start gap-3 ${
                                isUnread
                                  ? 'bg-emerald-50/70 hover:bg-emerald-50 border-l-4 border-l-[#006241]'
                                  : 'hover:bg-[#F2F0EB]/60 bg-transparent'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  isUnread
                                    ? 'bg-[#006241] text-white shadow-xs'
                                    : 'bg-[#E6E2D8] text-[#6F7E72]'
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </div>

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className={`text-xs truncate ${isUnread ? 'font-extrabold text-[#1E3932]' : 'font-bold text-[#6F7E72]'}`}>
                                    {item.notification?.notificationName || 'Thông báo mới'}
                                  </h4>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-[#006241] shrink-0" />
                                  )}
                                </div>

                                <p className="text-[11px] text-[#6F7E72] line-clamp-2 leading-relaxed">
                                  {item.notification?.contents || ''}
                                </p>

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

            {(!currentUser || (currentUser.role as string) === 'GUEST' || (currentUser as any).roleName === 'guest') ? (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#006241] hover:bg-[#007a52] text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-emerald-400/30"
              >
                <User className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </button>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    const nextState = !userMenuOpen;
                    setUserMenuOpen(nextState);
                    setSearchOpen(false);
                    if (nextState) {
                      fetchWalletBalance();
                      fetchUpcomingCount();
                      socketService.fetchUsersStatusRest().catch(() => {});
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover shadow" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#006241] flex items-center justify-center font-extrabold text-[#FBF8F0] text-xs shadow">
                      {avatarLetter}
                    </div>
                  )}
                  <span className="hidden sm:block text-xs font-bold text-[#FBF8F0] max-w-[90px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-[#A3B1A8] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                          navigate('/user/profile?tab=wallet');
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer group"
                        title="Ví xu & Nạp tiền"
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
                          navigate('/user/profile?tab=booked-yards');
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
                          navigate('/user/profile');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-[#1E3932] hover:bg-[#F2F0EB] text-xs font-bold transition-all text-left cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#006241]" />
                        Hồ Sơ Của Tôi
                      </button>

                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full bg-[#006241]/10 text-[#006241] hover:bg-[#006241]/20 text-xs font-extrabold transition-all text-left cursor-pointer border border-[#006241]/20"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#006241]" />
                          Trang Quản Trị Của Admin
                        </button>
                      )}

                      {currentUser?.role === 'VENDOR' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/vendor/dashboard');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full bg-[#006241]/10 text-[#006241] hover:bg-[#006241]/20 text-xs font-extrabold transition-all text-left cursor-pointer border border-[#006241]/20"
                        >
                          <Store className="w-4 h-4 text-[#006241]" />
                          Quản Lý Cụm Sân (Vendor)
                        </button>
                      )}
                    </div>

                    <div className="p-2 border-b border-[#E6E2D8] space-y-1">
                      <div className="px-3 py-1 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
                        Danh sách tài khoản ({savedAccounts.length})
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {savedAccounts.map((acc) => {
                          const accAvatar = (acc.isActive && avatarUrl) || accountAvatarCache.getAvatar(acc.username);
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
            )}

            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[#A3B1A8] hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1E3932] px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-full mb-3">
            <Search className="w-4 h-4 text-[#A3B1A8] shrink-0" />
            <input
              type="text"
              tabIndex={1}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm tên sân hoặc Vendor..."
              className="flex-1 text-xs font-medium text-white placeholder:text-[#A3B1A8] bg-transparent focus:outline-none"
            />
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="text-[#A3B1A8] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {[
            { id: 'home', label: 'Trang Chủ', href: '/user' },
            { id: 'venues', label: 'Danh Sách Sân', href: '#venues' },
            { id: 'vendor', label: 'Quản Lý Vendor', href: '/user/profile?tab=vendor' },
          ].map((item) => {
            const isActive = activeNav === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, item.id as 'home' | 'venues' | 'vendor', item.href);
                }}
                className={`block px-4 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${isActive
                    ? 'text-white bg-[#006241] shadow-sm'
                    : 'text-[#FBF8F0] hover:bg-white/10'
                  }`}
              >
                {item.label}
              </a>
            );
          })}
          <div className="pt-2 border-t border-white/10 mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full text-[#DC2626] bg-white text-xs font-extrabold hover:bg-red-50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Đăng Xuất
            </button>
          </div>
        </div>
      )}

      {/* Notification Reader Modal - createPortal centered on screen */}
      {selectedNotifDetail &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
            onClick={() => setSelectedNotifDetail(null)}
          >
            <div
              className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl border border-[#E6E2D8] overflow-hidden flex flex-col max-h-[85vh] animate-scale-in text-[#1E3932]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-[#F8F7F4] border-b border-[#E6E2D8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0 border border-[#006241]/20">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1E3932]">Chi Tiết Thông Báo</h3>
                    <p className="text-[11px] text-[#6F7E72] font-medium mt-0.5">
                      Gửi lúc {new Date(selectedNotifDetail.createdAt || selectedNotifDetail.notification?.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotifDetail(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng cửa sổ (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#6F7E72] block mb-1.5">
                    Tiêu Đề Thông Báo
                  </span>
                  <h4 className="text-base font-black text-[#1E3932] leading-snug">
                    {selectedNotifDetail.notification?.notificationName}
                  </h4>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E6E2D8] space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#6F7E72] block">
                    Nội Dung
                  </span>
                  <p className="text-xs text-[#1E3932] font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedNotifDetail.notification?.contents}
                  </p>
                </div>

                {selectedNotifDetail.notification?.user?.username && (
                  <div className="flex items-center gap-2 text-xs text-[#6F7E72] font-semibold pt-1">
                    <span>Người gửi:</span>
                    <span className="text-[#006241] font-bold bg-[#006241]/10 px-2.5 py-0.5 rounded-full border border-[#006241]/20">
                      {selectedNotifDetail.notification.user.username}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#F8F7F4] border-t border-[#E6E2D8] flex items-center justify-end">
                <button
                  onClick={() => setSelectedNotifDetail(null)}
                  className="px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  Đóng Lại
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};
