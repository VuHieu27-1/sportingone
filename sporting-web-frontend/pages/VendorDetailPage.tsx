import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { vendorService, VendorDisplayItem, BackendYardItem } from '../services/vendorService';
import { bookingService, BackendBooking } from '../services/bookingService';
import { rateService } from '../services/rateService';
import { RatingStats } from '../types/rate';
import { DashboardNavbar } from '../component/user/DashboardNavbar';
import { DashboardFooter } from '../component/user/DashboardFooter';
import { VendorDetailHero } from '../component/vendor/VendorDetailHero';
import { VendorSportCategoryTabs, SportCategoryTab } from '../component/vendor/VendorSportCategoryTabs';
import { VendorYardGrid } from '../component/vendor/VendorYardGrid';
import { VendorReviewsTab } from '../component/vendor/VendorReviewsTab';

interface VendorDetailPageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

const getSportTypeName = (sportType: any): string => {
  if (!sportType) return 'Khác';
  if (typeof sportType === 'string') return sportType;
  if (typeof sportType === 'object' && sportType.sportName) return sportType.sportName;
  return String(sportType);
};

export const VendorDetailPage: React.FC<VendorDetailPageProps> = ({
  currentUser,
  onLogout,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<VendorDisplayItem | null>(null);
  const [yards, setYards] = useState<BackendYardItem[]>([]);
  const [paidBookings, setPaidBookings] = useState<BackendBooking[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [mainTab, setMainTab] = useState<'yards' | 'reviews'>('yards');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['ALL']);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<{ date: string; startTime: string; endTime: string } | null>(null);

  /**
   * Handles event processing for handleToggleCategory.
   */
  const handleToggleCategory = (catId: string) => {
    if (catId === 'ALL') {
      setSelectedCategories(['ALL']);
      return;
    }

    setSelectedCategories((prev) => {
      const currentWithoutAll = prev.filter((c) => c !== 'ALL');
      const isAlreadySelected = currentWithoutAll.some(
        (c) => c.toLowerCase() === catId.toLowerCase()
      );

      let next: string[];
      if (isAlreadySelected) {
        next = currentWithoutAll.filter((c) => c.toLowerCase() !== catId.toLowerCase());
      } else {
        next = [...currentWithoutAll, catId];
      }

      return next.length === 0 ? ['ALL'] : next;
    });
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const foundVendor = await vendorService.getVendorById(id);
      if (foundVendor) {
        setVendor(foundVendor);
      } else {
        setVendor(null);
        toast.error('Không tìm thấy thông tin Vendor trong cơ sở dữ liệu.', { id: 'vendor-not-found' });
      }

      const yardsRes = await vendorService.getYardsByVendor(id);
      if (yardsRes.success && Array.isArray(yardsRes.data)) {
        setYards(yardsRes.data);
      } else {
        toast.error(yardsRes.message || 'Không thể tải danh sách sân.', { id: 'vendor-yards-error' });
      }

      const bookingsRes = await bookingService.fetchAllBookings();
      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        setPaidBookings(bookingsRes.data.filter((b) => b.status === 'paid'));
      }

      // Fetch real rating statistics for this vendor
      const ratesRes = await rateService.getRatesByVendor(id);
      if (ratesRes.success && ratesRes.data?.stats) {
        setRatingStats(ratesRes.data.stats);
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ API.', { id: 'vendor-detail-error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadData]);

  const categories: SportCategoryTab[] = React.useMemo(() => {
    const map: Record<string, number> = {};
    yards.forEach((y) => {
      const s = getSportTypeName(y.sportType);
      map[s] = (map[s] || 0) + 1;
    });

    const list: SportCategoryTab[] = [
      { id: 'ALL', name: 'Tất Cả Môn', count: yards.length },
    ];
    Object.entries(map).forEach(([name, count]) => {
      list.push({ id: name, name, count });
    });
    return list;
  }, [yards]);

  const filteredYards = yards.filter((yard) => {
    const yardSport = getSportTypeName(yard.sportType).toLowerCase().trim();
    if (!selectedCategories.includes('ALL')) {
      const match = selectedCategories.some(
        (cat) => cat.toLowerCase().trim() === yardSport
      );
      if (!match) return false;
    }

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase().trim();
      const matchYardName = yard.yardName.toLowerCase().includes(kw);
      const matchSport = yardSport.includes(kw);
      if (!matchYardName && !matchSport) return false;
    }

    return true;
  });

  const availableCount = filteredYards.filter((y) => y.status === 'active').length;

  /**
   * Direct redirect to Yard Detail/Profile page upon clicking booking.
   */
  const handleBookYard = (yard: BackendYardItem) => {
    navigate(`/yard/${yard.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB] font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932] flex flex-col justify-between selection:bg-[#006241] selection:text-white">
      <div>
        {/* Header Navigation */}
        <DashboardNavbar
          currentUser={currentUser}
          onLogout={onLogout}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />

        {/* Hero Section with Real Rating */}
        {vendor && (
          <VendorDetailHero
            vendor={vendor}
            totalYardsCount={yards.length}
            ratingStats={ratingStats}
            onBack={() => navigate('/user')}
          />
        )}

        {/* Sport Categories, Filter & Main View Tabs (Danh Sách Sân & Đánh Giá Khách Hàng) */}
        <VendorSportCategoryTabs
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          timeFilter={timeFilter}
          onApplyTimeFilter={(filter) => setTimeFilter(filter)}
          availableCount={availableCount}
          activeMainTab={mainTab}
          onMainTabChange={setMainTab}
          totalYardsCount={yards.length}
          totalReviewsCount={ratingStats?.totalReviews || 0}
          openTime={vendor?.openTime}
          closeTime={vendor?.closeTime}
        />

        {/* View Content based on Main Tab */}
        {mainTab === 'yards' ? (
          <div className="animate-tab-transition">
            {/* Yard Grid Listing */}
            <VendorYardGrid
              yards={filteredYards}
              paidBookings={paidBookings}
              timeFilter={timeFilter}
              selectedCategoryName={
                selectedCategories.includes('ALL')
                  ? 'Tất cả môn'
                  : selectedCategories.join(', ')
              }
              vendorName={vendor?.name || `Vendor #${id}`}
              isLoading={isLoading}
              onBookYard={handleBookYard}
            />
          </div>
        ) : (
          <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-tab-transition">
            <VendorReviewsTab
              vendorId={id || 0}
              vendorName={vendor?.name || 'Cụm Sân Thể Thao'}
              yards={yards}
            />
          </main>
        )}
      </div>

      <DashboardFooter />
    </div>
  );
};
