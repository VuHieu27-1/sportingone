import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, User } from 'lucide-react';
import { Button } from './Button';
import { SportLogoIcon } from './SportLogoIcon';
import { AuthUser } from '../../types/auth';

interface HeaderProps {
  onNavigateToAuth: (mode?: 'login' | 'register') => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateToAuth,
  currentUser,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    /**
     * Handles event processing for handleScroll.
     */
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled
        ? 'bg-[#FBF8F0]/95 backdrop-blur-md shadow-md py-3.5 border-b border-[#6F7E72]/20'
        : 'bg-[#1E3932]/40 backdrop-blur-md py-4 border-b border-[#FBF8F0]/10 shadow-sm'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <SportLogoIcon className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-105 transition-transform duration-300" />
          <span
            className={`font-extrabold text-lg sm:text-xl tracking-tight transition-colors leading-none flex items-center ${scrolled ? 'text-[#1E3932]' : 'text-[#FBF8F0]'
              }`}
          >
            SPORTING<span className={scrolled ? 'text-[#006241]' : 'text-[#3FB950]'}>ONE</span>
          </span>
        </a>

        <nav
          className={`hidden md:flex items-center gap-8 font-bold text-sm tracking-wide transition-colors ${scrolled ? 'text-[#1E3932]' : 'text-[#FBF8F0]'
            }`}
        >
          <a
            href="#nearby-courts"
            className={`transition-colors ${scrolled ? 'hover:text-[#006241]' : 'hover:text-[#3FB950]'
              }`}
          >
            Sân gần bạn
          </a>
          <a
            href="#ecosystem"
            className={`transition-colors ${scrolled ? 'hover:text-[#006241]' : 'hover:text-[#3FB950]'
              }`}
          >
            Hệ sinh thái
          </a>
          <a
            href="#players"
            className={`transition-colors ${scrolled ? 'hover:text-[#006241]' : 'hover:text-[#3FB950]'
              }`}
          >
            Dành cho Người chơi
          </a>
          <a
            href="#vendors"
            className={`transition-colors ${scrolled ? 'hover:text-[#006241]' : 'hover:text-[#3FB950]'
              }`}
          >
            Dành cho Chủ sân
          </a>
          <a
            href="#metrics"
            className={`transition-colors ${scrolled ? 'hover:text-[#006241]' : 'hover:text-[#3FB950]'
              }`}
          >
            Thống kê
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (currentUser.role === 'ADMIN') {
                    navigate('/admin');
                  } else if (currentUser.role === 'VENDOR' || (currentUser as any)?.isVendor) {
                    navigate('/vendor/dashboard');
                  } else {
                    navigate('/user');
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30 cursor-pointer transition-all active:scale-95"
              >
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {currentUser.role === 'ADMIN' ? 'Trang Quản Trị' : currentUser.role === 'VENDOR' ? 'Kênh Chủ Sân' : 'Trang Cá Nhân'} ({currentUser.fullName || currentUser.username})
                </span>
              </button>
              <Button
                variant={scrolled ? 'outline' : 'secondary'}
                size="sm"
                onClick={onLogout}
              >
                Đăng xuất
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                className={`px-5 py-2 text-xs font-extrabold rounded-full border transition-all cursor-pointer shadow-sm ${scrolled
                  ? 'border-[#1E3932] text-[#1E3932] hover:bg-[#1E3932] hover:text-[#FBF8F0]'
                  : 'border-[#FBF8F0]/70 text-[#FBF8F0] hover:bg-[#FBF8F0] hover:text-[#1E3932]'
                  }`}
              >
                Đăng nhập / Đăng ký
              </button>

              <Button variant="primary" size="sm" onClick={() => onNavigateToAuth('login')}>
                <Calendar className="w-4 h-4" /> Đặt sân 30s
              </Button>
            </>
          )}
        </div>

        <button
          className={`md:hidden p-2 rounded-full transition-colors ${scrolled
            ? 'text-[#1E3932] hover:bg-[#6F7E72]/10'
            : 'text-[#FBF8F0] hover:bg-[#FBF8F0]/20'
            }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF8F0] border-b border-[#6F7E72]/20 px-6 py-6 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3 font-bold text-[#1E3932]">
            <a href="#nearby-courts" onClick={() => setMobileMenuOpen(false)}>Sân gần bạn</a>
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)}>Hệ sinh thái</a>
            <a href="#players" onClick={() => setMobileMenuOpen(false)}>Người chơi</a>
            <a href="#vendors" onClick={() => setMobileMenuOpen(false)}>Chủ sân</a>
            <a href="#metrics" onClick={() => setMobileMenuOpen(false)}>Thống kê</a>
          </nav>
          <div className="pt-4 border-t border-[#6F7E72]/20 flex flex-col gap-2.5">
            {currentUser ? (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (currentUser.role === 'ADMIN') {
                      navigate('/admin');
                    } else if (currentUser.role === 'VENDOR' || (currentUser as any)?.isVendor) {
                      navigate('/vendor/dashboard');
                    } else {
                      navigate('/user');
                    }
                  }}
                >
                  <User className="w-4 h-4" />
                  <span>
                    {currentUser.role === 'ADMIN' ? 'Vào Trang Quản Trị' : currentUser.role === 'VENDOR' ? 'Vào Kênh Chủ Sân' : 'Vào Trang Cá Nhân'}
                  </span>
                </Button>
                <Button variant="outline" fullWidth onClick={() => { setMobileMenuOpen(false); onLogout?.(); }}>
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" fullWidth onClick={() => { setMobileMenuOpen(false); onNavigateToAuth('login'); }}>
                  Đăng nhập / Đăng ký
                </Button>
                <Button variant="primary" fullWidth onClick={() => { setMobileMenuOpen(false); onNavigateToAuth('login'); }}>
                  <Calendar className="w-4 h-4" /> Đặt sân ngay (30s)
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
