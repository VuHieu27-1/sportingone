import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Filter, MapPin, X, Loader2, AlertCircle, CheckCircle2, Trophy, Check, Search, ChevronDown, Star } from 'lucide-react';
import { vendorService } from '../../services/vendorService';
import { userProfileService, UserProfileDetails } from '../../services/userProfileService';
import { tokenManager } from '../../utils/tokenManager';
import { UserAddress } from '../../types/user';

export interface SportOption {
  id: string;
  label: string;
  icon: string;
}

export const getSportIcon = (sportName: string): string => {
  const s = sportName.toLowerCase();
  if (s.includes('bóng đá') || s.includes('football') || s.includes('soccer')) return '⚽';
  if (s.includes('cầu lông') || s.includes('badminton')) return '🏸';
  if (s.includes('pickleball')) return '🏓';
  if (s.includes('tennis')) return '🎾';
  if (s.includes('bóng rổ') || s.includes('basketball')) return '🏀';
  if (s.includes('bóng chuyền') || s.includes('volleyball')) return '🏐';
  if (s.includes('golf')) return '⛳';
  if (s.includes('bơi') || s.includes('swimming')) return '🏊';
  if (s.includes('bóng bàn') || s.includes('table tennis')) return '🏓';
  if (s.includes('võ') || s.includes('martial')) return '🥋';
  if (s.includes('gym') || s.includes('fitness')) return '🏋️';
  return '🏆';
};

export const RATING_STAR_OPTIONS = [
  { star: 5, label: '5 Sao (Xuất sắc)', desc: 'Đánh giá từ 4.5 đến 5.0 sao' },
  { star: 4, label: '4 Sao (Rất tốt)', desc: 'Đánh giá từ 3.5 đến dưới 4.5 sao' },
  { star: 3, label: '3 Sao (Tốt)', desc: 'Đánh giá từ 2.5 đến dưới 3.5 sao' },
  { star: 2, label: '2 Sao (Trung bình)', desc: 'Đánh giá từ 1.5 đến dưới 2.5 sao' },
  { star: 1, label: '1 Sao (Cần cải thiện)', desc: 'Đánh giá từ 0.5 đến dưới 1.5 sao' },
];

interface SportsCategoryBarProps {
  selectedSports: string[];
  onToggleSport: (sport: string) => void;
  vendorCount: number;
  isNearbyActive: boolean;
  onNearbyResult: (vendors: any[] | null, options?: { lat?: number; lng?: number; radiusKm?: number }) => void;
  selectedRatings?: number[];
  onToggleRating?: (star: number) => void;
  onClearRatings?: () => void;
  availableSports?: string[];
  searchKeyword?: string;
  onClearSearchKeyword?: () => void;
  onClearAllFilters?: () => void;
  viewMode?: 'vendors' | 'courts';
}

export const SportsCategoryBar: React.FC<SportsCategoryBarProps> = ({
  selectedSports,
  onToggleSport,
  vendorCount,
  isNearbyActive,
  onNearbyResult,
  selectedRatings = [],
  onToggleRating,
  onClearRatings,
  availableSports = [],
  searchKeyword = '',
  onClearSearchKeyword,
  onClearAllFilters,
  viewMode = 'vendors',
}) => {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sport' | 'distance' | 'rating'>('sport');
  const DEFAULT_SEARCH_RADIUS_KM = Number(import.meta.env.VITE_DEFAULT_SEARCH_RADIUS_KM || 3);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);
  const addressDropdownRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfileDetails>({});
  const [selectedAddressId, setSelectedAddressId] = useState<number | string | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | undefined>(undefined);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(undefined);
  const [selectedAddrText, setSelectedAddrText] = useState<string>('');
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);

  const savedUserLocation = typeof window !== 'undefined' ? localStorage.getItem('sporting_user_selected_location') : null;
  const savedGpsAddress = typeof window !== 'undefined' ? localStorage.getItem('sporting_gps_full_address') : null;

  const userAddresses: UserAddress[] = profile.addresses || [];

  const effectiveAddress =
    selectedAddrText ||
    profile.currentAddress ||
    profile.city ||
    (savedUserLocation && savedUserLocation.trim() !== '' ? savedUserLocation : null) ||
    (savedGpsAddress && savedGpsAddress.trim() !== '' ? savedGpsAddress : null) ||
    '';

  const hasLocation = Boolean(
    selectedLat ||
    profile.hasUpdatedLocation ||
    profile.currentAddress ||
    (profile.userLat && profile.userLng) ||
    userAddresses.length > 0 ||
    (savedUserLocation && savedUserLocation.trim() !== '') ||
    (savedGpsAddress && savedGpsAddress.trim() !== '')
  );

  useEffect(() => {
    userProfileService.fetchProfileFromApi().then((res) => {
      if (res.success && res.data) {
        const prof = res.data;
        setProfile(prof);
        const addrs = prof.addresses || [];
        if (addrs.length > 0) {
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(def.id);
          setSelectedLat(def.latitude != null ? Number(def.latitude) : prof.userLat);
          setSelectedLng(def.longitude != null ? Number(def.longitude) : prof.userLng);
          setSelectedAddrText(def.address);
        } else if (prof.address || prof.userLat) {
          setSelectedAddressId('default');
          setSelectedLat(prof.userLat);
          setSelectedLng(prof.userLng);
          setSelectedAddrText(prof.address || '');
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(e.target as Node)) {
        setAddressDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSports: SportOption[] = [
    { id: 'ALL', label: 'Tất cả môn', icon: '🏆' },
    ...availableSports.map((sp) => ({
      id: sp,
      label: sp,
      icon: getSportIcon(sp),
    })),
  ];

  const handleNearbySearch = async () => {
    if (!hasLocation) return;
    setIsLoadingNearby(true);
    setNearbyError('');
    try {
      const lat = selectedLat ?? profile.userLat;
      const lng = selectedLng ?? profile.userLng;
      const res = await vendorService.getNearbyVendors({
        userLat: lat,
        userLng: lng,
        maxDistanceKm: radiusKm,
      });
      if (res.success) {
        onNearbyResult(res.data ?? [], { lat, lng, radiusKm });
        setFilterOpen(false);
      } else {
        setNearbyError(res.message || 'Không thể tìm sân gần vị trí đã chọn.');
      }
    } catch {
      setNearbyError('Lỗi kết nối API Backend.');
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const handleClearNearbyOnly = () => {
    onNearbyResult(null);
    setFilterOpen(false);
    setNearbyError('');
  };

  const isSportActive = !selectedSports.includes('ALL') && selectedSports.length > 0;
  const isSearchActive = Boolean(searchKeyword && searchKeyword.trim() !== '');
  const isRatingActive = Boolean(selectedRatings && selectedRatings.length > 0);
  const totalActiveFilters =
    (isSportActive ? selectedSports.length : 0) +
    (isNearbyActive ? 1 : 0) +
    (isSearchActive ? 1 : 0) +
    (isRatingActive ? selectedRatings.length : 0);

  return (
    <section className="bg-[#FBF8F0] border-b border-[#E6E2D8] sticky top-16 sm:top-20 z-40 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between py-3.5 gap-4 overflow-visible">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#006241] animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#1E3932] tracking-wider uppercase">
              {viewMode === 'courts' ? 'DANH SÁCH SÂN THỂ THAO' : 'DANH SÁCH THƯƠNG HIỆU SÂN THỂ THAO'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto max-w-full scrollbar-none py-1">
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#6F7E72] bg-[#F2F0EB] px-3.5 py-1.5 rounded-full border border-[#E6E2D8] shrink-0">
                <Zap className="w-3.5 h-3.5 text-[#006241]" />
                <span>
                  <span className="font-black text-[#1E3932]">{vendorCount}</span>{' '}
                  {viewMode === 'courts' ? 'Sân khả dụng' : 'Vendor khả dụng'}
                </span>
              </div>

              {isSearchActive && (
                <button
                  onClick={onClearSearchKeyword || handleClearNearbyOnly}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#006241]/10 border border-[#006241]/30 text-[#006241] text-xs font-bold transition-all cursor-pointer hover:bg-[#006241]/20 shrink-0"
                  title="Xoá từ khoá tìm kiếm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">"{searchKeyword}"</span>
                  <X className="w-3.5 h-3.5 ml-0.5" />
                </button>
              )}

              {isSportActive && (
                <button
                  onClick={() => onToggleSport('ALL')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#006241]/10 border border-[#006241]/30 text-[#006241] text-xs font-bold transition-all cursor-pointer hover:bg-[#006241]/20 shrink-0"
                  title="Bỏ lọc môn thể thao"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{selectedSports.join(', ')}</span>
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              )}

              {isNearbyActive && (
                <button
                  onClick={handleClearNearbyOnly}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#006241]/10 border border-[#006241]/30 text-[#006241] text-xs font-bold transition-all cursor-pointer hover:bg-[#006241]/20 shrink-0"
                  title="Xoá bộ lọc gần đây"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="max-w-[140px] truncate">Gần: {selectedAddrText || 'Vị trí'} ({radiusKm}km)</span>
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              )}

              {isRatingActive && (
                <button
                  onClick={onClearRatings}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold transition-all cursor-pointer hover:bg-amber-500/20 shrink-0"
                  title="Xoá bộ lọc đánh giá sao"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>
                    {selectedRatings
                      .slice()
                      .sort((a, b) => b - a)
                      .map((s) => `${s}★`)
                      .join(', ')}
                  </span>
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              )}

              {(isSportActive || isNearbyActive || isSearchActive || isRatingActive) && (
                <button
                  onClick={onClearAllFilters || handleClearNearbyOnly}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  title="Tắt toàn bộ lọc và hiển thị tất cả sân"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tắt Lọc Sân</span>
                </button>
              )}
            </div>

            <div className="relative shrink-0" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider font-mono ${
                  filterOpen || totalActiveFilters > 0
                    ? 'bg-[#1E3932] text-[#FBF8F0] shadow-md'
                    : 'bg-[#1E3932] hover:bg-[#006241] text-white shadow-sm'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Lọc Sân</span>
                {totalActiveFilters > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#006241] text-white text-[10px] flex items-center justify-center font-extrabold ml-0.5">
                    {totalActiveFilters}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-3 w-[min(calc(100vw-1.5rem),500px)] max-h-[calc(100vh-140px)] flex flex-col bg-[#FBF8F0] border border-[#E6E2D8] rounded-[24px] shadow-2xl z-50 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E2D8] bg-[#F2F0EB] shrink-0">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#006241]" />
                      <span className="text-sm font-extrabold text-[#1E3932]">Bộ Lọc Sân Thể Thao</span>
                    </div>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#E6E2D8] text-[#6F7E72] cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex border-b border-[#E6E2D8] bg-[#F2F0EB]/60 p-1.5 gap-1.5 shrink-0">
                    <button
                      onClick={() => setActiveTab('sport')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'sport'
                          ? 'bg-[#006241] text-white shadow-sm'
                          : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#E6E2D8]/50'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span className="truncate">Môn Thể Thao</span>
                      {isSportActive && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('distance')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'distance'
                          ? 'bg-[#006241] text-white shadow-sm'
                          : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#E6E2D8]/50'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">Khoảng Cách</span>
                      {isNearbyActive && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('rating')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'rating'
                          ? 'bg-[#006241] text-white shadow-sm'
                          : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#E6E2D8]/50'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="truncate">Đánh Giá</span>
                      {isRatingActive && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">

                  {activeTab === 'sport' && (
                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-xs font-extrabold text-[#1E3932] block mb-1">
                          Chọn Môn Thể Thao Yêu Thích
                        </span>
                        <p className="text-xs text-[#6F7E72] leading-relaxed">
                          Lọc danh sách các Vendor sân theo bộ môn thể thao bạn muốn tìm.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                        {allSports.map((sport) => {
                          const isAllSelected = selectedSports.includes('ALL');
                          const isSelected = isAllSelected
                            ? sport.id === 'ALL'
                            : selectedSports.some((s) => s.toLowerCase() === sport.id.toLowerCase());
                          return (
                            <button
                              key={sport.id}
                              onClick={() => onToggleSport(sport.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                isSelected
                                  ? 'bg-[#006241]/10 border-[#006241] text-[#006241] font-extrabold shadow-sm ring-1 ring-[#006241]'
                                  : 'bg-white border-[#E6E2D8] text-[#1E3932] font-semibold hover:border-[#006241]/50 hover:bg-[#F2F0EB]/50'
                              }`}
                            >
                              <span className="text-base">{sport.icon}</span>
                              <span className="text-xs">{sport.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#006241] ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>

                      {isSportActive && (
                        <div className="pt-2 border-t border-[#E6E2D8] flex justify-end">
                          <button
                            onClick={() => onToggleSport('ALL')}
                            className="text-xs font-bold text-[#6F7E72] hover:text-[#DC2626] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Xoá Lọc Môn Thể Thao
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'distance' && (
                    <div className="p-5 space-y-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <MapPin className="w-4 h-4 text-[#006241]" />
                          <span className="text-sm font-extrabold text-[#1E3932]">Sân Gần Vị Trí Tôi</span>
                        </div>
                        <p className="text-xs text-[#6F7E72] leading-relaxed font-medium">
                          Chọn địa chỉ bạn muốn sử dụng làm tâm điểm tìm sân trong bán kính phù hợp.
                        </p>
                      </div>

                      {/* Address Dropdown Selector */}
                      {userAddresses.length > 0 ? (
                        <div className="relative space-y-1.5" ref={addressDropdownRef}>
                          <label className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider block">
                            Chọn Địa Chỉ Lọc Sân ({userAddresses.length} địa chỉ)
                          </label>

                          <button
                            type="button"
                            onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                            className="w-full px-4 py-3 rounded-2xl bg-white border border-[#006241]/30 hover:border-[#006241] flex items-center justify-between gap-3 text-left transition-all shadow-sm cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <MapPin className="w-4 h-4 text-[#006241] shrink-0" />
                              <span className="text-xs font-extrabold text-[#1E3932] truncate">
                                {selectedAddrText || 'Chọn địa chỉ...'}
                              </span>
                              {userAddresses.find((a) => a.id === selectedAddressId)?.isDefault && (
                                <span className="px-2 py-0.5 bg-[#006241] text-white text-[10px] font-bold rounded-full shrink-0">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[#6F7E72] shrink-0 transition-transform ${addressDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {addressDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E6E2D8] rounded-2xl shadow-2xl z-[60] p-1.5 space-y-1 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
                              {userAddresses.map((addr) => {
                                const isSelected = selectedAddressId === addr.id;
                                return (
                                  <button
                                    key={addr.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddressId(addr.id);
                                      setSelectedLat(addr.latitude != null ? Number(addr.latitude) : profile.userLat);
                                      setSelectedLng(addr.longitude != null ? Number(addr.longitude) : profile.userLng);
                                      setSelectedAddrText(addr.address);
                                      setAddressDropdownOpen(false);
                                    }}
                                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#006241] text-white font-extrabold'
                                        : 'text-[#1E3932] hover:bg-[#F2F0EB] font-semibold'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#006241]'}`} />
                                      <span className="text-xs truncate">{addr.address}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {addr.isDefault && (
                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isSelected ? 'bg-white text-[#006241]' : 'bg-[#006241] text-white'}`}>
                                          Mặc định
                                        </span>
                                      )}
                                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : hasLocation ? (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#006241]/10 border border-[#006241]/20 rounded-2xl">
                          <CheckCircle2 className="w-4 h-4 text-[#006241] shrink-0" />
                          <span className="text-xs text-[#1E3932] font-semibold line-clamp-1">
                            {effectiveAddress || 'Đã xác nhận địa chỉ'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-xs text-amber-900 font-medium">
                            Bạn chưa cập nhật thông tin vị trí trong{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setFilterOpen(false);
                                const token = tokenManager.getActiveToken();
                                if (!token) {
                                  navigate('/login');
                                } else {
                                  navigate('/user/profile');
                                }
                              }}
                              className="font-extrabold text-[#006241] underline hover:text-[#1E3932] transition-colors cursor-pointer"
                            >
                              Hồ Sơ
                            </button>
                            .
                          </span>
                        </div>
                      )}

                      <div className={!hasLocation ? 'opacity-40 pointer-events-none' : ''}>
                        <label className="text-xs font-mono font-bold text-[#6F7E72] uppercase tracking-wider block mb-2">
                          BÁN KÍNH TÌM KIẾM: <span className="text-[#1E3932] font-extrabold">{radiusKm} KM</span>
                        </label>
                        <input
                          type="range"
                          tabIndex={1}
                          min={1}
                          max={50}
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(Number(e.target.value))}
                          className="w-full accent-[#006241]"
                          disabled={!hasLocation}
                        />
                        <div className="flex justify-between text-[11px] font-mono text-[#6F7E72] mt-1">
                          <span>1 km</span>
                          <span>50 km</span>
                        </div>
                      </div>

                      {nearbyError && (
                        <p className="text-xs text-[#DC2626] font-semibold">{nearbyError}</p>
                      )}

                      <div className="flex gap-2.5 pt-2">
                        {isNearbyActive && (
                          <button
                            onClick={handleClearNearbyOnly}
                            className="flex-1 py-2.5 rounded-full border border-[#E6E2D8] text-[#6F7E72] text-xs font-bold hover:bg-[#F2F0EB] transition-all cursor-pointer"
                          >
                            Xoá Lọc
                          </button>
                        )}
                        <button
                          onClick={handleNearbySearch}
                          disabled={!hasLocation || isLoadingNearby}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer uppercase tracking-wider"
                        >
                          {isLoadingNearby ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          {isLoadingNearby ? 'Đang tìm...' : 'Áp Dụng Lọc'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'rating' && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-extrabold text-[#1E3932] block mb-1">
                            Lọc Theo Đánh Giá Sao
                          </span>
                          <p className="text-xs text-[#6F7E72] leading-relaxed">
                            Chọn một hoặc nhiều mức sao để lọc sân theo mong muốn của bạn.
                          </p>
                        </div>
                        {isRatingActive && (
                          <span className="text-[11px] font-bold text-[#006241] bg-[#006241]/10 px-2.5 py-1 rounded-full shrink-0 ml-2">
                            Đã chọn {selectedRatings.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {RATING_STAR_OPTIONS.map((opt) => {
                          const isSelected = selectedRatings.includes(opt.star);

                          return (
                            <button
                              key={opt.star}
                              type="button"
                              onClick={() => onToggleRating?.(opt.star)}
                              className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-[#006241]/10 border-[#006241] shadow-sm ring-1 ring-[#006241]'
                                  : 'bg-white border-[#E6E2D8] hover:border-[#006241]/40 hover:bg-[#F2F0EB]/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < opt.star
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-xs font-extrabold ${isSelected ? 'text-[#006241]' : 'text-[#1E3932]'}`}>
                                    {opt.label}
                                  </div>
                                  <div className="text-[11px] text-[#6F7E72] truncate">
                                    {opt.desc}
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                                  isSelected
                                    ? 'bg-[#006241] border-[#006241] text-white'
                                    : 'border-[#D1D5DB] bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {isRatingActive && (
                        <div className="pt-2 border-t border-[#E6E2D8] flex justify-end">
                          <button
                            onClick={onClearRatings}
                            className="text-xs font-bold text-[#6F7E72] hover:text-[#DC2626] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Bỏ chọn tất cả sao
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
