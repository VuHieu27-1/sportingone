import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Store,
  Calendar,
  Filter,
  Eye,
  CreditCard,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { bookingService, BackendBooking } from '../../services/bookingService';
import { AdminTransactionDetailModal } from './AdminTransactionDetailModal';
import toast from 'react-hot-toast';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';

export const AdminTransactionsTab: React.FC = () => {
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'refund' | 'cancelled' | 'unpaid'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');

  // Time Filter state
  const [timeFilter, setTimeFilterState] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('time');
      if (urlVal && ['all', 'today', '7days', '30days', 'custom'].includes(urlVal)) {
        return urlVal as any;
      }
      const saved = sessionStorage.getItem('sporting_admin_tx_time_filter');
      if (saved && ['all', 'today', '7days', '30days', 'custom'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'all';
  });

  const setTimeFilter = (val: 'all' | 'today' | '7days' | '30days' | 'custom') => {
    setTimeFilterState(val);
    try {
      sessionStorage.setItem('sporting_admin_tx_time_filter', val);
      const url = new URL(window.location.href);
      if (val === 'all') {
        url.searchParams.delete('time');
      } else {
        url.searchParams.set('time', val);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const [startDate, setStartDateState] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('start') || sessionStorage.getItem('sporting_admin_tx_start_date') || '';
    } catch {}
    return '';
  });

  const setStartDate = (val: string) => {
    setStartDateState(val);
    try {
      if (val) sessionStorage.setItem('sporting_admin_tx_start_date', val);
      else sessionStorage.removeItem('sporting_admin_tx_start_date');
      const url = new URL(window.location.href);
      if (!val) url.searchParams.delete('start');
      else url.searchParams.set('start', val);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const [endDate, setEndDateState] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('end') || sessionStorage.getItem('sporting_admin_tx_end_date') || '';
    } catch {}
    return '';
  });

  const setEndDate = (val: string) => {
    setEndDateState(val);
    try {
      if (val) sessionStorage.setItem('sporting_admin_tx_end_date', val);
      else sessionStorage.removeItem('sporting_admin_tx_end_date');
      const url = new URL(window.location.href);
      if (!val) url.searchParams.delete('end');
      else url.searchParams.set('end', val);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };



  // Detail Modal state
  const [selectedBooking, setSelectedBooking] = useState<BackendBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  /**
   * Loads all bookings from Backend API
   */
  const loadBookings = useCallback(async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await bookingService.fetchAllBookings();
      if (res.success && Array.isArray(res.data)) {
        setBookings(res.data);
        if (showToast) {
          toast.success(`Đã cập nhật ${res.data.length} đơn giao dịch mới nhất!`);
        }
      } else {
        setErrorMsg(res.message || 'Không thể lấy dữ liệu giao dịch.');
        if (showToast) toast.error(res.message || 'Lỗi khi tải dữ liệu giao dịch.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến Backend API server.');
      if (showToast) toast.error('Lỗi kết nối máy chủ backend!');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Calculated Stats
  const stats = useMemo(() => {
    const paidList = bookings.filter((b) => (b.status || '').toLowerCase() === 'paid');

    const totalRevenue = paidList.reduce((sum, b) => {
      if (b.priced) return sum + Number(b.priced);
      const s = new Date(b.startTime).getTime();
      const e = new Date(b.endTime).getTime();
      const durationHours = (!isNaN(s) && !isNaN(e) && e > s) ? (e - s) / (1000 * 60 * 60) : 1;
      const price = Number(b.yard?.price || 0);
      return sum + (price * durationHours);
    }, 0);

    const uniqueUsers = new Set(
      bookings.map((b) => b.user?.id || b.user?.username).filter(Boolean)
    ).size;

    const uniqueVendors = new Set(
      bookings.map((b) => b.yard?.vendor?.id || b.yard?.vendor?.vendorName).filter(Boolean)
    ).size;

    return {
      totalTransactions: bookings.length,
      paidCount: paidList.length,
      totalRevenue,
      uniqueUsers,
      uniqueVendors,
    };
  }, [bookings]);

  // Filtered & Sorted bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((b) => (b.status || '').toLowerCase() === statusFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let startBoundary: Date | null = null;
      let endBoundary: Date | null = null;

      if (timeFilter === 'today') {
        startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (timeFilter === '7days') {
        startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
        endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (timeFilter === '30days') {
        startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
        endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (timeFilter === 'custom') {
        if (startDate) {
          startBoundary = new Date(startDate + 'T00:00:00');
        }
        if (endDate) {
          endBoundary = new Date(endDate + 'T23:59:59');
        }
      }

      result = result.filter((b) => {
        const bDate = new Date(b.createdAt || b.startTime);
        if (isNaN(bDate.getTime())) return true;
        if (startBoundary && bDate < startBoundary) return false;
        if (endBoundary && bDate > endBoundary) return false;
        return true;
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((b) => {
        const idMatch = `#bk-${b.id}`.includes(q) || String(b.id).includes(q);
        const usernameMatch = b.user?.username?.toLowerCase().includes(q);
        const emailMatch = b.user?.email?.toLowerCase().includes(q);
        const vendorMatch = b.yard?.vendor?.vendorName?.toLowerCase().includes(q);
        const yardMatch = b.yard?.yardName?.toLowerCase().includes(q);
        return idMatch || usernameMatch || emailMatch || vendorMatch || yardMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = Number(a.priced || a.yard?.price || 0);
      const priceB = Number(b.priced || b.yard?.price || 0);

      switch (sortBy) {
        case 'oldest':
          return a.id - b.id;
        case 'price_desc':
          return priceB - priceA;
        case 'price_asc':
          return priceA - priceB;
        case 'newest':
        default:
          return b.id - a.id;
      }
    });

    return result;
  }, [bookings, statusFilter, timeFilter, startDate, endDate, searchTerm, sortBy]);

  const formatTimeSlot = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 'N/A';
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'N/A';
    const startTime = s.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endTime = e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${startTime} - ${endTime} (${date})`;
  };

  const getDurationHours = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 1;
    return Math.max(0.5, Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10);
  };

  const renderStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-[#006241] border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã thanh toán
          </span>
        );
      case 'refund':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
            Đang hoàn tiền
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn tiền
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            <XCircle className="w-3.5 h-3.5" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gray-50 text-gray-700 border border-gray-200 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            Chờ xử lý
          </span>
        );
    }
  };

  const openDetailModal = (b: BackendBooking) => {
    setSelectedBooking(b);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner & Title */}
      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006241]/10 text-[#006241] flex items-center justify-center border border-[#006241]/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-[#1E3932]">
              Nhật Ký Giao Dịch &amp; Kiểm Toán Dòng Tiền
            </h2>
          </div>
          <p className="text-xs text-[#6F7E72] font-medium mt-1">
            Theo dõi chi tiết các giao dịch thanh toán thuê sân giữa khách hàng và các chủ sân (Vendor).
          </p>
        </div>

        <button
          onClick={() => loadBookings(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-[#006241] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Đang cập nhật...' : 'Tải lại dữ liệu'}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total System Transactions */}
        <div className="p-5 rounded-[24px] bg-linear-to-br from-[#006241] to-[#1E3932] text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-24 h-24 bg-white/10 rounded-full blur-xs pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Tổng Giao Dịch Hệ Thống
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 tracking-tight">
            {stats.totalTransactions} <span className="text-sm font-semibold text-emerald-200">đơn</span>
          </div>
          <p className="text-[11px] text-emerald-100/80 mt-1 font-medium">
            Ghi nhận kiểm toán từ Database
          </p>
        </div>

        {/* Paid Bookings Count */}
        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
              Đơn Đã Thanh Toán
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#006241] flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E3932] mt-2">
            {stats.paidCount} <span className="text-xs font-normal text-[#6F7E72]">/ {stats.totalTransactions} đơn</span>
          </div>
          <p className="text-[11px] text-[#6F7E72] mt-1 font-medium">
            Đơn đặt sân thanh toán thành công
          </p>
        </div>

        {/* Active Customers */}
        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
              Khách Hàng Đặt Sân
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E3932] mt-2">
            {stats.uniqueUsers} <span className="text-xs font-normal text-[#6F7E72]">tài khoản</span>
          </div>
          <p className="text-[11px] text-[#6F7E72] mt-1 font-medium">
            Tài khoản khách hàng giao dịch
          </p>
        </div>

        {/* Active Vendors */}
        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6F7E72]">
              Vendor Nhận Đơn
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E3932] mt-2">
            {stats.uniqueVendors} <span className="text-xs font-normal text-[#6F7E72]">chủ sân</span>
          </div>
          <p className="text-[11px] text-[#6F7E72] mt-1 font-medium">
            Chủ sân sở hữu sân được đặt
          </p>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-[24px] bg-white border border-[#E6E2D8] shadow-2xs space-y-3">
        {/* Row 1: Search + Status Filter + Sort Selector */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6F7E72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã đơn (#BK-...), Khách hàng, Vendor, Tên sân..."
              className="w-full h-10 pl-10 pr-8 rounded-xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] font-medium placeholder-[#6F7E72]/70 focus:outline-none focus:ring-2 focus:ring-[#006241] focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6F7E72] hover:text-[#1E3932] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Time Filter Pills & Custom Inputs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-3 border-t border-[#F2F0EB]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#6F7E72] flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#006241]" />
              Thời gian:
            </span>

            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'today', label: 'Hôm nay' },
              { key: '7days', label: '7 ngày qua' },
              { key: '30days', label: '30 ngày qua' },
              { key: 'custom', label: 'Tùy chọn...' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeFilter(item.key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${timeFilter === item.key
                    ? 'bg-[#006241] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#6F7E72] hover:text-[#1E3932] border border-[#E6E2D8]'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#E6E2D8] shrink-0">
              <span className="text-[#6F7E72] font-bold">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-0.5 rounded-lg bg-white border border-[#E6E2D8] text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-1 focus:ring-[#006241]"
              />
              <span className="text-[#6F7E72] font-bold">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-0.5 rounded-lg bg-white border border-[#E6E2D8] text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-1 focus:ring-[#006241]"
              />
            </div>
          )}

          {/* Reset Filters button if active */}
          {(statusFilter !== 'paid' || timeFilter !== 'all' || searchTerm || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter('paid');
                setTimeFilter('all');
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setSortBy('newest');
              }}
              className="text-xs font-bold text-[#006241] hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-auto md:ml-0"
            >
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Content List */}
      <div className="bg-white rounded-[28px] border border-[#E6E2D8] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#006241] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#6F7E72]">Đang tải dữ liệu giao dịch từ server...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center space-y-3">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-extrabold text-[#1E3932]">{errorMsg}</h3>
            <button
              onClick={() => loadBookings()}
              className="px-4 py-2 rounded-xl bg-[#006241] text-white text-xs font-bold cursor-pointer hover:bg-[#004d33] transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-[#6F7E72]/50 mx-auto" />
            <h3 className="text-base font-extrabold text-[#1E3932]">Không tìm thấy giao dịch phù hợp</h3>
            <p className="text-xs text-[#6F7E72] max-w-sm mx-auto">
              Không có dữ liệu giao dịch đặt sân nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <AdminTransactionsDataTable
            filteredBookings={filteredBookings}
            openDetailModal={openDetailModal}
          />
        )}
      </div>

      {/* Detail Modal */}
      <AdminTransactionDetailModal
        isOpen={isModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
};

const AdminTransactionsDataTable: React.FC<{
  filteredBookings: BackendBooking[];
  openDetailModal: (booking: BackendBooking) => void;
}> = ({ filteredBookings, openDetailModal }) => {
  const {
    paginatedData,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    sortField,
    sortDirection,
    columnFilters,
    setCurrentPage,
    setPageSize,
    setColumnFilter,
    handleSort,
  } = useDataTable<BackendBooking>({
    data: filteredBookings,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: ['id', (b) => `#BK-${b.id}`, 'priced', (b) => b.user?.username || '', (b) => b.yard?.yardName || '', (b) => b.yard?.vendor?.vendorName || ''],
    sortAccessors: {
      user: (b) => b.user?.username || '',
      yard: (b) => b.yard?.yardName || '',
      priced: (b) => Number(b.priced || b.yard?.price || 0),
    },
    storageKey: 'sporting_admin_transactions_page_size',
  });

  const getDurationHours = (start?: string, end?: string): number => {
    if (!start || !end) return 1;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(1, Math.round(diff / 60));
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'completed' || s === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Thành công
        </span>
      );
    }
    if (s === 'refund') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Đang hoàn tiền
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-200">
          <CheckCircle2 className="w-3 h-3 text-purple-600" />
          Đã hoàn tiền
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-600" />
        Đã hủy
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6E2D8] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[11px] font-black text-[#6F7E72] uppercase tracking-wider">
              <DataTableHeader
                label="Mã Đơn"
                field="id"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader
                label="Khách Hàng (User)"
                field="user"
                sortable={false}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader
                label="Chủ Sân & Sân"
                field="yard"
                sortable={false}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader
                label="Khung Giờ Đặt"
                field="startTime"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader
                label="Số Tiền (Xu)"
                field="priced"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader
                label="Trạng Thái"
                field="status"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="py-3.5 px-4 font-bold"
              />
              <DataTableHeader label="Thao Tác" align="right" sortable={false} className="py-3.5 px-4 font-bold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F0EB] text-xs text-[#1E3932]">
            {paginatedData.map((b) => {
              const isMonthly = (b as any).itemType === 'monthly' || Boolean((b as any).startDate);
              const durationHours = getDurationHours(b.startTime, b.endTime);
              const priceAmount = Number(b.priced || 0);

              return (
                <tr
                  key={`${isMonthly ? 'bm' : 'bk'}-${b.id}`}
                  className="hover:bg-[#FAF8F5]/80 transition-colors group"
                >
                  <td className="py-4 px-4 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[#006241]">
                        {isMonthly ? `#BM-${b.id}` : `#BK-${b.id}`}
                      </span>
                      {isMonthly && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                          Gói Tháng
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#006241]/10 text-[#006241] font-bold text-xs flex items-center justify-center border border-[#006241]/20 shrink-0">
                        {b.user?.username ? b.user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="truncate max-w-[150px]">
                        <div className="font-extrabold text-[#1E3932] truncate">
                          {b.user?.username || `User #${b.user?.id || 'N/A'}`}
                        </div>
                        <div className="text-[11px] text-[#6F7E72] truncate">
                          {b.user?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="space-y-0.5 max-w-[200px] truncate">
                      <div className="font-bold text-[#1E3932] flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                        <span className="truncate">{b.yard?.yardName || `Sân #${b.yard?.id || 'N/A'}`}</span>
                      </div>
                      <div className="text-[11px] text-[#6F7E72] flex items-center gap-1 truncate">
                        <Store className="w-3 h-3 text-[#6F7E72] shrink-0" />
                        <span className="truncate">{b.yard?.vendor?.vendorName || 'Chưa rõ vendor'}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-semibold text-[#1E3932] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#006241]" />
                      <span>
                        {isMonthly
                          ? `Từ ${String((b as any).startDate).split('T')[0]} đến ${String((b as any).endDate).split('T')[0]}`
                          : b.startTime ? new Date(b.startTime).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6F7E72] mt-0.5 font-medium">
                      {isMonthly
                        ? `${(b as any).startTime} - ${(b as any).endTime} hàng ngày`
                        : `${b.startTime || ''} - ${b.endTime || ''} (${durationHours} giờ)`}
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-black text-[#006241] text-sm flex items-center gap-1">
                      <CreditCard className="w-4 h-4 text-[#006241]" />
                      <span>{priceAmount.toLocaleString('vi-VN')} Xu</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    {renderStatusBadge(b.status)}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openDetailModal(b)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#006241] text-[#006241] hover:text-white border border-[#E6E2D8] hover:border-[#006241] text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemLabel="giao dịch"
      />
    </div>
  );
};

