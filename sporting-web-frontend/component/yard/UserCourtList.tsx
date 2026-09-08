import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigation, Compass, AlertCircle, RefreshCw, Layers, Loader2 } from 'lucide-react';
import { vendorService, UserCourtItem, VendorDisplayItem } from '../../services/vendorService';
import { geolocationService } from '../../services/geolocationService';
import { tokenManager } from '../../utils/tokenManager';
import { UserCourtCard } from './UserCourtCard';

export interface UserCourtListProps {
  selectedSport?: string;
  selectedSports?: string[];
  searchKeyword?: string;
  nearbyVendors?: VendorDisplayItem[] | null;
  userCoords?: { lat?: number; lng?: number } | null;
  maxDistanceKm?: number | null;
  selectedRatings?: number[];
  onSelectCourt?: (court: UserCourtItem) => void;
  onCourtCountChange?: (count: number) => void;
}

const INITIAL_BATCH_SIZE = 12;
const MORE_BATCH_SIZE = 8;

export const UserCourtList: React.FC<UserCourtListProps> = ({
  selectedSport,
  selectedSports,
  searchKeyword = '',
  nearbyVendors,
  userCoords,
  maxDistanceKm,
  selectedRatings = [],
  onSelectCourt,
  onCourtCountChange,
}) => {
  const [courts, setCourts] = useState<UserCourtItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'success' | 'fallback'>('pending');

  // Lazy loading batch pagination state
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchCourtsWithDistance = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setGpsStatus('pending');

    let currentLat = userCoords?.lat;
    let currentLng = userCoords?.lng;

    if (currentLat !== undefined && currentLng !== undefined && !isNaN(currentLat) && !isNaN(currentLng)) {
      setUserLocation({ lat: currentLat, lng: currentLng });
      try {
        const res = await vendorService.getCourtsSortedByVendorDistance(currentLat, currentLng);
        if (res.success && Array.isArray(res.data)) {
          setCourts(res.data);
          setGpsStatus('success');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[UserCourtList] Distance fetch with custom coords error:', err);
      }
    }

    const token = tokenManager.getActiveToken();

    if (token) {
      try {
        const res = await vendorService.getCourtsSortedByVendorDistance();
        if (res.success && Array.isArray(res.data)) {
          setCourts(res.data);
          setGpsStatus('success');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[UserCourtList] Logged in distance fetch fallback:', err);
      }
    }

    // Guest user or custom coordinates
    if (!currentLat || !currentLng) {
      const savedLat = typeof window !== 'undefined' ? localStorage.getItem('sporting_user_lat') : null;
      const savedLng = typeof window !== 'undefined' ? localStorage.getItem('sporting_user_lng') : null;
      if (savedLat && savedLng && !isNaN(Number(savedLat)) && !isNaN(Number(savedLng))) {
        currentLat = Number(savedLat);
        currentLng = Number(savedLng);
        setUserLocation({ lat: currentLat, lng: currentLng });
        setGpsStatus('success');
      }
    }

    // Hardware GPS request if no location available
    if (!currentLat || !currentLng) {
      try {
        const loc = await geolocationService.getDeviceLocation();
        if (loc && !isNaN(loc.lat) && !isNaN(loc.lng)) {
          currentLat = loc.lat;
          currentLng = loc.lng;
          setUserLocation({ lat: loc.lat, lng: loc.lng });
          setGpsStatus('success');
        } else {
          setGpsStatus('fallback');
        }
      } catch {
        setGpsStatus('fallback');
      }
    }

    try {
      const res = await vendorService.getCourtsSortedByVendorDistance(currentLat, currentLng);
      if (res.success && Array.isArray(res.data)) {
        setCourts(res.data);
      } else {
        setErrorMessage(res.message || 'Không thể tải danh sách sân từ máy chủ.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ Backend.');
    } finally {
      setIsLoading(false);
    }
  }, [userCoords?.lat, userCoords?.lng]);

  useEffect(() => {
    fetchCourtsWithDistance();
  }, [fetchCourtsWithDistance]);

  const activeSports = (selectedSports && selectedSports.length > 0)
    ? selectedSports
    : (selectedSport ? [selectedSport] : ['ALL']);

  const filteredCourts = courts.filter((court) => {
    // 1. Filter by nearby vendors / distance if active
    if (Array.isArray(nearbyVendors)) {
      const vendorId = court.vendor?.id;
      const isVendorMatched = nearbyVendors.some(
        (v) => String(v.id) === String(vendorId)
      );
      if (!isVendorMatched) {
        return false;
      }
    } else if (maxDistanceKm !== null && maxDistanceKm !== undefined) {
      const rawDist = court.distanceKm ?? court.vendor?.distanceKm;
      if (rawDist !== null && rawDist !== undefined && !isNaN(Number(rawDist))) {
        if (Number(rawDist) > maxDistanceKm) {
          return false;
        }
      }
    }

    // 2. Filter by sports
    if (!activeSports.includes('ALL') && activeSports.length > 0) {
      const courtSportName = (
        court.sportType?.sportName ||
        court.sportType?.typeName ||
        court.sportType?.name ||
        ''
      ).toLowerCase().trim();

      const hasMatch = activeSports.some((tSport) => {
        const target = tSport.toLowerCase().trim();
        if (!target) return false;
        return (
          courtSportName.includes(target) ||
          target.includes(courtSportName) ||
          courtSportName === target
        );
      });

      if (!hasMatch) return false;
    }

    // 3. Filter by keyword
    if (searchKeyword && searchKeyword.trim() !== '') {
      const kw = searchKeyword.toLowerCase().trim();
      const matchCourtName = court.yardName.toLowerCase().includes(kw);
      const matchVendorName = court.vendor?.vendorName?.toLowerCase().includes(kw) || false;
      const matchAddress = court.vendor?.vendorAddress?.toLowerCase().includes(kw) || false;

      if (!matchCourtName && !matchVendorName && !matchAddress) {
        return false;
      }
    }

    // 4. Filter by rating (multi-select)
    if (selectedRatings && selectedRatings.length > 0) {
      const courtRating = Number(
        court.rating ??
        court.averageRating ??
        court.ratingStats?.averageRating ??
        court.vendor?.rating ??
        court.vendor?.averageRating ??
        0
      );
      const isMatched = selectedRatings.some((star) => {
        if (star === 5) return courtRating >= 4.5;
        if (star === 4) return courtRating >= 3.5 && courtRating < 4.5;
        if (star === 3) return courtRating >= 2.5 && courtRating < 3.5;
        if (star === 2) return courtRating >= 1.5 && courtRating < 2.5;
        if (star === 1) return courtRating >= 0.5 && courtRating < 1.5;
        return false;
      });
      if (!isMatched) {
        return false;
      }
    }

    return true;
  });

  // Notify parent of filtered court count
  useEffect(() => {
    onCourtCountChange?.(filteredCourts.length);
  }, [filteredCourts.length, onCourtCountChange]);

  // Reset lazy batch count whenever filters or dataset change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [selectedSport, selectedSports, searchKeyword, nearbyVendors, maxDistanceKm, selectedRatings, courts]);

  // Infinite scroll observer: automatically load more courts when scrolling near bottom
  useEffect(() => {
    if (visibleCount >= filteredCourts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + MORE_BATCH_SIZE, filteredCourts.length));
        }
      },
      { rootMargin: '350px' }
    );

    const targetNode = observerRef.current;
    if (targetNode) {
      observer.observe(targetNode);
    }

    return () => {
      if (targetNode) {
        observer.unobserve(targetNode);
      }
    };
  }, [visibleCount, filteredCourts.length]);

  const visibleCourts = filteredCourts.slice(0, visibleCount);
  const remainingCount = filteredCourts.length - visibleCount;

  return (
    <div className="w-full space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Location GPS Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            Array.isArray(nearbyVendors) || gpsStatus === 'success' ? 'bg-[#006241]/10 text-[#006241]' : 'bg-[#D97706]/10 text-[#D97706]'
          }`}>
            {Array.isArray(nearbyVendors) || gpsStatus === 'success' ? (
              <Navigation className="w-5 h-5 animate-pulse" />
            ) : (
              <Compass className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#1E3932] text-sm">
                {Array.isArray(nearbyVendors)
                  ? 'Đang lọc sân theo khoảng cách vị trí đã chọn'
                  : gpsStatus === 'success'
                  ? 'Đã tối ưu theo vị trí GPS của bạn'
                  : 'Sắp xếp theo thứ tự mặc định'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#006241]/10 text-[#006241]">
                {Array.isArray(nearbyVendors) ? 'BỘ LỌC KHOẢNG CÁCH' : 'Vendor Distance ASC'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCourtsWithDistance}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-bold transition-all cursor-pointer border border-[#E6E2D8] shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Cập nhật vị trí</span>
        </button>
      </div>

      {/* Courts Count Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#006241]" />
          <h3 className="text-xl font-extrabold text-[#1E3932] tracking-tight">
            Danh Sách Sân Thể Thao ({filteredCourts.length})
          </h3>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-80 rounded-[24px] bg-white border border-[#E6E2D8] animate-pulse p-4 space-y-4 shadow-sm"
            >
              <div className="h-40 bg-[#F2F0EB] rounded-xl w-full" />
              <div className="h-4 bg-[#F2F0EB] rounded w-3/4" />
              <div className="h-4 bg-[#F2F0EB] rounded w-1/2" />
              <div className="h-10 bg-[#F2F0EB] rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center p-10 rounded-[24px] bg-white border border-red-200 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h4 className="text-base font-bold text-[#1E3932]">{errorMessage}</h4>
          <button
            type="button"
            onClick={fetchCourtsWithDistance}
            className="px-5 py-2.5 rounded-xl bg-[#006241] text-white font-bold text-xs hover:bg-[#1E3932] transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && filteredCourts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 rounded-[24px] bg-white border border-[#E6E2D8] text-center space-y-3 shadow-sm">
          <Layers className="w-12 h-12 text-[#6F7E72]" />
          <h4 className="text-lg font-extrabold text-[#1E3932]">Không tìm thấy sân thể thao phù hợp</h4>
          <p className="text-[#6F7E72] text-xs max-w-md font-medium">
            {Array.isArray(nearbyVendors)
              ? 'Không có sân nào trong bán kính khoảng cách hoặc bộ môn đã chọn. Vui lòng thử mở rộng bán kính tìm kiếm.'
              : 'Hiện không có sân nào thỏa mãn từ khóa hoặc bộ lọc thể thao đã chọn. Vui lòng thử tìm kiếm với từ khóa khác.'}
          </p>
        </div>
      )}

      {/* Court Grid - Lazy Rendered Chunks */}
      {!isLoading && !errorMessage && filteredCourts.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCourts.map((court) => (
              <UserCourtCard
                key={court.id}
                court={court}
                onSelectCourt={onSelectCourt}
              />
            ))}
          </div>

          {/* Lazy Load Sentinel & Infinite Scroll Loader */}
          {remainingCount > 0 && (
            <div ref={observerRef} className="pt-4 pb-8 flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#006241] bg-[#006241]/10 px-4 py-2 rounded-full border border-[#006241]/20">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tự động tải thêm {Math.min(MORE_BATCH_SIZE, remainingCount)} sân gần nhất... (Còn {remainingCount} sân)</span>
              </div>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + MORE_BATCH_SIZE, filteredCourts.length))}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] text-xs font-extrabold shadow-sm transition-all cursor-pointer hover:border-[#006241]"
              >
                Tải Thêm Ngay ({remainingCount} sân)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
