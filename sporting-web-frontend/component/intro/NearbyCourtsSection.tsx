import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, RefreshCw, ArrowUpRight, Clock, Sparkles, Navigation, ChevronRight, Edit3, Star } from 'lucide-react';
import { vendorService, UserCourtItem, getSportImageUrl } from '../../services/vendorService';
import { geolocationService } from '../../services/geolocationService';
import { addressService } from '../../services/addressService';
import { EditLocationModal } from '../common/EditLocationModal';

interface NearbyCourtsSectionProps {
  onSelectCourt?: (params: { sport?: string; location?: string; vendorId?: number | string }) => void;
}

export const NearbyCourtsSection: React.FC<NearbyCourtsSectionProps> = ({ onSelectCourt }) => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<UserCourtItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingGps, setIsRefreshingGps] = useState<boolean>(false);
  const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState<boolean>(false);
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [currentAddress, setCurrentAddress] = useState<string>('');

  const sportsFilterOptions = [
    { id: 'ALL', label: 'Tất Cả' },
    { id: 'Bóng đá', label: 'Bóng Đá' },
    { id: 'Cầu lông', label: 'Cầu Lông' },
    { id: 'Pickleball', label: 'Pickleball' },
    { id: 'Tennis', label: 'Tennis' },
    { id: 'Bóng rổ', label: 'Bóng Rổ' },
    { id: 'Bóng chuyền', label: 'Bóng Chuyền' },
  ];

  /**
   * Retrieves address from localStorage or initiates device GPS
   */
  const loadAddressAndCourts = useCallback(async (forceGpsRefresh = false, overrideAddress?: string, overrideLat?: number, overrideLng?: number) => {
    if (forceGpsRefresh) {
      setIsRefreshingGps(true);
    } else {
      setIsLoading(true);
    }

    try {
      let savedAddr = overrideAddress || (typeof window !== 'undefined'
        ? localStorage.getItem('sporting_gps_full_address') || localStorage.getItem('sporting_user_selected_location')
        : null);

      let lat: number | undefined = overrideLat;
      let lng: number | undefined = overrideLng;

      // If lat/lng not provided, check localStorage
      if (lat === undefined || lng === undefined) {
        const savedLat = typeof window !== 'undefined' ? localStorage.getItem('sporting_user_lat') : null;
        const savedLng = typeof window !== 'undefined' ? localStorage.getItem('sporting_user_lng') : null;
        if (savedLat && savedLng && !isNaN(Number(savedLat)) && !isNaN(Number(savedLng))) {
          lat = Number(savedLat);
          lng = Number(savedLng);
        }
      }

      if (forceGpsRefresh) {
        try {
          const gpsData = await geolocationService.getDeviceLocation(undefined, undefined, true);
          if (gpsData && !isNaN(gpsData.lat) && !isNaN(gpsData.lng)) {
            lat = gpsData.lat;
            lng = gpsData.lng;
            savedAddr = gpsData.fullAddress || gpsData.city || 'Khu vực hiện tại của bạn';
            if (gpsData.fullAddress) {
              localStorage.setItem('sporting_gps_full_address', gpsData.fullAddress.trim());
            }
            if (gpsData.city) {
              localStorage.setItem('sporting_user_selected_location', gpsData.city.trim());
            }
            localStorage.setItem('sporting_user_lat', String(lat));
            localStorage.setItem('sporting_user_lng', String(lng));
          }
        } catch (e) {
          console.warn('[NearbyCourtsSection] Device GPS lookup notice:', e);
        }
      } else if (lat === undefined || lng === undefined) {
        if (savedAddr) {
          try {
            const geoRes = await addressService.geocode(savedAddr);
            if (geoRes && !isNaN(geoRes.lat) && !isNaN(geoRes.lng)) {
              lat = geoRes.lat;
              lng = geoRes.lng;
              localStorage.setItem('sporting_user_lat', String(lat));
              localStorage.setItem('sporting_user_lng', String(lng));
            }
          } catch {}
        } else {
          try {
            const gpsData = await geolocationService.getDeviceLocation();
            if (gpsData && !isNaN(gpsData.lat) && !isNaN(gpsData.lng)) {
              lat = gpsData.lat;
              lng = gpsData.lng;
              savedAddr = gpsData.fullAddress || gpsData.city || 'Khu vực hiện tại của bạn';
              if (gpsData.fullAddress) {
                localStorage.setItem('sporting_gps_full_address', gpsData.fullAddress.trim());
              }
              if (gpsData.city) {
                localStorage.setItem('sporting_user_selected_location', gpsData.city.trim());
              }
              localStorage.setItem('sporting_user_lat', String(lat));
              localStorage.setItem('sporting_user_lng', String(lng));
            }
          } catch (e) {
            console.warn('[NearbyCourtsSection] Device GPS lookup notice:', e);
          }
        }
      }

      setCurrentAddress(savedAddr || 'Thành phố Đà Nẵng');

      // Fetch active courts sorted by distance with the accurate lat and lng
      const res = await vendorService.getCourtsSortedByVendorDistance(lat, lng);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Backend already filters active vendors
        const validCourts = res.data.filter(
          (c) => !c.vendor || c.vendor.status === 'active'
        );
        setCourts(validCourts);
      } else {
        // Fallback: Fetch active vendors to ensure we display available courts
        const vendorsRes = await vendorService.getVendors('active');
        if (vendorsRes.success && Array.isArray(vendorsRes.data)) {
          const fallbackCourts: UserCourtItem[] = [];
          vendorsRes.data.forEach((v) => {
            const rawYards = v.rawVendor?.yards || [];
            rawYards.forEach((y: any) => {
              fallbackCourts.push({
                id: Number(y.id),
                yardName: y.yardName || `${v.name} - Sân ${y.id}`,
                price: y.price || 100000,
                status: 'active',
                sportType: y.sportType || { id: 1, sportName: v.sportType || 'Bóng đá' },
                vendor: {
                  id: Number(v.id),
                  vendorName: v.name,
                  avatar: v.avatar,
                  vendorAddress: v.address,
                  vendorPhone: v.phone,
                  openTime: v.openTime,
                  closeTime: v.closeTime,
                  status: 'active',
                  distanceKm: v.rawVendor?.distanceKm,
                },
                distanceKm: v.rawVendor?.distanceKm,
              });
            });
          });
          setCourts(fallbackCourts);
        }
      }
    } catch (err) {
      console.warn('[NearbyCourtsSection] Lỗi khi nạp danh sách sân gần bạn:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshingGps(false);
    }
  }, []);

  useEffect(() => {
    loadAddressAndCourts();
  }, [loadAddressAndCourts]);

  const handleLocationSaved = useCallback((newAddress: string, lat?: number, lng?: number) => {
    setCurrentAddress(newAddress);
    loadAddressAndCourts(false, newAddress, lat, lng);
  }, [loadAddressAndCourts]);

  // Filter courts by sport
  const filteredCourts = courts.filter((court) => {
    if (selectedSport === 'ALL') return true;
    const sName = (
      court.sportType?.sportName ||
      court.sportType?.typeName ||
      court.sportType?.name ||
      ''
    ).toLowerCase().trim();
    const targetName = selectedSport.toLowerCase().trim();
    return sName.includes(targetName) || targetName.includes(sName);
  });

  // Limit display to top 6 prominent courts
  const displayedCourts = filteredCourts.slice(0, 6);

  const handleBookingClick = (court: UserCourtItem) => {
    navigate(`/yard/${court.id}`);
  };

  return (
    <section id="nearby-courts" className="py-24 bg-[#FBF8F0] text-[#1E3932] border-y border-[#6F7E72]/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Title & Subtitle */}
        <div className="text-center max-w-5xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold tracking-widest text-[#006241] uppercase">
            [ GỢI Ý ĐỊA ĐIỂM GẦN BẠN ]
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold text-[#1E3932] tracking-tight leading-tight whitespace-normal sm:whitespace-nowrap">
            Sân Thể Thao Nổi Bật Gần Vị Trí Của Bạn
          </h2>
          <p className="text-sm sm:text-base text-[#6F7E72] font-medium leading-relaxed max-w-3xl mx-auto">
            Hệ thống tự động đề xuất những cụm sân chất lượng cao, có lịch trống và gần bạn nhất để bạn có thể đặt sân chỉ trong 30 giây.
          </p>

          {/* Current Address Pill & Location Edit Button */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <div
              onClick={() => setIsEditLocationModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:border-[#006241] border border-[#6F7E72]/20 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-[#1E3932] shadow-sm max-w-full cursor-pointer transition-colors group"
              title="Bấm để chỉnh sửa vị trí"
            >
              <MapPin className="w-4 h-4 text-[#006241] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[260px] sm:max-w-md" title={currentAddress}>
                {currentAddress || 'Đang xác định vị trí...'}
              </span>
            </div>

            <button
              onClick={() => setIsEditLocationModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-[#006241] bg-white border border-[#006241]/30 hover:border-[#006241] hover:bg-[#006241] hover:text-[#FBF8F0] transition-all duration-200 shadow-sm cursor-pointer"
              title="Chỉnh sửa vị trí của bạn"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa vị trí</span>
            </button>
          </div>
        </div>

        {/* Sport Category Filter Full-Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {sportsFilterOptions.map((opt) => {
            const isSelected = selectedSport === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedSport(opt.id)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#006241] text-[#FBF8F0] shadow-md scale-105'
                    : 'bg-white text-[#1E3932] border border-[#6F7E72]/20 hover:border-[#006241] hover:text-[#006241]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-[28px] border border-[#6F7E72]/15 p-5 space-y-4 animate-pulse shadow-sm"
              >
                <div className="aspect-[16/10] bg-[#6F7E72]/10 rounded-2xl w-full" />
                <div className="h-5 bg-[#6F7E72]/10 rounded-md w-3/4" />
                <div className="h-4 bg-[#6F7E72]/10 rounded-md w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-[#6F7E72]/10 rounded-md w-1/3" />
                  <div className="h-9 bg-[#6F7E72]/10 rounded-full w-28" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Courts Grid */}
        {!isLoading && displayedCourts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedCourts.map((court) => {
              const sportName = court.sportType?.sportName || court.sportType?.typeName || 'Thể thao';
              const vendor = court.vendor;
              // Exclusively use yard's own image or high quality sport image (do not use vendor's avatar)
              const yardImage =
                (court.images && court.images.length > 0 && (court.images[0].imageUrl || court.images[0].imagePath)) ||
                getSportImageUrl(sportName);

              const formattedPrice = Number(court.price).toLocaleString('vi-VN');
              const rawDistance = court.distanceKm ?? vendor?.distanceKm;
              const hasDistance = rawDistance !== undefined && rawDistance !== null && !isNaN(Number(rawDistance));
              const distNum = hasDistance ? Number(rawDistance) : null;
              const distanceText =
                distNum !== null
                  ? distNum < 1
                    ? `Cách ${(distNum * 1000).toFixed(0)} m`
                    : `Cách ${distNum.toFixed(2)} km`
                  : 'Gần bạn';

              const courtRating = Number(court.rating ?? court.averageRating ?? court.ratingStats?.averageRating ?? 0);
              const totalReviewsCount = Number(court.totalReviews ?? court.ratingStats?.totalReviews ?? 0);

              return (
                <div
                  key={court.id}
                  onClick={() => handleBookingClick(court)}
                  className="bg-white rounded-[28px] border border-[#6F7E72]/20 hover:border-[#006241] transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden group cursor-pointer"
                >
                  <div>
                    {/* Image Header with Badges */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#F2F0EB]">
                      <img
                        src={yardImage}
                        alt={court.yardName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                      {/* Distance Badge */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#1E3932]/90 text-[#FBF8F0] backdrop-blur-md shadow-sm">
                          <Navigation className="w-3 h-3 text-[#3FB950]" />
                          {distanceText}
                        </span>
                      </div>

                      {/* Sport Badge */}
                      <div className="absolute top-3.5 right-3.5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#006241] text-[#FBF8F0] shadow-sm">
                          {sportName}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-lg text-[#1E3932] group-hover:text-[#006241] transition-colors leading-snug line-clamp-1">
                            {court.yardName}
                          </h3>
                          <p className="text-xs font-medium text-[#6F7E72] line-clamp-1 mt-0.5">
                            Cụm sân: {vendor?.vendorName || 'Đang cập nhật'}
                          </p>
                        </div>

                        {/* Star Rating Badge in content */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/yard/${court.id}?tab=reviews`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer group/star hover:scale-105"
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

                      {/* Address snippet */}
                      <div className="flex items-start gap-1.5 text-xs text-[#6F7E72] leading-relaxed">
                        <MapPin className="w-3.5 h-3.5 text-[#006241] flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          {vendor?.vendorAddress || 'Chưa cập nhật địa chỉ chi tiết'}
                        </span>
                      </div>

                      {/* Operating hours & Quick tags */}
                      <div className="flex items-center gap-3 text-xs text-[#6F7E72] pt-1 border-t border-[#6F7E72]/15">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#006241]" />
                          {vendor?.openTime || '06:00'} - {vendor?.closeTime || '23:00'}
                        </span>
                        <span className="text-[#6F7E72]/40">•</span>
                        <span className="flex items-center gap-1 font-medium text-[#006241]">
                          <Sparkles className="w-3.5 h-3.5" />
                          Đặt tức thì 30s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA & Pricing */}
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 flex items-center justify-between border-t border-[#6F7E72]/10">
                    <div>
                      <span className="text-[11px] font-semibold text-[#6F7E72] block">Giá thuê</span>
                      <div className="text-base sm:text-lg font-extrabold text-[#1E3932]">
                        {formattedPrice}đ{' '}
                        <span className="text-xs font-normal text-[#6F7E72]">/ giờ</span>
                      </div>
                    </div>

                    {/* Single Tertiary Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/yard/${court.id}`);
                      }}
                      className="px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#006241] text-[#FBF8F0] hover:bg-[#1E3932] transition-colors duration-200 flex items-center gap-1.5 shadow-sm group/btn cursor-pointer"
                    >
                      <span>Chi tiết</span>
                      <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedCourts.length === 0 && (
          <div className="text-center py-12 px-4 bg-[#FBF8F0] rounded-[28px] border border-[#6F7E72]/20 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#006241]/10 text-[#006241] flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-[#1E3932]">
                Chưa tìm thấy sân môn {selectedSport !== 'ALL' ? selectedSport : ''} gần vị trí này
              </h3>
              <p className="text-xs sm:text-sm text-[#6F7E72]">
                Bạn có thể chọn môn thể thao khác hoặc xem toàn bộ danh mục sân có sẵn trên toàn hệ thống.
              </p>
            </div>
            <button
              onClick={() => onSelectCourt && onSelectCourt({ location: currentAddress })}
              className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#006241] text-[#FBF8F0] hover:bg-[#1E3932] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Xem Tất Cả Sân</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View All Bottom Bar */}
        {!isLoading && displayedCourts.length > 0 && (
          <div className="text-center pt-4">
            <button
              onClick={() => onSelectCourt && onSelectCourt({ sport: selectedSport !== 'ALL' ? selectedSport : undefined, location: currentAddress })}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-xs sm:text-sm bg-white border-2 border-[#006241] text-[#006241] hover:bg-[#006241] hover:text-[#FBF8F0] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>Khám Phá Toàn Bộ Sân & Lịch Trống</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Location Modal */}
      <EditLocationModal
        isOpen={isEditLocationModalOpen}
        onClose={() => setIsEditLocationModalOpen(false)}
        currentAddress={currentAddress}
        onLocationSaved={handleLocationSaved}
      />
    </section>
  );
};
