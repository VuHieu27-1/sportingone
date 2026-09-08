import React from 'react';
import { ArrowDown, PlayCircle, Trophy } from 'lucide-react';

interface DashboardHeroProps {
  vendorCount: number;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ vendorCount }) => {
  return (
    <section className="relative w-full min-h-[300px] sm:min-h-[350px] flex flex-col justify-center overflow-hidden bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=2400&q=80"
          alt="Cinematic Sports Stadium"
          className="w-full h-full object-cover opacity-90 brightness-95 contrast-105 transform scale-105"
        />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30" />
      </div>

            <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-10 w-full">
        <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#006241]/90 backdrop-blur-md text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-md border border-white/20">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>HỆ THỐNG ĐẶT SÂN THỂ THAO CHÍNH THỨC</span>
          </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight drop-shadow-lg">
            Đặt Sân Thể Thao Dễ Dàng &amp; Nhanh Chóng
          </h1>

                    <p className="text-slate-200 text-xs sm:text-sm font-medium max-w-xl leading-relaxed drop-shadow">
            Kết nối trực tiếp với <span className="text-emerald-400 font-extrabold">{vendorCount} Vendor đối tác</span> được kiểm định chất lượng. Giữ lịch chuẩn xác 100%, sẵn sàng cho mọi trận đấu.
          </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#venues"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all duration-300 cursor-pointer border border-emerald-400/30"
            >
              <span>Xem Các Cụm Sân</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>

            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition-all duration-300 cursor-pointer border border-white/20">
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hướng Dẫn</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
