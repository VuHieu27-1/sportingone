import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
  CheckCircle2,
  Building2,
  Share2,
  Heart,
  ChevronRight,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendYardItem } from '../../services/vendorService';
import { getSportImageUrl } from '../../utils/sportImageUtils';
import { formatTimeAMPM } from '../../utils/dateUtils';

interface YardDetailHeroProps {
  yard: BackendYardItem;
  vendorName: string;
  vendorAddress: string;
  vendorPhone: string;
  openTime?: string;
  closeTime?: string;
  ratingStats?: { averageRating: number; totalReviews: number } | null;
  onBookNow: () => void;
  onBookMonthly?: () => void;
  onViewReviews?: () => void;
}

export const YardDetailHero: React.FC<YardDetailHeroProps> = ({
  yard,
  vendorName,
  vendorAddress,
  vendorPhone,
  openTime = '06:00',
  closeTime = '23:00',
  ratingStats,
  onBookNow,
  onBookMonthly,
  onViewReviews,
}) => {
  const navigate = useNavigate();
  const sportName = yard.sportType?.sportName || 'Thể thao';
  const typeName = yard.typeYard?.typeName || 'Sân thi đấu tiêu chuẩn';
  const priceFormatted = yard.price
    ? `${Number(yard.price).toLocaleString('vi-VN')}đ`
    : 'Liên hệ';

  const coverImageObj = Array.isArray(yard.images)
    ? yard.images.find((img) => img.isCover) || yard.images[0]
    : null;

  const yardImageUrl =
    coverImageObj?.imageUrl ||
    (yard as any).imageUrl ||
    getSportImageUrl(sportName || yard.yardName);

  const isMaintenance = String(yard.status || '').toLowerCase().trim() === 'maintenance';

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép liên kết sân thi đấu vào bộ nhớ tạm!');
    }
  };

  return (
    <div className="bg-[#1E3932] text-[#FBF8F0] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#006241]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 relative z-10 space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#6F7E72]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => navigate('/user')}
              className="hover:text-emerald-300 transition-colors flex items-center gap-1 text-[#F2F0EB]/80 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            {yard.vendor?.id ? (
              <button
                onClick={() => navigate(`/vendor/${yard.vendor?.id}`)}
                className="hover:text-emerald-300 transition-colors text-[#F2F0EB]/80 font-medium cursor-pointer"
              >
                {vendorName}
              </button>
            ) : (
              <span className="text-[#F2F0EB]/80">{vendorName}</span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            <span className="text-emerald-400 font-extrabold">{yard.yardName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-white/10"
              title="Chia sẻ liên kết sân"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* Main Hero Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left / Top: Visual Media Box */}
          <div className="lg:col-span-6 xl:col-span-5 relative group">
            <div className="relative aspect-[16/10] sm:aspect-[16/10] rounded-[28px] overflow-hidden border border-white/15 shadow-2xl bg-black/40">
              <img
                src={yardImageUrl}
                alt={yard.yardName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Status Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241] text-white text-[11px] font-mono font-extrabold uppercase tracking-wider shadow-lg border border-emerald-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  {sportName}
                </span>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-white/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {typeName}
                </span>
              </div>

              {yard.sale?.discountPercent && yard.sale.discountPercent > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-mono font-black uppercase tracking-wider shadow-lg animate-pulse">
                  <Tag className="w-3.5 h-3.5" />
                  <span>ƯU ĐÃI GIẢM {yard.sale.discountPercent}%</span>
                </div>
              )}

              {/* Bottom Photo Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isMaintenance
                        ? 'bg-rose-500/80 text-white'
                        : 'bg-emerald-500/80 text-white'
                    } backdrop-blur-md border border-white/20`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    {isMaintenance ? 'Đang Bảo Trì' : 'Sẵn Sàng Nhận Lịch'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onViewReviews}
                  className="flex items-center gap-1 text-xs text-white/90 bg-black/50 hover:bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono transition-all hover:scale-105 cursor-pointer"
                  title="Bấm để xem chi tiết đánh giá"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-extrabold">
                    {ratingStats && ratingStats.totalReviews > 0
                      ? ratingStats.averageRating.toFixed(1)
                      : '5.0'}
                  </span>
                  <span className="text-white/70">
                    ({ratingStats && ratingStats.totalReviews > 0 ? `${ratingStats.totalReviews} đánh giá` : 'Mới'})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right / Content: Information & Booking Callout */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>THUỘC CỤM SÂN: {vendorName}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#FBF8F0] tracking-tight leading-tight">
                {yard.yardName}
              </h1>

              <div className="mt-2 flex items-start gap-2 text-xs sm:text-sm text-[#F2F0EB]/80">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{vendorAddress || 'Chưa cập nhật địa chỉ'}</span>
              </div>
            </div>

            {/* Key Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold block">
                  Giá Thuê Tiêu Chuẩn
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    {priceFormatted}
                  </span>
                  <span className="text-xs text-[#F2F0EB]/70 font-medium">/ giờ</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold block">
                  Thời Gian Mở Cửa
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm font-extrabold text-[#FBF8F0] font-mono">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {openTime} - {closeTime}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs col-span-2 sm:col-span-1">
                <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold block">
                  Xác Thực Tiêu Chuẩn
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs sm:text-sm font-extrabold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sân Đạt Chuẩn</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBookNow}
                disabled={isMaintenance}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-mono text-xs sm:text-sm font-extrabold shadow-lg transition-all uppercase tracking-wider ${
                  isMaintenance
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-80'
                    : 'bg-[#006241] hover:bg-emerald-600 text-[#FBF8F0] shadow-emerald-950/40 hover:shadow-xl cursor-pointer border border-emerald-400/30'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>{isMaintenance ? 'TẠM KHÓA ĐẶT LỊCH' : 'ĐẶT THEO GIỜ'}</span>
              </button>

              <button
                type="button"
                onClick={onBookMonthly || onBookNow}
                disabled={isMaintenance}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-mono text-xs sm:text-sm font-extrabold shadow-lg transition-all uppercase tracking-wider ${
                  isMaintenance
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-950/40 hover:shadow-xl cursor-pointer border border-amber-300/30'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>{isMaintenance ? 'TẠM KHÓA ĐẶT LỊCH' : 'ĐẶT THEO THÁNG'}</span>
              </button>

              {yard.vendor?.id && (
                <button
                  type="button"
                  onClick={() => navigate(`/vendor/${yard.vendor?.id}`)}
                  className="px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FBF8F0] text-xs font-extrabold border border-white/15 transition-all cursor-pointer text-center"
                >
                  Xem Cụm Sân
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
