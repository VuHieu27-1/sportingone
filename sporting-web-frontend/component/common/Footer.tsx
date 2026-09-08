import React from 'react';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../utils/appConfig';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1E3932] text-[#FBF8F0] pt-16 pb-12 border-t border-[#006241]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#006241] text-[#FBF8F0] flex items-center justify-center font-extrabold text-lg">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#FBF8F0]">
                SPORTING<span className="text-[#3FB950]">ONE</span>
              </span>
            </div>
            <p className="text-[#6F7E72] text-sm leading-relaxed">
              Nền tảng công nghệ thể thao hàng đầu Việt Nam. Tối ưu công suất sân, ghép đối thông minh & AI Camera tự động ghi hình Highlight.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-base mb-4 text-[#FBF8F0]">Hệ Sinh Thái</h4>
            <ul className="space-y-2.5 text-sm text-[#6F7E72]">
              <li><a href="#ecosystem" className="hover:text-[#FBF8F0] transition-colors">Smart Booking Engine</a></li>
              <li><a href="#ecosystem" className="hover:text-[#FBF8F0] transition-colors">AI Camera HD Highlight</a></li>
              <li><a href="#ecosystem" className="hover:text-[#FBF8F0] transition-colors">Cộng đồng Tìm đối</a></li>
              <li><a href="#ecosystem" className="hover:text-[#FBF8F0] transition-colors">Quản lý Giải đấu</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base mb-4 text-[#FBF8F0]">Đối Tác & Người Dùng</h4>
            <ul className="space-y-2.5 text-sm text-[#6F7E72]">
              <li><a href="#players" className="hover:text-[#FBF8F0] transition-colors">Quyền lợi Người chơi</a></li>
              <li><a href="#vendors" className="hover:text-[#FBF8F0] transition-colors">Đăng ký Chủ sân</a></li>
              <li><a href="#vendors" className="hover:text-[#FBF8F0] transition-colors">Bảng giá Dynamic Pricing</a></li>
              <li><a href="#metrics" className="hover:text-[#FBF8F0] transition-colors">Thống kê hệ thống</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-base mb-4 text-[#FBF8F0]">Liên Hệ Hỗ Trợ</h4>
            <p className="text-sm text-[#6F7E72] mb-2">Hotline: <strong className="text-[#FBF8F0]">{SUPPORT_PHONE}</strong></p>
            <p className="text-sm text-[#6F7E72] mb-4">Email: <strong className="text-[#FBF8F0]">{SUPPORT_EMAIL}</strong></p>
          </div>
        </div>

        <div className="pt-8 border-t border-[#6F7E72]/20 flex flex-col md:flex-row items-center justify-between text-xs text-[#6F7E72] gap-4">
          <p>© 2026 SportingOne. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#FBF8F0]">Bảo mật thông tin</a>
            <a href="#" className="hover:text-[#FBF8F0]">Điều khoản dịch vụ</a>
            <a href="#" className="hover:text-[#FBF8F0]">Quy chế hoạt động</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
