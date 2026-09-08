import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, MessageCircle, PlaySquare } from 'lucide-react';

import { SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../../utils/appConfig';

export const DashboardFooter: React.FC = () => {
  const navigate = useNavigate();

  /**
   * Handles event processing for handleFooterNav.
   */
  const handleFooterNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      if (window.location.pathname !== '/user') {
        navigate('/user' + href);
      } else {
        const targetId = href.replace('#', '');
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(href);
    }
  };

  return (
    <footer className="bg-[#1E3932] text-[#FBF8F0] border-t border-white/10 font-['Plus_Jakarta_Sans',sans-serif]" id="footer-section">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div
              onClick={() => navigate('/user')}
              className="flex items-center gap-3 mb-4 cursor-pointer group"
              title="Về Trang Chủ"
            >
              <div className="w-9 h-9 rounded-full bg-[#006241] flex items-center justify-center font-extrabold text-[#FBF8F0] text-sm shadow-md border border-white/20 group-hover:scale-105 transition-transform duration-300">
                S
              </div>
              <div>
                <div className="font-extrabold text-[#FBF8F0] text-sm tracking-wider uppercase">SPORTING</div>
                <div className="font-mono text-emerald-400 text-[10px] tracking-[0.25em] uppercase">ONE PLATFORM</div>
              </div>
            </div>
            <p className="text-[#A3B1A8] text-xs leading-relaxed mb-6 font-medium">
              Nền tảng đặt sân thể thao toàn diện hàng đầu Việt Nam. Kết nối người chơi với hệ thống Vendor đối tác đã xác thực chất lượng.
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { Icon: Globe, href: '#', label: 'Website' },
                { Icon: MessageCircle, href: '#', label: 'Messenger' },
                { Icon: PlaySquare, href: '#', label: 'Video' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#006241] text-[#FBF8F0] flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono font-bold text-emerald-400 text-xs uppercase tracking-widest mb-4">Khám Phá</h3>
            <ul className="space-y-3">
              {['Danh Sách Vendor', 'Đặt Sân Bóng Đá', 'Sân Cầu Lông', 'Sân Pickleball', 'Sân Tennis'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#venues"
                      onClick={(e) => handleFooterNav(e, '#venues')}
                      className="text-[#A3B1A8] hover:text-[#FBF8F0] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-mono font-bold text-emerald-400 text-xs uppercase tracking-widest mb-4">Hỗ Trợ</h3>
            <ul className="space-y-3">
              {['Hướng Dẫn Đặt Sân', 'Chính Sách Đổi Trả', 'Điều Khoản Sử Dụng', 'Bảo Mật Thông Tin', 'Liên Hệ Hỗ Trợ'].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#about"
                      onClick={(e) => handleFooterNav(e, '#about')}
                      className="text-[#A3B1A8] hover:text-[#FBF8F0] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-mono font-bold text-emerald-400 text-xs uppercase tracking-widest mb-5">Liên Hệ</h3>
            <div className="space-y-4">
              {[
                { Icon: MapPin, text: SUPPORT_ADDRESS },
                { Icon: Phone, text: SUPPORT_PHONE_DISPLAY },
                { Icon: Mail, text: SUPPORT_EMAIL },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3.5 text-[#A3B1A8] group">
                  <div className="w-8 h-8 rounded-full bg-[#006241]/30 border border-white/15 flex items-center justify-center shrink-0 group-hover:bg-[#006241] transition-all duration-300 shadow-sm">
                    <Icon className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-semibold leading-none">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#162B26]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#A3B1A8] text-xs font-medium font-mono">
            © 2026 Sporting ONE Platform. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};
