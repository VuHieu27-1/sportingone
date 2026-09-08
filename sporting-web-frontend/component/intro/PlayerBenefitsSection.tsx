import React from 'react';
import { Zap, Video, Users, Gift, CheckCircle2 } from 'lucide-react';
import { ASSETS } from '../../asset/constants';

export const PlayerBenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: Zap,
      title: 'Đặt sân tức thì 30s',
      desc: 'Xem lịch trống thực tế, thanh toán bảo mật không phí ẩn.',
    },
    {
      icon: Video,
      title: 'AI Video Highlight HD',
      desc: 'Tự động bắt trọn siêu phẩm bàn thắng & pha xử lý mãn nhãn.',
    },
    {
      icon: Users,
      title: 'Ghép đội & Tìm đối',
      desc: 'Kết nối cộng đồng người chơi gần bạn cùng trình độ ELO.',
    },
    {
      icon: Gift,
      title: 'Tích điểm đổi quà',
      desc: 'Nhận xu tích lũy đổi voucher nước uống, thuê bóng & phụ kiện.',
    },
  ];

  return (
    <section id="players" className="py-20 bg-[#FBF8F0] border-y border-[#6F7E72]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#006241] uppercase">
                [ DÀNH CHO NGƯỜI CHƠI & ĐỘI BÓNG ]
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E3932] tracking-tight">
                Trải Nghiệm Thể Thao Đỉnh Cao & Thuận Tiện
              </h2>
              <p className="text-base text-[#6F7E72]">
                Không còn lo lắng việc hết sân giờ cao điểm hay thiếu đối thủ thi đấu giao hữu hàng tuần.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-5 rounded-2xl bg-[#F2F0EB] border border-[#6F7E72]/20 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#006241] text-[#FBF8F0] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-[#1E3932]">{item.title}</h3>
                    <p className="text-xs text-[#6F7E72] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 flex items-center gap-3 text-xs font-semibold text-[#1E3932]">
              <CheckCircle2 className="w-5 h-5 text-[#006241] flex-shrink-0" />
              <span>Hỗ trợ hoàn tiền 100% khi thời tiết xấu hoặc sân báo bận đột xuất trước 2h.</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl border-4 border-[#1E3932]">
              <img
                src={ASSETS.MOBILE_APP_PREVIEW}
                alt="SportingOne App Mobile Preview"
                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932]/80 via-transparent to-transparent flex items-end p-6">
                <div className="text-[#FBF8F0] space-y-1">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#006241]">
                    APP LIVE 2.0
                  </span>
                  <h4 className="font-bold text-lg">Giao diện đặt sân di động tối ưu</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
