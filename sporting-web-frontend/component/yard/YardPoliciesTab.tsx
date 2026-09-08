import React from 'react';
import {
  ShieldAlert,
  Clock,
  CloudRain,
  QrCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
} from 'lucide-react';

interface YardPoliciesTabProps {
  vendorPhone?: string;
}

export const YardPoliciesTab: React.FC<YardPoliciesTabProps> = ({ vendorPhone }) => {
  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Cancellation & Refund Policy */}
      <div className="bg-[#FBF8F0] p-6 sm:p-8 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>CHÍNH SÁCH ĐỔI & HỦY SÂN</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3932]">
            Quy Định Hủy Lịch & Hoàn Tiền
          </h3>
          <p className="text-xs text-[#6F7E72] mt-1">
            Đảm bảo quyền lợi công bằng cho cả người chơi và ban quản lý cơ sở cụm sân.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-emerald-200 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
              HOÀN 100% TIỀN
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Hủy trước 6 tiếng</h4>
            <p className="text-xs text-[#6F7E72] leading-relaxed">
              Hủy đơn đặt sân trước giờ bắt đầu từ 6 tiếng trở lên sẽ được hoàn 100% giá trị tiền sân về Ví Sporting ONE.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-200 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
              HOÀN 50% TIỀN
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Hủy trước 2 - 6 tiếng</h4>
            <p className="text-xs text-[#6F7E72] leading-relaxed">
              Hủy trong khoảng thời gian từ 2 đến 6 tiếng trước giờ thi đấu sẽ được hoàn 50% giá trị vé vào ví.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-rose-200 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
              KHÔNG HOÀN TIỀN
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Hủy dưới 2 tiếng</h4>
            <p className="text-xs text-[#6F7E72] leading-relaxed">
              Do sân đã được giữ lịch sát giờ, hệ thống không hỗ trợ hoàn tiền hoặc hủy đơn dưới 2 tiếng trước giờ bắt đầu.
            </p>
          </div>
        </div>
      </div>

      {/* Weather Policy */}
      <div className="bg-[#FBF8F0] p-6 sm:p-8 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center shrink-0">
            <CloudRain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#1E3932]">
              Chính Sách Bảo Lưu Do Thời Tiết Bất Khả Kháng
            </h3>
            <p className="text-xs text-[#6F7E72] mt-1 leading-relaxed">
              Đối với các sân ngoài trời, trong trường hợp xảy ra mưa bão hoặc thời tiết xấu không thể thi đấu, cụm sân sẽ xác nhận và hỗ trợ bảo lưu giờ chơi để bạn có thể dời lịch thi đấu sang bất kỳ ngày nào khác trong vòng 30 ngày.
            </p>
          </div>
        </div>
      </div>

      {/* QR Check-in Steps */}
      <div className="bg-[#FBF8F0] p-6 sm:p-8 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>HƯỚNG DẪN NHẬN SÂN</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3932]">
            Quy Trình Check-in & Nhận Sân Bằng Mã QR
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#006241] text-white flex items-center justify-center font-mono font-black text-xs">
              01
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Mở Vé Đặt Sân</h4>
            <p className="text-xs text-[#6F7E72]">
              Truy cập mục "Lịch Sử Đặt Sân" trên Sporting ONE và mở vé điện tử tương ứng.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#006241] text-white flex items-center justify-center font-mono font-black text-xs">
              02
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Xuất Trình Mã QR</h4>
            <p className="text-xs text-[#6F7E72]">
              Đưa mã QR cho nhân viên lễ tân tại cụm sân để quét xác thực thông tin nhanh chóng.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#006241] text-white flex items-center justify-center font-mono font-black text-xs">
              03
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Bắt Đầu Trận Đấu</h4>
            <p className="text-xs text-[#6F7E72]">
              Nhận đúng vị trí sân con và bắt đầu thi đấu trong khung giờ đã đăng ký.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
