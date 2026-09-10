import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { vendorService, BackendYardItem, BackendVendor } from '../services/vendorService';
import { bookingService, BackendBooking } from '../services/bookingService';
import { rateService } from '../services/rateService';
import { timeService } from '../services/timeService';
import { RatingStats } from '../types/rate';
import { DashboardNavbar } from '../component/user/DashboardNavbar';
import { DashboardFooter } from '../component/user/DashboardFooter';
import { YardDetailHero } from '../component/yard/YardDetailHero';
import { YardDetailTabs, YardTabId } from '../component/yard/YardDetailTabs';
import { YardScheduleTab, GroupedBookingSlot } from '../component/yard/YardScheduleTab';
import { YardReviewsTab } from '../component/yard/YardReviewsTab';
import { YardSpecsTab } from '../component/yard/YardSpecsTab';
import { YardVendorTab } from '../component/yard/YardVendorTab';
import { YardPoliciesTab } from '../component/yard/YardPoliciesTab';
import { BookingModal } from '../component/booking/BookingModal';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface YardDetailPageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const YardDetailPage: React.FC<YardDetailPageProps> = ({
  currentUser,
  onLogout,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as YardTabId;
  const initialTab: YardTabId = (tabParam && ['schedule', 'reviews', 'specs', 'vendor', 'policies'].includes(tabParam))
    ? tabParam
    : 'schedule';

  const [yard, setYard] = useState<BackendYardItem | null>(null);
  const [vendorYards, setVendorYards] = useState<BackendYardItem[]>([]);
  const [paidBookings, setPaidBookings] = useState<BackendBooking[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [activeTab, setActiveTab] = useState<YardTabId>(initialTab);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingInitialMode, setBookingInitialMode] = useState<'hourly' | 'monthly'>('hourly');
  const [presetTimeSlot, setPresetTimeSlot] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    const currentTabParam = searchParams.get('tab') as YardTabId;
    if (currentTabParam && ['schedule', 'reviews', 'specs', 'vendor', 'policies'].includes(currentTabParam)) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: YardTabId) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    if (newTab === 'schedule') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', newTab);
    }
    setSearchParams(newParams, { replace: true });
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const yardRes = await vendorService.getYardById(id);
      if (yardRes.success && yardRes.data) {
        const yardData = yardRes.data;
        setYard(yardData);

        // Load other yards belonging to same vendor
        const vendorId = yardData.vendor?.id;
        if (vendorId) {
          const vendorYardsRes = await vendorService.getYardsByVendor(vendorId);
          if (vendorYardsRes.success && Array.isArray(vendorYardsRes.data)) {
            setVendorYards(vendorYardsRes.data);
          }
        }
      } else {
        setYard(null);
        toast.error('Không tìm thấy thông tin sân thi đấu.', { id: 'yard-not-found' });
      }

      // Load paid bookings for this yard using single optimized SQL JOIN
      const bookingsRes = await bookingService.fetchBookingsByYard(Number(id), undefined, 'paid');
      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        setPaidBookings(bookingsRes.data);
      }

      // Load rating stats for real star score and total count
      const ratesRes = await rateService.getRatesByYard(id);
      if (ratesRes.success && ratesRes.data?.stats) {
        setRatingStats(ratesRes.data.stats);
      }
    } catch {
      toast.error('Lỗi khi tải thông tin chi tiết sân thi đấu.', { id: 'yard-detail-error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadData]);

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setPresetTimeSlot(null);
    if (searchParams.get('action') === 'booking' || searchParams.get('openBooking') === 'true') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('openBooking');
      nextParams.delete('mode');
      nextParams.delete('date');
      nextParams.delete('startTime');
      nextParams.delete('endTime');
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    if (!yard || isLoading) return;

    const action = searchParams.get('action');
    const openBooking = searchParams.get('openBooking') === 'true';

    if (action === 'booking' || openBooking) {
      const isGuest =
        !currentUser ||
        (currentUser.role as string) === 'GUEST' ||
        (currentUser as any).roleName === 'guest';

      if (isGuest) {
        toast.error('Vui lòng đăng nhập để thực hiện đặt lịch sân!');
        navigate('/login');
        return;
      }

      const modeParam = searchParams.get('mode');
      if (modeParam === 'monthly') {
        setBookingInitialMode('monthly');
      } else {
        setBookingInitialMode('hourly');
      }

      const date = searchParams.get('date');
      const startTime = searchParams.get('startTime');
      const endTime = searchParams.get('endTime');
      if (date && startTime && endTime) {
        setPresetTimeSlot({ date, startTime, endTime });
      }

      setIsBookingModalOpen(true);
    }
  }, [yard, isLoading, searchParams, currentUser, navigate]);

  const handleBookNow = () => {
    const isGuest =
      !currentUser ||
      (currentUser.role as string) === 'GUEST' ||
      (currentUser as any).roleName === 'guest';

    if (isGuest) {
      toast.error('Vui lòng đăng nhập để thực hiện đặt lịch sân!');
      navigate('/login');
      return;
    }

    setBookingInitialMode('hourly');
    setPresetTimeSlot(null);
    setIsBookingModalOpen(true);
  };

  const handleBookMonthly = () => {
    const isGuest =
      !currentUser ||
      (currentUser.role as string) === 'GUEST' ||
      (currentUser as any).roleName === 'guest';

    if (isGuest) {
      toast.error('Vui lòng đăng nhập để thực hiện đặt lịch sân!');
      navigate('/login');
      return;
    }

    setBookingInitialMode('monthly');
    setPresetTimeSlot(null);
    setIsBookingModalOpen(true);
  };

  const handleBookMultipleSlots = async (groups: GroupedBookingSlot[]) => {
    const isGuest =
      !currentUser ||
      (currentUser.role as string) === 'GUEST' ||
      (currentUser as any).roleName === 'guest';

    if (isGuest) {
      toast.error('Vui lòng đăng nhập để thực hiện đặt lịch sân!');
      navigate('/login');
      return;
    }

    if (!groups || groups.length === 0 || !yard) return;

    // Safety guard: check if any group start time has already passed
    const nowMs = timeService.getNowMs();
    const hasExpiredGroup = groups.some((group) => {
      const startMs = new Date(`${group.date}T${group.startTime}:00+07:00`).getTime();
      return startMs <= nowMs;
    });

    if (hasExpiredGroup) {
      toast.error('Có khung giờ đã quá thời gian hiện tại và không thể đặt. Vui lòng chọn lại khung giờ!');
      return;
    }

    const loadingToast = toast.loading(`Đang tạo ${groups.length} đơn đặt sân...`);
    try {
      const createdBookings = [];
      for (const group of groups) {
        const startObj = new Date(`${group.date}T${group.startTime}:00+07:00`);
        const endObj = new Date(`${group.date}T${group.endTime}:00+07:00`);

        const res = await bookingService.createBooking({
          yardId: Number(yard.id),
          startTime: startObj.toISOString(),
          endTime: endObj.toISOString(),
          status: 'unpaid',
          priced: group.price,
        });

        if (res.success && res.data) {
          createdBookings.push(res.data);
        }
      }

      toast.dismiss(loadingToast);

      if (createdBookings.length > 0) {
        toast.success(
          `Đã tạo thành công ${createdBookings.length} đơn đặt sân cho ${yard.yardName}! Chuyển đến Giỏ hàng...`
        );
        navigate('/cart');
      } else {
        toast.error('Không thể tạo đơn đặt sân. Vui lòng thử lại.');
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error('Lỗi khi tạo đơn đặt sân.');
    }
  };

  const handleBookTimeSlot = (selectedDate: string, startTime: string, endTime: string) => {
    const isGuest =
      !currentUser ||
      (currentUser.role as string) === 'GUEST' ||
      (currentUser as any).roleName === 'guest';

    if (isGuest) {
      toast.error('Vui lòng đăng nhập để thực hiện đặt lịch sân!');
      navigate('/login');
      return;
    }

    const nowMs = timeService.getNowMs();
    const startMs = new Date(`${selectedDate}T${startTime}:00+07:00`).getTime();
    if (startMs <= nowMs) {
      toast.error('Khung giờ này đã quá thời gian hiện tại và không thể đặt!');
      return;
    }

    setPresetTimeSlot({
      date: selectedDate,
      startTime,
      endTime,
    });
    setIsBookingModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F0EB] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
        <DashboardNavbar
          currentUser={currentUser}
          onLogout={onLogout}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-12 h-12 text-[#006241] animate-spin" />
          <p className="text-sm font-extrabold text-[#1E3932]">
            Đang tải thông tin chi tiết sân thi đấu...
          </p>
        </div>
        <DashboardFooter />
      </div>
    );
  }

  if (!yard) {
    return (
      <div className="min-h-screen bg-[#F2F0EB] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
        <DashboardNavbar
          currentUser={currentUser}
          onLogout={onLogout}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />
        <div className="max-w-md mx-auto my-auto p-8 rounded-[32px] bg-[#FBF8F0] border border-[#E6E2D8] text-center space-y-4 shadow-md">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1E3932]">
            Không tìm thấy sân thi đấu
          </h2>
          <p className="text-xs text-[#6F7E72]">
            Sân này có thể đã bị xóa hoặc tạm thời ngừng hoạt động. Vui lòng quay lại danh sách sân.
          </p>
          <button
            onClick={() => navigate('/user')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] text-white font-mono text-xs font-bold shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay Lại Trang Chủ</span>
          </button>
        </div>
        <DashboardFooter />
      </div>
    );
  }

  const vendorName = yard.vendor?.vendorName || 'Cụm Sân Thể Thao';
  const vendorAddress = yard.vendor?.vendorAddress || 'Chưa cập nhật địa chỉ';
  const vendorPhone = yard.vendor?.vendorPhone || 'Chưa cập nhật SĐT';
  const openTime = yard.vendor?.openTime || '06:00';
  const closeTime = yard.vendor?.closeTime || '23:00';

  return (
    <div className="min-h-screen bg-[#F2F0EB] text-[#1E3932] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col justify-between selection:bg-[#006241] selection:text-white">
      <div>
        {/* Navigation Bar */}
        <DashboardNavbar
          currentUser={currentUser}
          onLogout={onLogout}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />

        {/* Hero Section */}
        <YardDetailHero
          yard={yard}
          vendorName={vendorName}
          vendorAddress={vendorAddress}
          vendorPhone={vendorPhone}
          openTime={openTime}
          closeTime={closeTime}
          ratingStats={ratingStats}
          onBookNow={handleBookNow}
          onBookMonthly={handleBookMonthly}
          onViewReviews={() => handleTabChange('reviews')}
        />

        {/* Sticky Tab Navigation Bar */}
        <YardDetailTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          reviewCount={ratingStats?.totalReviews}
        />

        {/* Main Content Area based on Tab */}
        <main key={activeTab} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-tab-transition">
          {activeTab === 'schedule' && (
            <YardScheduleTab
              yard={yard}
              paidBookings={paidBookings}
              currentUser={currentUser}
              onBookTimeSlot={handleBookTimeSlot}
              onBookMultipleSlots={handleBookMultipleSlots}
            />
          )}

          {activeTab === 'reviews' && (
            <YardReviewsTab
              yard={yard}
              currentUser={currentUser}
              onReviewsUpdated={loadData}
            />
          )}

          {activeTab === 'specs' && (
            <YardSpecsTab
              yard={yard}
              currentUser={currentUser}
              onBookNow={() => setIsBookingModalOpen(true)}
            />
          )}

          {activeTab === 'vendor' && (
            <YardVendorTab
              yard={yard}
              vendorName={vendorName}
              vendorAddress={vendorAddress}
              vendorPhone={vendorPhone}
              openTime={openTime}
              closeTime={closeTime}
              vendorYards={vendorYards}
            />
          )}

          {activeTab === 'policies' && <YardPoliciesTab vendorPhone={vendorPhone} />}
        </main>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          yard={yard}
          vendorName={vendorName}
          initialTimeSlot={presetTimeSlot}
          initialMode={bookingInitialMode}
          onClose={handleCloseBookingModal}
          onBookingCreated={() => {
            handleCloseBookingModal();
            loadData();
          }}
        />
      )}

      {/* Footer */}
      <DashboardFooter />
    </div>
  );
};
