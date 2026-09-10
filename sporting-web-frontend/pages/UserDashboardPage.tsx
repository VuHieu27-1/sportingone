import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthUser } from '../types/auth';
import { vendorService, VendorDisplayItem } from '../services/vendorService';
import { DashboardNavbar } from '../component/user/DashboardNavbar';
import { DashboardHero } from '../component/user/DashboardHero';
import { SportsCategoryBar } from '../component/user/SportsCategoryBar';
import { VendorGrid } from '../component/user/VendorGrid';
import { VendorDetailModal } from '../component/user/VendorDetailModal';
import { DashboardFooter } from '../component/user/DashboardFooter';
import { UserCourtList } from '../component/yard/UserCourtList';
import { CheckCircle2, Zap, ShieldCheck, Headphones, MapPin, Building2, QrCode, RotateCcw, Coins } from 'lucide-react';

interface UserDashboardPageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

const TRUST_FEATURES = [
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#006241]" />,
    title: 'Cụm Sân Đã Xác Thực',
    desc: 'Chỉ các cụm sân thể thao uy tín được kiểm duyệt Active chính thức mới hiển thị trên hệ thống.',
  },
  {
    icon: <Zap className="w-6 h-6 text-[#D97706]" />,
    title: 'Đặt Sân & Giữ Chỗ Tức Thì',
    desc: 'Thanh toán nhanh chóng qua Chuyển khoản VietQR hoặc Ví Xu tiện lợi, giữ lịch sân chính xác 100%.',
  },
  {
    icon: <QrCode className="w-6 h-6 text-[#0284C7]" />,
    title: 'Vé QR Check-in Bảo Mật',
    desc: 'Tự động tạo vé QR có chữ ký số điện tử chống giả mạo, quét mã check-in trực tiếp tại sân.',
  },
  {
    icon: <RotateCcw className="w-6 h-6 text-[#006241]" />,
    title: 'Tự Động Hoàn Xu Linh Hoạt',
    desc: 'Hủy đơn trước giờ chơi từ 1 tiếng trở lên được tự động hoàn 100% Xu tức thì về ví tài khoản.',
  },
];

const normalizeSportName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'cầu lông' || lower === 'cầu_lông') return 'Cầu lông';
  if (lower === 'bóng đá' || lower === 'bóng_đá') return 'Bóng đá';
  if (lower === 'bóng bàn' || lower === 'bóng_bàn') return 'Bóng bàn';
  if (lower === 'bóng rổ' || lower === 'bóng_rổ') return 'Bóng rổ';
  if (lower === 'bóng chuyền' || lower === 'bóng_chuyền') return 'Bóng chuyền';
  if (lower === 'bơi lội' || lower === 'bơi') return 'Bơi lội';
  if (lower === 'tennis') return 'Tennis';
  if (lower === 'pickleball') return 'Pickleball';
  if (lower === 'golf') return 'Golf';
  if (lower === 'bida' || lower === 'billiards') return 'Bida';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({
  currentUser,
  onLogout,
}) => {
  const [searchParams] = useSearchParams();

  const [searchKeyword, setSearchKeyword] = useState(() => {
    return searchParams.get('keyword') || searchParams.get('q') || '';
  });
  const [selectedSports, setSelectedSports] = useState<string[]>(() => {
    const qSport = searchParams.get('sport');
    return qSport ? [qSport] : ['ALL'];
  });
  const [selectedRatings, setSelectedRatings] = useState<number[]>(() => {
    const qRating = searchParams.get('rating') || searchParams.get('minRating');
    return qRating && !isNaN(Number(qRating)) ? [Number(qRating)] : [];
  });
  const [showAllVendors, setShowAllVendors] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'vendors' | 'courts'>(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('view');
    if (tabParam === 'vendors') return 'vendors';
    return 'courts';
  });

  const handleToggleRating = (star: number) => {
    setSelectedRatings((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  const handleClearRatings = () => {
    setSelectedRatings([]);
  };

  /**
   * Handles event processing for handleToggleSport.
   */
  const handleToggleSport = (sportId: string) => {
    if (sportId === 'ALL') {
      setSelectedSports(['ALL']);
      setShowAllVendors(true);
      return;
    }
    setSelectedSports((prev) => {
      const currentWithoutAll = prev.filter((s) => s !== 'ALL');
      const isAlreadySelected = currentWithoutAll.some((s) => s.toLowerCase() === sportId.toLowerCase());
      let next: string[];
      if (isAlreadySelected) {
        next = currentWithoutAll.filter((s) => s.toLowerCase() !== sportId.toLowerCase());
      } else {
        next = [...currentWithoutAll, sportId];
      }
      return next.length === 0 ? ['ALL'] : next;
    });
  };

  const [vendors, setVendors] = useState<VendorDisplayItem[]>([]);
  const [nearbyVendors, setNearbyVendors] = useState<VendorDisplayItem[] | null>(null);
  const [nearbyCoords, setNearbyCoords] = useState<{ lat?: number; lng?: number } | null>(null);
  const [nearbyRadius, setNearbyRadius] = useState<number | null>(null);
  const [courtCount, setCourtCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedVendorModal, setSelectedVendorModal] = useState<VendorDisplayItem | null>(null);

  useEffect(() => {
    const qSport = searchParams.get('sport');
    if (qSport) {
      setSelectedSports([qSport]);
    }

    const qKw = searchParams.get('keyword') || searchParams.get('q');
    if (qKw) {
      setSearchKeyword(qKw);
    } else {
      setSearchKeyword('');
    }

    const qLoc = searchParams.get('location');
    if (qLoc) {
      try {
        localStorage.setItem('sporting_user_selected_location', qLoc);
      } catch (e) {
        console.error('Failed to update sporting_user_selected_location', e);
      }
    }

    if (qLoc && qLoc.trim() !== '') {
      const defaultRadius = Number((import.meta as any).env?.VITE_DEFAULT_SEARCH_RADIUS_KM || 3);
      vendorService
        .getNearbyVendors({
          maxDistanceKm: defaultRadius,
        })
        .then((res) => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setNearbyVendors(res.data);
          } else {
            setNearbyVendors(null);
          }
        })
        .catch((e) => {
          console.warn('[UserDashboardPage] Auto nearby filter warning:', e);
          setNearbyVendors(null);
        });
    } else {
      setNearbyVendors(null);
      setNearbyCoords(null);
      setNearbyRadius(null);
      setShowAllVendors(true);
    }
  }, [searchParams]);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await vendorService.getVendors('active');
      if (res.success && res.data) {
        setVendors(res.data);
      } else {
        setErrorMessage(res.message || 'Không thể lấy dữ liệu Vendor từ máy chủ Backend.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối API Backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const navigate = useNavigate();

  const handleClearAllFilters = useCallback(() => {
    setNearbyVendors(null);
    setNearbyCoords(null);
    setNearbyRadius(null);
    setSearchKeyword('');
    setSelectedSports(['ALL']);
    setSelectedRatings([]);
    setShowAllVendors(true);
    if (searchParams.get('location') || searchParams.get('keyword') || searchParams.get('sport') || searchParams.get('rating') || searchParams.get('minRating')) {
      navigate('/user', { replace: true });
    }
  }, [searchParams, navigate]);

  const sportsMap = new Map<string, string>();
  vendors.forEach((v) => {
    const list = v.sportTypes && v.sportTypes.length > 0 ? v.sportTypes : [v.sportType || ''];
    list.forEach((st) => {
      if (st && st.trim()) {
        const norm = normalizeSportName(st);
        const key = norm.toLowerCase();
        if (!sportsMap.has(key)) {
          sportsMap.set(key, norm);
        }
      }
    });
  });
  const availableSports = Array.from(sportsMap.values());

  const baseList = Array.isArray(nearbyVendors) ? nearbyVendors : vendors;

  const filteredVendors = baseList.filter((vendor) => {
    if (!selectedSports.includes('ALL') && selectedSports.length > 0) {
      const allVSports = (
        vendor.sportTypes && vendor.sportTypes.length > 0
          ? vendor.sportTypes
          : [vendor.sportType || '']
      ).map((s) => s.toLowerCase().trim());

      const hasMatch = selectedSports.some((tSport) => {
        const target = tSport.toLowerCase().trim();
        return allVSports.some(
          (vSport) => vSport === target || vSport.includes(target) || target.includes(vSport)
        );
      });

      if (!hasMatch) return false;
    }
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase().trim();
      const matchName = vendor.name.toLowerCase().includes(kw);
      if (!matchName) {
        return false;
      }
    }
    if (selectedRatings.length > 0) {
      const vRating = Number(vendor.rating ?? vendor.averageRating ?? 0);
      const isMatched = selectedRatings.some((star) => {
        if (star === 5) return vRating >= 4.5;
        if (star === 4) return vRating >= 3.5 && vRating < 4.5;
        if (star === 3) return vRating >= 2.5 && vRating < 3.5;
        if (star === 2) return vRating >= 1.5 && vRating < 2.5;
        if (star === 1) return vRating >= 0.5 && vRating < 1.5;
        return false;
      });
      if (!isMatched) {
        return false;
      }
    }
    return true;
  });

  const displayedVendors = showAllVendors ? filteredVendors : filteredVendors.slice(0, 4);

  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#F2F0EB] font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932] selection:bg-[#006241] selection:text-white">
        <DashboardNavbar
          currentUser={currentUser}
          onLogout={onLogout}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />

        <DashboardHero
          vendorCount={vendors.length}
        />

        <SportsCategoryBar
          selectedSports={selectedSports}
          onToggleSport={handleToggleSport}
          vendorCount={viewMode === 'vendors' ? filteredVendors.length : courtCount}
          viewMode={viewMode}
          isNearbyActive={nearbyVendors !== null}
          onNearbyResult={(result, options) => {
            setNearbyVendors(result);
            if (options?.lat !== undefined && options?.lng !== undefined) {
              setNearbyCoords({ lat: options.lat, lng: options.lng });
            } else {
              setNearbyCoords(null);
            }
            if (options?.radiusKm !== undefined) {
              setNearbyRadius(options.radiusKm);
            } else {
              setNearbyRadius(null);
            }
            if (result) {
              setShowAllVendors(true);
            }
          }}
          selectedRatings={selectedRatings}
          onToggleRating={handleToggleRating}
          onClearRatings={handleClearRatings}
          availableSports={availableSports}
          searchKeyword={searchKeyword}
          onClearSearchKeyword={() => setSearchKeyword('')}
          onClearAllFilters={handleClearAllFilters}
        />

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12" id="venues">
          {/* Section Header & View Mode Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6 pb-6 border-b border-[#E6E2D8]">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
                <span>✦ HỆ THỐNG SÂN THỂ THAO</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E3932] tracking-tight">
                {viewMode === 'vendors' ? 'Danh Sách Vendor Thể Thao' : 'Danh Sách Tất Cả Sân'}
              </h2>
              <p className="text-[#6F7E72] text-sm mt-1.5 font-medium">
                {viewMode === 'vendors'
                  ? `Khám phá ${filteredVendors.length} Vendor đối tác đã xác thực chất lượng`
                  : `Khám phá ${courtCount} sân thể thao chất lượng từ các Vendor đã xác thực`}
              </p>
            </div>

            {/* View Mode Toggle & Collapse Container */}
            <div className="flex flex-col items-start lg:items-end gap-2.5">
              <div className="inline-flex p-1 rounded-2xl bg-[#E6E2D8]/60 border border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setViewMode('vendors')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 cursor-pointer ${viewMode === 'vendors'
                    ? 'bg-[#006241] text-white shadow-md'
                    : 'text-[#1E3932] hover:text-[#006241]'
                    }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Cụm Sân (Vendors)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('courts')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 cursor-pointer ${viewMode === 'courts'
                    ? 'bg-[#006241] text-white shadow-md'
                    : 'text-[#1E3932] hover:text-[#006241]'
                    }`}
                >
                  <MapPin className="w-4 h-4 text-[#A3E635]" />
                  <span>Tất Cả Sân Thể Thao</span>
                </button>
              </div>

              {viewMode === 'vendors' && filteredVendors.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllVendors((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1E3932]/10 hover:bg-[#1E3932] text-[#1E3932] hover:text-white font-mono text-xs font-bold transition-all duration-300 cursor-pointer uppercase tracking-wider border border-[#1E3932]/20"
                >
                  <span>
                    {showAllVendors
                      ? `THU GỌN (HIỆN 4/${filteredVendors.length})`
                      : `XEM TẤT CẢ (${filteredVendors.length})`}
                  </span>
                  <span className="text-sm">{showAllVendors ? '↑' : '→'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === 'vendors' ? (
            <VendorGrid
              vendors={displayedVendors}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onSelectVendor={(vendor) => setSelectedVendorModal(vendor)}
              onRetry={fetchVendors}
            />
          ) : (
            <UserCourtList
              selectedSports={selectedSports}
              searchKeyword={searchKeyword}
              nearbyVendors={nearbyVendors}
              userCoords={nearbyCoords}
              maxDistanceKm={nearbyRadius}
              selectedRatings={selectedRatings}
              onSelectCourt={(court) => navigate(`/yard/${court.id}`)}
              onCourtCountChange={(count) => setCourtCount(count)}
            />
          )}
        </main>

        <section className="bg-[#FBF8F0] border-t border-b border-[#E6E2D8] py-16" id="about">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
                CAM KẾT CHẤT LƯỢNG
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E3932] tracking-tight">
                Tại Sao Chọn Sporting ONE?
              </h2>
              <p className="text-[#6F7E72] text-sm mt-2 font-medium">
                Hệ sinh thái kết nối thể thao toàn diện, minh bạch và chuyên nghiệp hàng đầu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TRUST_FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="flex flex-col items-start gap-4 p-7 rounded-[28px] bg-[#F2F0EB] border border-[#E6E2D8] hover:border-[#006241]/40 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E6E2D8] group-hover:scale-110 transition-transform duration-300">
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1E3932] text-base mb-1.5">
                      {feat.title}
                    </h3>
                    <p className="text-[#6F7E72] text-xs leading-relaxed font-medium">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DashboardFooter />

        <VendorDetailModal
          vendor={selectedVendorModal}
          onClose={() => setSelectedVendorModal(null)}
        />
      </div>
    </>
  );
};
