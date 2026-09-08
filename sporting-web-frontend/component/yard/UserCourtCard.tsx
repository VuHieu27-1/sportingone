import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Tag, Clock, ArrowUpRight, Star } from 'lucide-react';
import { UserCourtItem } from '../../types/vendor';
import { getSportImageUrl } from '../../utils/sportImageUtils';

export interface UserCourtCardProps {
  court: UserCourtItem;
  onSelectCourt?: (court: UserCourtItem) => void;
}

export const UserCourtCard: React.FC<UserCourtCardProps> = ({
  court,
  onSelectCourt,
}) => {
  const navigate = useNavigate();
  const vendor = court.vendor;
  const rawDist = court.distanceKm ?? vendor?.distanceKm;
  const hasDistance = rawDist !== undefined && rawDist !== null && !isNaN(Number(rawDist));
  const distNum = hasDistance ? Number(rawDist) : null;

  const courtRating = Number(court.rating ?? court.averageRating ?? court.ratingStats?.averageRating ?? 0);
  const totalReviewsCount = Number(court.totalReviews ?? court.ratingStats?.totalReviews ?? 0);

  const handleCardClick = () => {
    if (onSelectCourt) {
      onSelectCourt(court);
    } else {
      navigate(`/yard/${court.id}`);
    }
  };

  const handleReviewsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/yard/${court.id}?tab=reviews`);
  };

  const handleVendorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vendor?.id) {
      navigate(`/vendor/${vendor.id}`);
    }
  };

  const formatDistance = (dist: number) => {
    if (dist < 1) {
      return `Cách ${(dist * 1000).toFixed(0)} m`;
    }
    return `Cách ${dist.toFixed(2)} km`;
  };

  const sportName = court.sportType?.sportName || court.sportType?.typeName || 'Thể thao';
  const imageUrl =
    court.images && court.images.length > 0 && court.images[0].imageUrl
      ? court.images[0].imageUrl
      : getSportImageUrl(sportName);

  const priceNum = Number(court.price);
  const formattedPrice = !isNaN(priceNum) && priceNum > 0
    ? `${priceNum.toLocaleString('vi-VN')}đ`
    : 'Chưa có thông tin giá';

  const peakPriceNum = court.peakHourPrice ? Number(court.peakHourPrice) : null;
  const formattedPeakPrice = peakPriceNum && !isNaN(peakPriceNum) && peakPriceNum > 0
    ? `${peakPriceNum.toLocaleString('vi-VN')}đ`
    : null;

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col rounded-[24px] bg-white border border-[#E6E2D8] hover:border-[#006241]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Top Banner Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-[#1E3932]/5">
        <img
          src={imageUrl}
          alt={court.yardName}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Sport Category Badge */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3932]/80 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm border border-white/10">
          <Tag className="w-3.5 h-3.5 text-[#A3E635]" />
          <span>{sportName}</span>
        </div>

        {/* Vendor Distance Badge */}
        {distNum !== null ? (
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241] text-white text-[11px] font-extrabold tracking-wide shadow-md border border-white/20 animate-pulse">
            <Navigation className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>{formatDistance(distNum)}</span>
          </div>
        ) : (
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/80 text-[11px] font-medium">
            <MapPin className="w-3.5 h-3.5" />
            <span>Vendor Vị trí</span>
          </div>
        )}

        {/* Court Name Overlay on Image Bottom */}
        <div className="absolute bottom-3 left-3.5 right-3.5">
          <h3 className="text-lg font-extrabold text-white tracking-tight drop-shadow-md line-clamp-1">
            {court.yardName}
          </h3>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        {/* Vendor Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {vendor ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-block font-bold text-[11px] bg-[#006241]/10 text-[#006241] px-2 py-0.5 rounded-md shrink-0">
                  Vendor
                </span>
                <button
                  type="button"
                  onClick={handleVendorClick}
                  className="font-extrabold text-sm line-clamp-1 text-left hover:text-[#006241] hover:underline cursor-pointer truncate"
                  title={`Xem cụm sân ${vendor.vendorName}`}
                >
                  {vendor.vendorName}
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Clickable Rating Badge */}
            <button
              type="button"
              onClick={handleReviewsClick}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer group/star hover:scale-105"
              title="Bấm để xem tất cả đánh giá của sân"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 group-hover/star:scale-110 transition-transform" />
              <span className="font-extrabold text-xs">
                {courtRating > 0 ? courtRating.toFixed(1) : '5.0'}
              </span>
              <span className="text-[10px] text-amber-700/80 font-semibold font-mono">
                ({totalReviewsCount > 0 ? totalReviewsCount : 'Mới'})
              </span>
            </button>
          </div>

          {vendor?.vendorAddress && (
            <div className="flex items-start gap-1.5 text-[#6F7E72] text-xs">
              <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0 mt-0.5" />
              <span className="line-clamp-2">{vendor.vendorAddress}</span>
            </div>
          )}

          {(vendor?.openTime || vendor?.closeTime) && (
            <div className="flex items-center gap-1.5 text-[#6F7E72] text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span>
                Giờ mở cửa: {vendor.openTime || '06:00'} - {vendor.closeTime || '22:00'}
              </span>
            </div>
          )}
        </div>

        {/* Pricing & Booking Action */}
        <div className="pt-3 border-t border-[#E6E2D8]/80 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#6F7E72]">
              Giá thuê sân
            </span>
            <div className="flex items-baseline gap-1 truncate mt-0.5">
              {!isNaN(priceNum) && priceNum > 0 ? (
                <>
                  <span className="text-base font-black text-[#006241] font-mono">
                    {priceNum.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-[11px] text-[#6F7E72] font-semibold shrink-0">/ giờ</span>
                </>
              ) : (
                <span className="text-xs font-extrabold text-[#6F7E72] truncate">
                  Chưa có thông tin giá
                </span>
              )}
            </div>
            {formattedPeakPrice && (
              <span className="block text-[10px] text-[#D97706] font-bold truncate mt-0.5">
                Giờ cao điểm: {formattedPeakPrice}/giờ
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap shrink-0 border border-[#006241]"
          >
            <span>Chi tiết</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
