import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { vendorService, BackendVendor, BackendYardItem } from '../services/vendorService';
import { bookingService, BackendBooking } from '../services/bookingService';
import { VendorSidebar, VendorTabType } from '../component/vendor/VendorSidebar';
import { VendorStatsOverview } from '../component/vendor/VendorStatsOverview';
import { RevenueChartPanel } from '../component/vendor/RevenueChartPanel';
import { QuickAccessPanel } from '../component/vendor/QuickAccessPanel';
import { RecentBookingsTable } from '../component/vendor/RecentBookingsTable';
import { SubVendorList } from '../component/vendor/SubVendorList';
import { YardManagementTable } from '../component/vendor/YardManagementTable';
import { SubVendorModal } from '../component/vendor/SubVendorModal';
import { YardModal } from '../component/vendor/YardModal';
import { VendorProfileDesignTab } from '../component/vendor/VendorProfileDesignTab';
import { VendorRefundCancelledTab } from '../component/vendor/VendorRefundCancelledTab';
import { RevenueAnalyticsDashboard } from '../component/vendor/analytics/RevenueAnalyticsDashboard';
import { Trash2, AlertTriangle, RefreshCw, Building2, Bell, Search, LayoutTemplate, RotateCcw, Menu } from 'lucide-react';
import { CustomSelect } from '../component/common/CustomSelect';

interface VendorDashboardPageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const VendorDashboardPage: React.FC<VendorDashboardPageProps> = ({
  currentUser,
  onLogout,
}) => {
  const getInitialVendorTab = (): VendorTabType => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab && ['dashboard', 'vendors', 'yards', 'bookings', 'refunds', 'analytics'].includes(urlTab)) {
        return urlTab as VendorTabType;
      }
      const saved = sessionStorage.getItem('sporting_vendor_active_tab');
      if (saved && ['dashboard', 'vendors', 'yards', 'bookings', 'refunds', 'analytics'].includes(saved)) {
        return saved as VendorTabType;
      }
    } catch { }
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState<VendorTabType>(getInitialVendorTab);
  const [vendorSubTab, setVendorSubTab] = useState<'list' | 'design'>('list');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const setActiveTab = (tab: VendorTabType) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('sporting_vendor_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { }
  };

  const [vendors, setVendors] = useState<BackendVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<BackendVendor | null>(null);
  const [yards, setYards] = useState<BackendYardItem[]>([]);
  const [bookings, setBookings] = useState<BackendBooking[]>([]);

  const [sportTypes, setSportTypes] = useState<Array<{ id: number; sportName: string }>>([]);
  const [yardTypes, setYardTypes] = useState<Array<{ id: number; typeName: string }>>([]);

  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(true);
  const [isLoadingYards, setIsLoadingYards] = useState<boolean>(false);

  const [isSubVendorModalOpen, setIsSubVendorModalOpen] = useState<boolean>(false);
  const [editingSubVendor, setEditingSubVendor] = useState<BackendVendor | null>(null);

  const [isYardModalOpen, setIsYardModalOpen] = useState<boolean>(false);
  const [editingYard, setEditingYard] = useState<BackendYardItem | null>(null);
  const [yardModalTab, setYardModalTab] = useState<'info' | 'images' | 'preview'>('info');

  const [deletingYard, setDeletingYard] = useState<BackendYardItem | null>(null);
  const [isDeletingYard, setIsDeletingYard] = useState<boolean>(false);

  const loadInitialData = useCallback(async () => {
    setIsLoadingVendors(true);
    try {
      const vendorsRes = await vendorService.fetchMyVendors();
      let loadedVendors: BackendVendor[] = [];
      if (vendorsRes.success && Array.isArray(vendorsRes.data)) {
        loadedVendors = vendorsRes.data;
        setVendors(loadedVendors);
      }

      const [bookingsRes, monthlyRes] = await Promise.all([
        bookingService.fetchAllBookings(),
        bookingService.fetchAllBookingsMonth(),
      ]);

      const bookingMap = new Map<string, any>();
      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        bookingsRes.data.forEach((item: any) => {
          const key = (item.startDate || item.bookingType === 'month' ? 'bm_' : 'bk_') + item.id;
          bookingMap.set(key, item);
        });
      }
      if (monthlyRes.success && Array.isArray(monthlyRes.data)) {
        monthlyRes.data.forEach((item: any) => {
          const key = 'bm_' + item.id;
          bookingMap.set(key, item);
        });
      }
      setBookings(Array.from(bookingMap.values()));

      const sportsRes = await vendorService.getSportTypes();
      if (sportsRes.success && Array.isArray(sportsRes.data)) {
        setSportTypes(sportsRes.data);
      }

      const typesRes = await vendorService.getYardTypes();
      if (typesRes.success && Array.isArray(typesRes.data)) {
        setYardTypes(typesRes.data);
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi tải dữ liệu từ máy chủ Backend.');
    } finally {
      setIsLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const activeVendors = useMemo(
    () => vendors.filter((v) => String(v.status || '').toLowerCase() === 'active'),
    [vendors]
  );

  const activeVendorsList = useMemo(
    () => activeVendors.map((v) => ({ id: v.id, vendorName: v.vendorName })),
    [activeVendors]
  );

  const activeVendorIdsStr = useMemo(
    () => activeVendors.map((v) => v.id).join(','),
    [activeVendors]
  );

  const loadYards = useCallback(async () => {
    setIsLoadingYards(true);
    try {
      if (selectedVendor) {
        const res = await vendorService.getYardsByVendor(selectedVendor.id);
        if (res.success && Array.isArray(res.data)) {
          setYards(res.data);
        } else {
          setYards([]);
        }
      } else {
        const ids = activeVendorIdsStr ? activeVendorIdsStr.split(',').map(Number).filter(Boolean) : [];
        if (ids.length === 0) {
          setYards([]);
          return;
        }
        const yardPromises = ids.map((id) => vendorService.getYardsByVendor(id));
        const results = await Promise.all(yardPromises);
        let combinedYards: BackendYardItem[] = [];
        results.forEach((res) => {
          if (res.success && Array.isArray(res.data)) {
            combinedYards = combinedYards.concat(res.data);
          }
        });
        setYards(combinedYards);
      }
    } catch {
      setYards([]);
    } finally {
      setIsLoadingYards(false);
    }
  }, [selectedVendor?.id, activeVendorIdsStr]);

  useEffect(() => {
    loadYards();
  }, [loadYards]);


  const refreshRealtimeData = useCallback(async () => {
    try {
      const [bookingsRes, monthlyRes] = await Promise.all([
        bookingService.fetchAllBookings(),
        bookingService.fetchAllBookingsMonth(),
      ]);

      const bookingMap = new Map<string, any>();
      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        bookingsRes.data.forEach((item: any) => {
          const key = (item.startDate || item.bookingType === 'month' ? 'bm_' : 'bk_') + item.id;
          bookingMap.set(key, item);
        });
      }
      if (monthlyRes.success && Array.isArray(monthlyRes.data)) {
        monthlyRes.data.forEach((item: any) => {
          const key = 'bm_' + item.id;
          bookingMap.set(key, item);
        });
      }
      if (bookingMap.size > 0 || (bookingsRes.success && monthlyRes.success)) {
        setBookings(Array.from(bookingMap.values()));
      }

      if (selectedVendor) {
        const res = await vendorService.getYardsByVendor(selectedVendor.id);
        if (res.success && Array.isArray(res.data)) {
          setYards(res.data);
        }
      } else {
        const ids = activeVendorIdsStr ? activeVendorIdsStr.split(',').map(Number).filter(Boolean) : [];
        if (ids.length > 0) {
          const yardPromises = ids.map((id) => vendorService.getYardsByVendor(id));
          const results = await Promise.all(yardPromises);
          let combinedYards: BackendYardItem[] = [];
          results.forEach((res) => {
            if (res.success && Array.isArray(res.data)) {
              combinedYards = combinedYards.concat(res.data);
            }
          });
          if (combinedYards.length > 0) {
            setYards(combinedYards);
          }
        }
      }
    } catch {
    }
  }, [selectedVendor?.id, activeVendorIdsStr]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshRealtimeData();
    }, 20000);

    return () => clearInterval(intervalId);
  }, [refreshRealtimeData]);

  const activeVendorIds = useMemo(
    () => new Set(activeVendors.map((v) => Number(v.id))),
    [activeVendors]
  );

  const myBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bVendorId = b.yard?.vendor?.id || (b as any).yard?.vendor_id || (b as any).vendorId;
      if (bVendorId) {
        return activeVendorIds.has(Number(bVendorId));
      }
      const bYardId = b.yard?.id || (b as any).yardId || (b as any).yard_id;
      if (bYardId) {
        return yards.some((y) => Number(y.id) === Number(bYardId));
      }
      return true;
    });
  }, [bookings, activeVendorIds, yards]);

  const displayBookings = useMemo(() => {
    return myBookings.filter((b) => {
      if (!selectedVendor) return true;
      const bVendorId = b.yard?.vendor?.id || (b as any).yard?.vendor_id || (b as any).vendorId;
      if (bVendorId) return Number(bVendorId) === Number(selectedVendor.id);
      const bYardId = b.yard?.id || (b as any).yardId || (b as any).yard_id;
      if (bYardId) {
        return yards.some((y) => Number(y.id) === Number(bYardId));
      }
      return true;
    });
  }, [myBookings, selectedVendor, yards]);

  const vendorRevenues: Record<number, number> = {};
  myBookings.forEach((b) => {
    const isPaid = String(b.status || '').toLowerCase() === 'paid';
    const bVendorId = b.yard?.vendor?.id ? Number(b.yard.vendor.id) : null;

    if (isPaid && bVendorId !== null) {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      const calcHours = hours > 0 ? hours : 1;
      const amount = b.priced && Number(b.priced) > 0
        ? Number(b.priced)
        : Math.round(calcHours * Number(b.yard?.price || 0));

      vendorRevenues[bVendorId] = (vendorRevenues[bVendorId] || 0) + amount;
    }
  });

  let totalYardsCount = 0;
  activeVendors.forEach((v) => {
    totalYardsCount += v.yards?.length || 0;
  });

  const currentYardsCount = selectedVendor ? yards.length : totalYardsCount;
  const currentBookingsCount = selectedVendor ? displayBookings.length : myBookings.length;
  const currentRefundsCount = (selectedVendor ? displayBookings : myBookings).filter(
    (b) => String(b.status || '').toLowerCase().trim() === 'refunded' || String(b.status || '').toLowerCase().trim() === 'cancelled',
  ).length;

  const handleDeleteYardConfirm = async () => {
    if (!deletingYard) return;
    setIsDeletingYard(true);
    try {
      const res = await vendorService.deleteYard(deletingYard.id);
      if (res.success) {
        toast.success(`Đã xóa sân "${deletingYard.yardName}" thành công!`);
        setDeletingYard(null);
        loadYards();
        loadInitialData();
      } else {
        toast.error(res.message || 'Xóa sân không thành công.');
      }
    } catch {
      toast.error('Lỗi kết nối API khi xóa sân.');
    } finally {
      setIsDeletingYard(false);
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#F2F0EB] text-[#1E3932] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col lg:flex-row">
        <VendorSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          vendorsCount={activeVendors.length}
          yardsCount={currentYardsCount}
          bookingsCount={currentBookingsCount}
          refundsCount={currentRefundsCount}
          onLogout={onLogout}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-screen">
          <header className="bg-white border-b border-[#E6E2D8] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-[#E6E2D8] bg-[#F8F7F4] text-[#1E3932] hover:bg-[#F2F0EB] transition-colors cursor-pointer shrink-0"
                aria-label="Mở menu quản trị"
              >
                <Menu className="w-5 h-5 text-[#1E3932]" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E3932] tracking-tight">
                  {activeTab === 'dashboard' && 'Dashboard Overview'}
                  {activeTab === 'vendors' && (vendorSubTab === 'design' ? 'Hồ Sơ & Giao Diện Cụm Sân' : 'Quản Lý Cụm Sân Thể Thao')}
                  {activeTab === 'yards' && 'Quản Lý Sân Con'}
                  {activeTab === 'bookings' && 'Danh Sách Đơn Đặt Sân'}
                  {activeTab === 'refunds' && 'Đơn Huỷ & Hoàn Tiền'}
                  {activeTab === 'analytics' && 'Báo Cáo Doanh Thu & Thống Kê'}
                </h2>
                <p className="text-xs text-[#6F7E72] font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {activeTab === 'vendors' && vendorSubTab === 'design'
                    ? 'Chỉnh sửa hình ảnh đại diện, thông tin thương hiệu và xem trước trực quan 1:1 giao diện hiển thị cho người chơi.'
                    : activeTab === 'refunds'
                      ? 'Báo cáo chi tiết và đầy đủ các đơn đặt sân đã được hoàn tiền hoặc bị hủy.'
                      : 'Chào mừng trở lại! Đây là tổng quan hoạt động kinh doanh cụm sân của bạn hôm nay.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {activeVendors.length > 0 && (
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả Cụm sân' },
                    ...activeVendors.map((v) => ({
                      value: v.id,
                      label: v.vendorName,
                    })),
                  ]}
                  value={selectedVendor ? selectedVendor.id : 'all'}
                  onChange={(val) => {
                    if (String(val) === 'all') {
                      setSelectedVendor(null);
                    } else {
                      const found = activeVendors.find((v) => String(v.id) === String(val));
                      setSelectedVendor(found || null);
                    }
                  }}
                  prefixLabel="Cụm:"
                  icon={<Building2 className="w-4 h-4 text-[#006241] shrink-0" />}
                />
              )}
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <VendorStatsOverview
                  vendors={activeVendors}
                  yards={yards}
                  bookings={displayBookings}
                  selectedVendor={selectedVendor}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <RevenueChartPanel selectedVendor={selectedVendor} bookings={displayBookings} />
                  </div>
                  <div>
                    <QuickAccessPanel
                      onAddVendor={() => {
                        setEditingSubVendor(null);
                        setIsSubVendorModalOpen(true);
                      }}
                      onAddYard={() => {
                        setEditingYard(null);
                        setYardModalTab('info');
                        setIsYardModalOpen(true);
                      }}
                      onViewBookings={() => setActiveTab('bookings')}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E6E2D8] shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-extrabold text-[#1E3932]">Đơn Đặt Sân Gần Đây</h3>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs font-bold text-[#006241] hover:underline"
                    >
                      Xem tất cả →
                    </button>
                  </div>
                  <RecentBookingsTable bookings={displayBookings.slice(0, 5)} />
                </div>
              </>
            )}

            {activeTab === 'vendors' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#E6E2D8] pb-3">
                  <button
                    onClick={() => setVendorSubTab('list')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${vendorSubTab === 'list'
                      ? 'bg-[#006241] text-white shadow-sm'
                      : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                      }`}
                  >
                    Danh Sách Cụm Sân ({vendors.length})
                  </button>
                  <button
                    onClick={() => setVendorSubTab('design')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${vendorSubTab === 'design'
                      ? 'bg-[#006241] text-white shadow-sm'
                      : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                      }`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Hồ Sơ & Giao Diện Cụm Sân</span>
                  </button>
                </div>

                {vendorSubTab === 'list' ? (
                  <SubVendorList
                    vendors={vendors}
                    vendorRevenues={{}}
                    selectedVendor={selectedVendor}
                    onSelectVendor={setSelectedVendor}
                    onAddVendor={() => {
                      setEditingSubVendor(null);
                      setIsSubVendorModalOpen(true);
                    }}
                    onEditVendor={(vendor: BackendVendor) => {
                      setEditingSubVendor(vendor);
                      setIsSubVendorModalOpen(true);
                    }}
                  />
                ) : (
                  <VendorProfileDesignTab
                    vendors={activeVendors}
                    selectedVendor={selectedVendor}
                    yards={yards}
                    onSelectVendor={(v) => setSelectedVendor(v)}
                    onVendorUpdated={loadInitialData}
                  />
                )}
              </div>
            )}

            {activeTab === 'yards' && (
              <YardManagementTable
                selectedVendor={selectedVendor}
                yards={yards}
                bookings={displayBookings}
                isLoading={isLoadingYards}
                onAddYard={() => {
                  setEditingYard(null);
                  setYardModalTab('info');
                  setIsYardModalOpen(true);
                }}
                onEditYard={(yard, tab = 'info') => {
                  setEditingYard(yard);
                  setYardModalTab(tab);
                  setIsYardModalOpen(true);
                }}
                onDeleteYard={(yard) => setDeletingYard(yard)}
                onRefreshYards={loadYards}
              />
            )}

            {activeTab === 'bookings' && <RecentBookingsTable bookings={displayBookings} />}

            {activeTab === 'refunds' && <VendorRefundCancelledTab bookings={displayBookings} />}

            {activeTab === 'analytics' && (
              <RevenueAnalyticsDashboard
                selectedVendor={selectedVendor}
                activeVendors={activeVendors}
                onVendorChange={setSelectedVendor}
                yards={yards}
                bookings={bookings}
                sportTypes={sportTypes}
              />
            )}
          </div>
        </main>

        <SubVendorModal
          isOpen={isSubVendorModalOpen}
          editingVendor={editingSubVendor}
          onClose={() => setIsSubVendorModalOpen(false)}
          onSuccess={loadInitialData}
        />

        <YardModal
          isOpen={isYardModalOpen}
          vendorId={selectedVendor ? selectedVendor.id : (activeVendors.length > 0 ? activeVendors[0].id : 0)}
          vendorsList={activeVendorsList}
          editingYard={editingYard}
          sportTypes={sportTypes}
          yardTypes={yardTypes}
          initialTab={yardModalTab}
          onClose={() => setIsYardModalOpen(false)}
          onSuccess={() => {
            loadYards();
            loadInitialData();
          }}
        />

        {deletingYard && createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-md rounded-[28px] shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[#1E3932]">Xác Nhận Xóa Sân</h3>
                <p className="text-xs text-[#6F7E72] mt-1">
                  Bạn có chắc chắn muốn xóa sân <strong className="text-rose-600 font-bold">&quot;{deletingYard.yardName}&quot;</strong> khỏi hệ thống? THAO TÁC này không thể hoàn tác.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setDeletingYard(null)}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] hover:bg-[#E6E2D8] font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  onClick={handleDeleteYardConfirm}
                  disabled={isDeletingYard}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeletingYard ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Xóa Vĩnh Viễn</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};
