import React from 'react';
import { CalendarCheck, Video, Users, Trophy, Award } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';

export const EcosystemSection: React.FC = () => {
  const modules = [
    {
      id: 'mod-1',
      number: '01',
      title: 'Smart Booking Engine',
      description: 'Đặt sân bóng đá, cầu lông, tennis, pickleball chỉ trong 30 giây với lịch trống real-time.',
      icon: CalendarCheck,
      tag: 'TỰ ĐỘNG 24/7',
    },
    {
      id: 'mod-2',
      number: '02',
      title: 'AI Camera HD Highlights',
      description: 'Camera AI góc rộng tự động ghi lại siêu phẩm, cắt video ngắn HD gửi về ứng dụng ngay sau trận.',
      icon: Video,
      tag: 'CÔNG NGHỆ AI',
    },
    {
      id: 'mod-3',
      number: '03',
      title: 'Cộng Đồng Ghép Đội',
      description: 'Tìm đối thủ cùng trình độ, tạo kèo thi đấu giao hữu nhanh chóng hoặc tìm người đá chữa cháy.',
      icon: Users,
      tag: 'MATCHMAKING',
    },
    {
      id: 'mod-4',
      number: '04',
      title: 'Tournament Engine',
      description: 'Tự động chia bảng, tính điểm xếp hạng ELO, cập nhật lịch thi đấu & kết quả giải chuyên nghiệp.',
      icon: Trophy,
      tag: 'QUẢN LÝ GIẢI',
    },
    {
      id: 'mod-5',
      number: '05',
      title: 'Loyalty Bonus Points',
      description: 'Tích điểm thưởng sau mỗi lượt đặt sân, đổi voucher giảm giá, nước uống & phụ kiện thể thao.',
      icon: Award,
      tag: 'TÍCH ĐIỂM ĐỔI QUÀ',
    },
  ];

  return (
    <section id="ecosystem" className="py-20 bg-[#F2F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-4xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold tracking-widest text-[#006241] uppercase">
            [ HỆ SINH THÁI ĐẶT SÂN 5 TRONG 1 ]
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1E3932] tracking-tight leading-tight whitespace-normal">
            Nền Tảng Công Nghệ Thể Thao Cốt Lõi
          </h2>
          <p className="text-sm sm:text-base text-[#6F7E72] font-medium max-w-2xl mx-auto leading-relaxed">
            Tích hợp toàn diện từ khâu tìm sân, ghép đối, ghi hình tự động cho đến quản lý giải đấu quy mô.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <GlassCard
                key={item.id}
                className="bg-[#FBF8F0] border border-[#6F7E72]/20 hover:border-[#006241] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#6F7E72]">{item.number}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#006241]/10 text-[#006241]">
                      {item.tag}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center group-hover:bg-[#006241] group-hover:text-[#FBF8F0] transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1E3932] leading-snug">{item.title}</h3>
                  <p className="text-xs text-[#6F7E72] leading-relaxed">{item.description}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};
