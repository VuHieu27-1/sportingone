import React, { useState } from 'react';
import { MapPin, Star, Heart, ArrowUpRight, Shield, Lightbulb, Wifi, Car } from 'lucide-react';
import { VendorDisplayItem } from '../../services/vendorService';

interface VendorCardProps {
  vendor: VendorDisplayItem;
  onSelect: (vendor: VendorDisplayItem) => void;
}

const SPORT_STYLE_MAP: Record<string, { color: string; bg: string }> = {
  'THỂ THAO': { color: 'text-[#1E3932]', bg: 'bg-[#F2F0EB] border border-[#E6E2D8]' },
  'GENERAL': { color: 'text-[#1E3932]', bg: 'bg-[#F2F0EB] border border-[#E6E2D8]' },
  'BÓNG ĐÁ': { color: 'text-[#065F46]', bg: 'bg-[#D1FAE5] border border-[#A7F3D0]' },
  'FOOTBALL': { color: 'text-[#065F46]', bg: 'bg-[#D1FAE5] border border-[#A7F3D0]' },
  'CẦU LÔNG': { color: 'text-[#B45309]', bg: 'bg-[#FEF3C7] border border-[#FDE68A]' },
  'BADMINTON': { color: 'text-[#B45309]', bg: 'bg-[#FEF3C7] border border-[#FDE68A]' },
  'PICKLEBALL': { color: 'text-[#0369A1]', bg: 'bg-[#E0F2FE] border border-[#BAE6FD]' },
  'TENNIS': { color: 'text-[#C2410C]', bg: 'bg-[#FFEDD5] border border-[#FED7AA]' },
  'BÓNG RỔ': { color: 'text-[#B91C1C]', bg: 'bg-[#FEE2E2] border border-[#FCA5A5]' },
  'BASKETBALL': { color: 'text-[#B91C1C]', bg: 'bg-[#FEE2E2] border border-[#FCA5A5]' },
  'BÓNG CHUYỀN': { color: 'text-[#6D28D9]', bg: 'bg-[#F3E8FF] border border-[#DDD6FE]' },
  'VOLLEYBALL': { color: 'text-[#6D28D9]', bg: 'bg-[#F3E8FF] border border-[#DDD6FE]' },
  'GOLF': { color: 'text-[#15803D]', bg: 'bg-[#DCFCE7] border border-[#86EFAC]' },
  'BƠI LỘI': { color: 'text-[#0284C7]', bg: 'bg-[#E0F2FE] border border-[#BAE6FD]' },
};

const FACILITY_ICONS: Record<string, React.ReactNode> = {
  'Đã Kiểm Định': <Shield className="w-3 h-3 text-[#006241]" />,
  'Đèn Ban Đêm': <Lightbulb className="w-3 h-3 text-[#006241]" />,
  'Quay Video AI': <Wifi className="w-3 h-3 text-[#006241]" />,
  'Bãi Đỗ Xe': <Car className="w-3 h-3 text-[#006241]" />,
};

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onSelect }) => {
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);

  const allSports =
    vendor.sportTypes && vendor.sportTypes.length > 0
      ? vendor.sportTypes
      : [vendor.sportType || 'THỂ THAO'];

  const displayedSports = allSports.slice(0, 2);
  const remainingCount = allSports.length - displayedSports.length;

  const fallbackImg =
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80';

  return (
    <article
      className="group relative bg-[#FBF8F0] rounded-[28px] overflow-hidden border border-[#E6E2D8] hover:border-[#1E3932]/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between"
      onClick={() => onSelect(vendor)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(vendor)}
      role="button"
      aria-label={`Xem chi tiết ${vendor.name}`}
    >
            <div>
        <div className="relative aspect-[16/10] bg-[#F2F0EB]">
          {/* Zoomable Image & Gradient Container */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={imgError ? fallbackImg : (vendor.avatar || vendor.imageUrl || fallbackImg)}
              alt={vendor.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932]/70 via-transparent to-transparent opacity-80" />
          </div>

          {/* Top Badges & Heart Action */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between z-10 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pr-1">
              {displayedSports.map((sp) => {
                const style = SPORT_STYLE_MAP[sp.toUpperCase()] || {
                  color: 'text-[#1E3932]',
                  bg: 'bg-[#F2F0EB] border border-[#E6E2D8]',
                };
                return (
                  <span
                    key={sp}
                    className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${style.bg} ${style.color} shadow-sm backdrop-blur-md whitespace-nowrap`}
                  >
                    {sp}
                  </span>
                );
              })}

              {remainingCount > 0 && (
                <div
                  className="relative group/more-sports inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#1E3932]/90 hover:bg-[#1E3932] text-white border border-white/20 shadow-sm backdrop-blur-md cursor-pointer transition-colors">
                    +{remainingCount}
                  </span>

                  {/* Tooltip Popup strictly shown when hovering the badge, positioned right-0 to fit inside card */}
                  <div className="absolute right-0 left-auto top-full mt-2 hidden group-hover/more-sports:block z-30 w-44 bg-[#1E3932]/95 backdrop-blur-md text-white text-xs rounded-2xl p-3 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5 pb-1 border-b border-white/10">
                      Tất cả môn ({allSports.length}):
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {allSports.map((sName) => (
                        <div key={sName} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
                          <span className="text-emerald-400">✦</span>
                          <span className="truncate">{sName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLiked(!liked);
              }}
              className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer border border-white/20 shrink-0 z-20 ${
                liked
                  ? 'bg-[#DC2626] text-white border-transparent'
                  : 'bg-[#FBF8F0]/90 text-[#1E3932] hover:bg-white'
              }`}
              aria-label={liked ? 'Bỏ yêu thích' : 'Yêu thích'}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </button>
          </div>

                    <div className="absolute bottom-4 left-4">
            <div className="px-3.5 py-1.5 bg-[#1E3932]/95 backdrop-blur-md rounded-full text-white flex items-center gap-1.5 border border-white/10 shadow-lg">
              <span className="text-[10px] text-[#6F7E72] uppercase font-bold tracking-wider">Từ</span>
              <span className="text-xs font-black text-[#FBF8F0]">
                {vendor.priceRange.split(' - ')[0]}
              </span>
            </div>
          </div>
        </div>

                <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black text-[#1E3932]">
                {vendor.rating > 0 ? vendor.rating.toFixed(1) : (vendor.totalReviews === 0 ? '0.0' : '5.0')}
              </span>
              <span className="text-[11px] text-[#6F7E72] font-semibold">
                ({vendor.totalReviews !== undefined && vendor.totalReviews > 0 ? vendor.totalReviews : (vendor.totalReviews === 0 ? '0' : 'Mới')})
              </span>
            </div>
            {vendor.badgeTag && vendor.badgeTag !== 'Đã xác thực' && (
              <span className="text-[11px] font-bold text-[#006241] bg-[#006241]/10 px-3 py-1 rounded-full border border-[#006241]/20 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#006241]" />
                {vendor.badgeTag.replace(/Cách 0(\.0+)? km/gi, 'Cách dưới 1 km')}
              </span>
            )}
          </div>

                    <h3 className="font-extrabold text-[#1E3932] text-lg leading-snug line-clamp-1 group-hover:text-[#006241] transition-colors">
            {vendor.name}
          </h3>

                    <div className="flex items-start gap-1.5 text-[#6F7E72]">
            <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0 mt-0.5" />
            <span className="text-xs font-medium line-clamp-2 leading-relaxed">{vendor.address}</span>
          </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
            {vendor.facilities.slice(0, 3).map((fac) => (
              <span
                key={fac}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E3932] bg-[#F2F0EB] px-3 py-1 rounded-full border border-[#E6E2D8]"
              >
                {FACILITY_ICONS[fac] || null}
                {fac}
              </span>
            ))}
          </div>
        </div>
      </div>

            <div className="p-6 pt-0">
        <button
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(vendor);
          }}
        >
          <span>Xem Chi Tiết Sân</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </article>
  );
};
