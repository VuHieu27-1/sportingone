import React from 'react';
import { TrendingUp, ShieldCheck, BarChart3 } from 'lucide-react';
import { Button } from '../common/Button';
import { ASSETS } from '../../asset/constants';

interface VendorBenefitsSectionProps {
  onOpenRegister: () => void;
}

export const VendorBenefitsSection: React.FC<VendorBenefitsSectionProps> = ({
  onOpenRegister,
}) => {
  return (
    <section id="vendors" className="py-20 bg-[#1E3932] text-[#FBF8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-[#FBF8F0]/20 relative">
              <img
                src={ASSETS.VENDOR_DESK_PREVIEW}
                alt="Vendor Operating Dashboard"
                className="w-full h-[360px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932] via-[#1E3932]/40 to-transparent flex items-end p-6">
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div className="p-3 rounded-2xl bg-[#FBF8F0]/10 backdrop-blur-md border border-[#FBF8F0]/20">
                    <span className="block text-2xl font-extrabold text-[#3FB950] font-mono">+38%</span>
                    <span className="text-xs text-[#FBF8F0]/80">Doanh thu giờ thấp điểm</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FBF8F0]/10 backdrop-blur-md border border-[#FBF8F0]/20">
                    <span className="block text-2xl font-extrabold text-[#3FB950] font-mono">100%</span>
                    <span className="text-xs text-[#FBF8F0]/80">Lấp đầy công suất sân</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 order-1 lg:order-2">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#3FB950] uppercase">
                [ GIẢI PHÁP TỐI ƯU CHO CHỦ SÂN ]
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#FBF8F0] tracking-tight">
                Tối Ưu 100% Công Suất Sân Thể Thao
              </h2>
              <p className="text-sm sm:text-base text-[#FBF8F0]/80">
                Tự động điều chỉnh giá linh hoạt (Dynamic Pricing Rules) để lấp đầy những khung giờ vắng khách.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FBF8F0]/10 border border-[#FBF8F0]/15">
                <div className="w-10 h-10 rounded-xl bg-[#006241] flex items-center justify-center flex-shrink-0 text-[#FBF8F0]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#FBF8F0]">Dynamic Pricing Rule Auto</h4>
                  <p className="text-xs text-[#FBF8F0]/75">Giảm giá tự động giờ thấp điểm, tăng nhẹ giờ vàng để tối đa hóa lợi nhuận.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FBF8F0]/10 border border-[#FBF8F0]/15">
                <div className="w-10 h-10 rounded-xl bg-[#006241] flex items-center justify-center flex-shrink-0 text-[#FBF8F0]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#FBF8F0]">Báo Cáo Doanh Thu Real-Time</h4>
                  <p className="text-xs text-[#FBF8F0]/75">Theo dõi lịch đặt, tiền đặt cọc và dòng tiền trên dashboard máy tính & điện thoại.</p>
                </div>
              </div>
            </div>

            <Button variant="primary" size="lg" onClick={onOpenRegister}>
              <ShieldCheck className="w-5 h-5" /> ĐĂNG KÝ HỢP TÁC CHỦ SÂN
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
