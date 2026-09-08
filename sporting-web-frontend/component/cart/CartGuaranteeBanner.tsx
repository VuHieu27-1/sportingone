import { ShieldCheck, QrCode, RotateCcw, Zap } from 'lucide-react';

export const CartGuaranteeBanner: React.FC = () => {
  return (
    <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-semibold text-[#1E3932] shadow-sm">
      <div className="flex items-center gap-2 text-[#006241]">
        <ShieldCheck className="w-5 h-5" />
        <span className="font-extrabold text-xs">
          Cam Kết Sporting ONE
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-[#6F7E72]">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#006241]" />
          <span>Giữ Lịch & Thanh Toán Tức Thời</span>
        </div>
        <div className="flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-[#006241]" />
          <span>Vé Check-in QR Bảo Mật</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4 text-[#006241]" />
          <span>Tự Động Hoàn Xu Trước Giờ Chơi</span>
        </div>
      </div>
    </div>
  );
};
