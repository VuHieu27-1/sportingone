import React from 'react';
import { ArrowLeft, MapPin, Phone, Star, Zap, Clock } from 'lucide-react';
import { VendorDisplayItem } from '../../services/vendorService';
import { getSportImageUrl } from '../../utils/sportImageUtils';
import { formatTimeAMPM } from '../../utils/dateUtils';

interface VendorDetailHeroProps {
  vendor: VendorDisplayItem;
  totalYardsCount: number;
  ratingStats?: { averageRating: number; totalReviews: number } | null;
  onBack: () => void;
}

export const VendorDetailHero: React.FC<VendorDetailHeroProps> = ({
  vendor,
  totalYardsCount,
  ratingStats,
  onBack,
}) => {
  /**
   * Retrieves VendorHeroBg information.
   */
  const getVendorHeroBg = (sportType?: string, customUrl?: string) => {
    if (vendor.avatar && vendor.avatar.trim() !== '') {
      return vendor.avatar;
    }
    if (customUrl && customUrl.startsWith('http') && !customUrl.includes('placeholder')) {
      return customUrl;
    }
    return getSportImageUrl(sportType || vendor.name);
  };

  const heroBgImage = vendor.avatar || getVendorHeroBg(vendor.sportType, vendor.imageUrl);
  const vendorInitial = vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V';

  return (
    <div className="relative bg-[#1E3932] text-[#FBF8F0] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={heroBgImage}
          alt={vendor.name}
          className="w-full h-full object-cover opacity-60 brightness-90 contrast-105 transform scale-105 transition-transform duration-1000"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=2000&q=80';
          }}
        />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1E3932]/95 via-[#1E3932]/75 to-[#1E3932]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932] via-transparent to-black/40" />
      </div>

            <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 pb-8 sm:pt-28 sm:pb-12">
                <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FBF8F0]/15 hover:bg-[#FBF8F0]/25 text-[#FBF8F0] font-mono text-xs font-bold transition-all cursor-pointer border border-[#FBF8F0]/20 backdrop-blur-md shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>QUAY LẠI DANH SÁCH</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006241]/90 text-white font-mono text-xs font-bold border border-emerald-400/30 backdrop-blur-md shadow-md">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>ĐỐI TÁC XÁC THỰC</span>
          </div>
        </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-[#006241] text-[#FBF8F0] font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-sm border border-emerald-400/20">
                {vendor.sportType || 'THỂ THAO'}
              </span>
              <span className="px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold backdrop-blur-md">
                {totalYardsCount} Sân Khả Dụng
              </span>
            </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FBF8F0] tracking-tight leading-tight drop-shadow-md">
              {vendor.name}
            </h1>

                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#E6E2D8] font-medium drop-shadow-sm">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-normal">{vendor.address}</span>
            </div>
          </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 bg-[#FBF8F0]/10 backdrop-blur-md p-4 rounded-3xl border border-white/15 shrink-0 shadow-xl">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <span className="text-base font-extrabold text-[#FBF8F0] block leading-none">
                  {ratingStats && ratingStats.totalReviews > 0
                    ? ratingStats.averageRating.toFixed(1)
                    : (vendor.rating && vendor.rating > 0 ? vendor.rating.toFixed(1) : (vendor.totalReviews === 0 ? '0.0' : '5.0'))}
                </span>
                <span className="text-[10px] font-mono text-[#E6E2D8] uppercase tracking-wider block mt-1">
                  {ratingStats && ratingStats.totalReviews !== undefined
                    ? `${ratingStats.totalReviews} Đánh Giá`
                    : vendor.totalReviews !== undefined
                    ? `${vendor.totalReviews} Đánh Giá`
                    : 'Đánh Giá'}
                </span>
              </div>
            </div>

                        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-sm font-extrabold text-[#FBF8F0] block leading-none font-mono">
                  {formatTimeAMPM(vendor.openTime || '06:00')} - {formatTimeAMPM(vendor.closeTime || '23:00')}
                </span>
                <span className="text-[10px] font-mono text-[#E6E2D8] uppercase tracking-wider block mt-1">
                  Giờ Mở Cửa
                </span>
              </div>
            </div>

                        {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#006241] hover:bg-[#006241]/80 border border-emerald-400/30 transition-all shadow-md cursor-pointer"
              >
                <Phone className="w-5 h-5 text-white shrink-0" />
                <div>
                  <span className="text-sm font-extrabold text-white block leading-none font-mono">
                    {vendor.phone}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-200 uppercase tracking-wider block mt-1">
                    Hotline Đặt Sân
                  </span>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
