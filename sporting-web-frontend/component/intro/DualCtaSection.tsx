import React from 'react';
import { UserPlus, Building2 } from 'lucide-react';
import { Button } from '../common/Button';
import { ASSETS } from '../../asset/constants';

interface DualCtaSectionProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const DualCtaSection: React.FC<DualCtaSectionProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  return (
    <section className="py-20 bg-[#F2F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-10 flex flex-col justify-between min-h-[320px] text-[#FBF8F0] shadow-xl group">
            <img
              src={ASSETS.PLAYER_ACTION}
              alt="Player Action"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932] via-[#1E3932]/75 to-black/40" />

            <div className="relative z-10 space-y-3">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#006241] inline-block">
                DÀNH CHO NGƯỜI CHƠI
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold">Tìm Sân & Ghép Đội Thi Đấu Tức Thì</h3>
              <p className="text-xs sm:text-sm text-[#FBF8F0]/85">
                Tạo tài khoản miễn phí, trải nghiệm đặt sân 30s và xem lại clip Highlight HD cá nhân.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Button variant="primary" size="lg" onClick={onOpenLogin}>
                <UserPlus className="w-5 h-5" /> BẮT ĐẦU ĐẶT SÂN
              </Button>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-10 flex flex-col justify-between min-h-[320px] text-[#FBF8F0] shadow-xl group">
            <img
              src={ASSETS.VENDOR_PARTNER}
              alt="Vendor Partner"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932] via-[#1E3932]/80 to-black/50" />

            <div className="relative z-10 space-y-3">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#3FB950] text-[#1E3932] inline-block">
                DÀNH CHO CHỦ SÂN
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold">Tăng Doanh Thu & Quản Lý Tự Động</h3>
              <p className="text-xs sm:text-sm text-[#FBF8F0]/85">
                Đăng ký hợp tác đối tác, sử dụng hệ thống quản lý lịch và Dynamic Pricing Rules ngay hôm nay.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Button variant="secondary" size="lg" onClick={onOpenRegister} className="border border-[#FBF8F0]/30">
                <Building2 className="w-5 h-5" /> ĐĂNG KÝ CHỦ SÂN
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
