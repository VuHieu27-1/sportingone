import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Coins, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { bookingService, BackendBooking } from '../services/bookingService';
import { DashboardNavbar } from '../component/user/DashboardNavbar';
import { DashboardFooter } from '../component/user/DashboardFooter';
import { CartItemList } from '../component/cart/CartItemList';
import { CheckoutSummary } from '../component/cart/CheckoutSummary';
import { CartGuaranteeBanner } from '../component/cart/CartGuaranteeBanner';
import { ConfirmModal } from '../component/common/ConfirmModal';
import { PaymentSuccessModal, PaidBookingQrItem } from '../component/cart/PaymentSuccessModal';
import { PayOSPaymentModal } from '../component/cart/PayOSPaymentModal';
import { BookingDetailQrModal } from '../component/cart/BookingDetailQrModal';
import { YardRatingModal } from '../component/rating/YardRatingModal';
import { payosService, PayOSCreatePaymentData } from '../services/payosService';
import { walletService } from '../services/walletService';
import { formatTimeAMPM } from '../utils/dateUtils';

interface CartCheckoutPageProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const CartCheckoutPage: React.FC<CartCheckoutPageProps> = ({
  currentUser,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [activeStatusTab, setActiveStatusTabState] = useState<'ALL' | 'unpaid' | 'paid' | 'refunded' | 'cancelled'>('unpaid');

  const setActiveStatusTab = (tab: 'ALL' | 'unpaid' | 'paid' | 'refunded' | 'cancelled') => {
    setActiveStatusTabState(tab);
    if (tab === 'unpaid') {
      const unpaid = bookings.filter((b) => (b.status || 'unpaid') === 'unpaid');
      setSelectedBookingIds(unpaid.map((b) => b.id));
    } else {
      setSelectedBookingIds([]);
    }
  };
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [selectedQrBooking, setSelectedQrBooking] = useState<BackendBooking | null>(null);
  const [selectedRatingBooking, setSelectedRatingBooking] = useState<BackendBooking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'WALLET'>('PAYOS');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [singlePayModal, setSinglePayModal] = useState<{
    isOpen: boolean;
    booking: BackendBooking | null;
    method: 'PAYOS' | 'WALLET';
  }>({
    isOpen: false,
    booking: null,
    method: 'PAYOS',
  });

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    count: number;
    amount?: number;
    message?: string;
    paidBookings?: PaidBookingQrItem[];
  }>({
    isOpen: false,
    count: 0,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const [payOSModal, setPayOSModal] = useState<{
    isOpen: boolean;
    paymentData: PayOSCreatePaymentData | null;
    booking: BackendBooking | null;
    selectedBookings?: BackendBooking[];
  }>({
    isOpen: false,
    paymentData: null,
    booking: null,
  });

  const [activePayOSMap, setActivePayOSMap] = useState<Record<number, PayOSCreatePaymentData>>({});
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resDaily, resMonthly] = await Promise.all([
        bookingService.fetchMyBookings(),
        bookingService.fetchMyBookingsMonth(),
      ]);

      const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
        ...b,
        itemType: 'hourly',
      }));
      const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
        ...bm,
        itemType: 'monthly',
      }));

      const combinedMap = new Map<string, any>();
      dailyList.forEach((b) => combinedMap.set(`hourly_${b.id}`, b));
      monthlyList.forEach((bm) => combinedMap.set(`monthly_${bm.id}`, bm));
      const combined = Array.from(combinedMap.values());

      combined.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.startTime || a.startDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.startTime || b.startDate || 0).getTime();
        return timeB - timeA;
      });

      setBookings(combined as any);
      const unpaid = combined.filter((b: any) => (b.status || 'unpaid') === 'unpaid');
      setSelectedBookingIds(unpaid.map((b: any) => b.id));
    } catch {
      toast.error('Lỗi kết nối máy chủ API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletService.getMyWallet();
      if (res.success && res.data) {
        setWalletBalance(Number(res.data.balance || 0));
      }
    } catch {
      setWalletBalance(0);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchWallet();
  }, [fetchBookings, fetchWallet]);

  /**
   * Handles event processing for handleDeleteSingle (Soft Delete via API).
   */
  const handleDeleteSingle = (bookingId: number) => {
    const targetItem = bookings.find((b) => b.id === bookingId);
    const isMonth = (targetItem as any)?.itemType === 'monthly' || Boolean((targetItem as any)?.startDate);

    setConfirmModal({
      isOpen: true,
      title: isMonth ? 'Xóa Gói Đặt Sân Theo Tháng' : 'Xóa Đơn Đặt Sân',
      message: 'Bạn có chắc chắn muốn xóa mục này khỏi giỏ hàng? (Dữ liệu sẽ được lưu trữ an toàn trên hệ thống).',
      type: 'warning',
      confirmText: 'Xóa Đơn',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          const res = isMonth
            ? await bookingService.deleteBookingsMonth(bookingId)
            : await bookingService.deleteBooking(bookingId);
          if (res.success) {
            toast.success('Đã xóa thành công.');
            setSelectedBookingIds((prev) => prev.filter((id) => id !== bookingId));
            await fetchBookings();
          } else {
            toast.error(res.message || 'Không thể xóa đơn.');
          }
        } catch {
          toast.error('Lỗi khi thực hiện xóa.');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const visibleBookings = bookings;

  /**
   * Handles event processing for handleToggleSelect.
   */
  const handleToggleSelect = (bookingId: number) => {
    setSelectedBookingIds((prev) =>
      prev.includes(bookingId) ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]
    );
  };

  const unpaidBookings = visibleBookings.filter((b) => (b.status || 'unpaid') === 'unpaid');

  /**
   * Handles event processing for handleToggleSelectAll across all tabs.
   */
  const handleToggleSelectAll = () => {
    const currentFiltered = bookings.filter((b) => {
      if (activeStatusTab === 'ALL') return true;
      return (b.status || 'unpaid') === activeStatusTab;
    });
    const currentIds = currentFiltered.map((b) => b.id);
    const isAllSelected = currentIds.length > 0 && currentIds.every((id) => selectedBookingIds.includes(id));
    if (isAllSelected) {
      setSelectedBookingIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setSelectedBookingIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  /**
   * Handles batch deletion (soft delete) of selected bookings in non-unpaid tabs.
   */
  const handleBatchDelete = () => {
    const currentFiltered = bookings.filter((b) => {
      if (activeStatusTab === 'ALL') return true;
      return (b.status || 'unpaid') === activeStatusTab;
    });
    const selectedInTab = currentFiltered.filter((b) => selectedBookingIds.includes(b.id));

    if (selectedInTab.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn đặt sân để xóa.', { id: 'select-delete-required' });
      return;
    }

    const count = selectedInTab.length;

    setConfirmModal({
      isOpen: true,
      title: `Xóa ${count} Đơn Đặt Sân Đã Chọn`,
      message: `Bạn có chắc chắn muốn xóa ${count} đơn đặt sân đã chọn khỏi danh sách? (Dữ liệu sẽ được lưu trữ an toàn trên hệ thống).`,
      type: 'warning',
      confirmText: `Xóa ${count} Đơn`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          const results = await Promise.all(
            selectedInTab.map((b) => {
              const isMonth = (b as any).itemType === 'monthly' || Boolean((b as any).startDate);
              return isMonth ? bookingService.deleteBookingsMonth(b.id) : bookingService.deleteBooking(b.id);
            })
          );
          const failed = results.find((r) => !r.success);
          if (failed) {
            toast.error(failed.message || 'Không thể xóa một số đơn đã chọn.');
          } else {
            toast.success(`Đã xóa thành công ${count} đơn đặt sân.`);
          }
          const targetIds = selectedInTab.map((b) => b.id);
          setSelectedBookingIds((prev) => prev.filter((id) => !targetIds.includes(id)));
          await fetchBookings();
        } catch {
          toast.error('Lỗi khi thực hiện xóa các đơn đã chọn.');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const selectedUnpaidBookings = visibleBookings.filter(
    (b) => (b.status || 'unpaid') === 'unpaid' && selectedBookingIds.includes(b.id)
  );

  const calculateItemPrice = (b: any): number => {
    if (b.priced && Number(b.priced) > 0) return Number(b.priced);
    if (b.itemType === 'monthly' || Boolean(b.startDate)) {
      return Number(b.priced || 0);
    }
    const price = Number(b.yard?.price || 0);
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    return price * durationHours;
  };

  const totalSelectedAmount =
    activeStatusTab === 'unpaid'
      ? selectedUnpaidBookings.reduce((sum, b) => sum + calculateItemPrice(b), 0)
      : 0;

  // Auto-select payment method based on wallet balance sufficiency
  useEffect(() => {
    if (totalSelectedAmount > 0) {
      if (walletBalance >= totalSelectedAmount) {
        setPaymentMethod('WALLET');
      } else {
        setPaymentMethod('PAYOS');
      }
    }
  }, [totalSelectedAmount, walletBalance]);

  /**
   * Opens the Single Payment Method Selection Modal when clicking pay on a single court.
   */
  const handlePaySingle = (bookingId: number) => {
    const targetItem = bookings.find((b) => b.id === bookingId);
    if (!targetItem) return;

    const totalAmount = calculateItemPrice(targetItem);
    const initialMethod = walletBalance >= totalAmount ? 'WALLET' : 'PAYOS';

    setSinglePayModal({
      isOpen: true,
      booking: targetItem,
      method: initialMethod,
    });
  };

  /**
   * Executes payment processing after user confirms payment method in singlePayModal.
   */
  const handleConfirmSinglePay = async () => {
    if (!singlePayModal.booking) return;
    const targetItem = singlePayModal.booking;
    const bookingId = targetItem.id;
    const isMonth = (targetItem as any).itemType === 'monthly' || Boolean((targetItem as any).startDate);
    const selectedMethod = singlePayModal.method;

    setSinglePayModal((prev) => ({ ...prev, isOpen: false }));

    const singleTotal = calculateItemPrice(targetItem);

    if (selectedMethod === 'WALLET') {
      if (walletBalance < singleTotal) {
        toast.error(`Số dư xu không đủ (${walletBalance.toLocaleString('vi-VN')} Xu < ${singleTotal.toLocaleString('vi-VN')} Xu). Vui lòng chọn PayOS hoặc Nạp thêm Xu!`);
        return;
      }

      setIsProcessing(true);
      try {
        const res = isMonth
          ? await bookingService.payBookingsMonthWithWallet([bookingId])
          : await bookingService.payWithWallet([bookingId]);

        if (res.success) {
          toast.success(res.message || 'Thanh toán sân thành công qua Xu ví!');
          if (res.data?.remainingBalance !== undefined) {
            setWalletBalance(res.data.remainingBalance);
          }
          setSelectedBookingIds((prev) => prev.filter((id) => id !== bookingId));

          const [resDaily, resMonthly] = await Promise.all([
            bookingService.fetchMyBookings(),
            bookingService.fetchMyBookingsMonth(),
          ]);

          const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
            ...b,
            itemType: 'hourly',
          }));
          const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
            ...bm,
            itemType: 'monthly',
          }));

          const combinedMap = new Map<string, any>();
          dailyList.forEach((b) => combinedMap.set(`hourly_${b.id}`, b));
          monthlyList.forEach((bm) => combinedMap.set(`monthly_${bm.id}`, bm));
          const combined = Array.from(combinedMap.values());

          combined.sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || a.startTime || a.startDate || 0).getTime();
            const timeB = new Date(b.createdAt || b.startTime || b.startDate || 0).getTime();
            return timeB - timeA;
          });

          setBookings(combined as any);
          await fetchWallet();

          const updatedPaidItem = combined.find((b: any) => b.id === bookingId && (isMonth ? b.itemType === 'monthly' : b.itemType === 'hourly')) || targetItem;

          const paidItem: PaidBookingQrItem = {
            id: updatedPaidItem.id,
            yardName: updatedPaidItem.yard?.yardName,
            vendorName: updatedPaidItem.yard?.vendor?.vendorName,
            startTime: isMonth
              ? `${(updatedPaidItem as any).startTime} (${(updatedPaidItem as any).startDate})`
              : new Date(updatedPaidItem.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedPaidItem.startTime).toLocaleDateString('vi-VN'),
            endTime: isMonth
              ? `${(updatedPaidItem as any).endTime} (${(updatedPaidItem as any).endDate})`
              : new Date(updatedPaidItem.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedPaidItem.endTime).toLocaleDateString('vi-VN'),
            priced: singleTotal,
            sig: updatedPaidItem.sig,
            verifyUrl: updatedPaidItem.verifyUrl,
            isMonth,
          } as any;

          setSuccessModal({
            isOpen: true,
            count: 1,
            amount: singleTotal,
            message: 'Đã thanh toán giữ lịch sân thành công bằng Xu trong Ví Account! Tiền thuê sân đã được chuyển trực tiếp cho chủ sân.',
            paidBookings: [paidItem],
          });
        } else {
          toast.error(res.message || 'Thanh toán bằng Xu thất bại.');
          await fetchBookings();
        }
      } catch (err: any) {
        toast.error(err?.message || 'Đã có lỗi xảy ra khi thanh toán bằng Xu.');
        await fetchBookings();
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (activePayOSMap[bookingId]) {
      setPayOSModal({
        isOpen: true,
        paymentData: activePayOSMap[bookingId],
        booking: targetItem,
        selectedBookings: [targetItem],
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await payosService.createPaymentLink({ bookingId: Number(bookingId) });
      if (res.success && res.data) {
        setActivePayOSMap((prev) => ({ ...prev, [bookingId]: res.data! }));
        setPayOSModal({
          isOpen: true,
          paymentData: res.data,
          booking: targetItem,
          selectedBookings: [targetItem],
        });
      } else {
        toast.error(res.message || 'Không thể tạo liên kết thanh toán PayOS.');
      }
    } catch {
      toast.error('Lỗi hệ thống khi tạo liên kết thanh toán PayOS.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles event processing for handleProcessRefund.
   */
  const handleProcessRefund = async (bookingId: number) => {
    const target = bookings.find((b) => b.id === bookingId);
    const isMonth = (target as any)?.itemType === 'monthly' || Boolean((target as any)?.startDate);

    setIsProcessing(true);
    try {
      const res = isMonth
        ? await bookingService.processRefundMonth(bookingId)
        : await bookingService.processRefund(bookingId);

      if (res.success) {
        toast.success(res.message || 'Đã hoàn Xu thành công vào ví tài khoản của bạn!');
        await fetchBookings();
        await fetchWallet();
      } else {
        toast.error(res.message || 'Không thể xử lý hoàn xu.');
      }
    } catch {
      toast.error('Lỗi hệ thống khi xử lý hoàn xu.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles event processing for handleBatchCheckout.
   */
  const handleBatchCheckout = async () => {
    if (selectedBookingIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sân chờ thanh toán.', { id: 'cart-select-toast' });
      return;
    }

    if (paymentMethod === 'WALLET') {
      if (walletBalance < totalSelectedAmount) {
        toast.error(`Số dư xu không đủ để thanh toán (${walletBalance.toLocaleString('vi-VN')} Xu < ${totalSelectedAmount.toLocaleString('vi-VN')} Xu). Vui lòng chọn PayOS hoặc Nạp thêm Xu!`);
        return;
      }

      setIsProcessing(true);
      try {
        const selectedList = visibleBookings.filter((b) => selectedBookingIds.includes(b.id));
        const dailyIds = selectedList
          .filter((b) => (b as any).itemType !== 'monthly' && !(b as any).startDate)
          .map((b) => b.id);
        const monthIds = selectedList
          .filter((b) => (b as any).itemType === 'monthly' || Boolean((b as any).startDate))
          .map((b) => b.id);

        if (dailyIds.length > 0) {
          const res = await bookingService.payWithWallet(dailyIds);
          if (!res.success) {
            toast.error(res.message || 'Thanh toán đơn theo giờ thất bại.');
          }
        }
        if (monthIds.length > 0) {
          const res = await bookingService.payBookingsMonthWithWallet(monthIds);
          if (!res.success) {
            toast.error(res.message || 'Thanh toán gói theo tháng thất bại.');
          }
        }

        toast.success('Thanh toán các đơn đã chọn qua Xu ví thành công!');
        setSelectedBookingIds([]);

        const [resDaily, resMonthly] = await Promise.all([
          bookingService.fetchMyBookings(),
          bookingService.fetchMyBookingsMonth(),
        ]);

        const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
          ...b,
          itemType: 'hourly',
        }));
        const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
          ...bm,
          itemType: 'monthly',
        }));

        const combinedMap = new Map<string, any>();
        dailyList.forEach((b) => combinedMap.set(`hourly_${b.id}`, b));
        monthlyList.forEach((bm) => combinedMap.set(`monthly_${bm.id}`, bm));
        const combined = Array.from(combinedMap.values());

        combined.sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || a.startTime || a.startDate || 0).getTime();
          const timeB = new Date(b.createdAt || b.startTime || b.startDate || 0).getTime();
          return timeB - timeA;
        });

        setBookings(combined as any);
        await fetchWallet();

        const paidList: PaidBookingQrItem[] = selectedList.map((b) => {
          const isMonth = (b as any).itemType === 'monthly' || Boolean((b as any).startDate);
          const updatedItem = combined.find((cb: any) => cb.id === b.id && (isMonth ? cb.itemType === 'monthly' : cb.itemType === 'hourly')) || b;
          return {
            id: updatedItem.id,
            yardName: updatedItem.yard?.yardName,
            vendorName: updatedItem.yard?.vendor?.vendorName,
            startTime: isMonth
              ? `${(updatedItem as any).startTime} (${(updatedItem as any).startDate})`
              : new Date(updatedItem.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedItem.startTime).toLocaleDateString('vi-VN'),
            endTime: isMonth
              ? `${(updatedItem as any).endTime} (${(updatedItem as any).endDate})`
              : new Date(updatedItem.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedItem.endTime).toLocaleDateString('vi-VN'),
            priced: calculateItemPrice(updatedItem),
            sig: updatedItem.sig,
            verifyUrl: updatedItem.verifyUrl,
            isMonth,
          } as any;
        });

        setSuccessModal({
          isOpen: true,
          count: selectedList.length,
          amount: totalSelectedAmount,
          message: 'Thanh toán thành công! Mã QR giữ lịch đã sẵn sàng và được gửi tự động tới Email của bạn.',
          paidBookings: paidList,
        });
      } catch (err: any) {
        toast.error(err?.message || 'Đã có lỗi xảy ra khi thanh toán bằng Xu.');
        await fetchBookings();
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (selectedBookingIds.length === 1) {
      await handlePaySingle(selectedBookingIds[0]);
      return;
    }

    const selectedItems = visibleBookings.filter((b) => selectedBookingIds.includes(b.id));
    if (selectedItems.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await payosService.createPaymentLink({ bookingIds: selectedBookingIds.map(Number) });
      if (res.success && res.data) {
        setPayOSModal({
          isOpen: true,
          paymentData: res.data,
          booking: selectedItems[0],
          selectedBookings: selectedItems,
        });
      } else {
        toast.error(res.message || 'Không thể tạo link thanh toán gộp PayOS.', { id: 'payos-create-toast' });
        await fetchBookings();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khởi tạo giao dịch thanh toán gộp PayOS.', { id: 'payos-create-toast' });
      await fetchBookings();
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles event processing for handlePayOSSuccess.
   */
  const handlePayOSSuccess = useCallback(async (targetBookingId?: number) => {
    const currentBooking = payOSModal.booking;
    const currentSelected = payOSModal.selectedBookings || (currentBooking ? [currentBooking] : []);
    const paidIds = currentSelected.length > 0
      ? currentSelected.map((b) => b.id)
      : (targetBookingId ? [targetBookingId] : [...selectedBookingIds]);

    setPayOSModal({ isOpen: false, paymentData: null, booking: null });
    setSelectedBookingIds([]);

    const [resDaily, resMonthly] = await Promise.all([
      bookingService.fetchMyBookings(),
      bookingService.fetchMyBookingsMonth(),
    ]);

    const dailyList = (resDaily.success && Array.isArray(resDaily.data) ? resDaily.data : []).map((b) => ({
      ...b,
      itemType: 'hourly',
    }));
    const monthlyList = (resMonthly.success && Array.isArray(resMonthly.data) ? resMonthly.data : []).map((bm) => ({
      ...bm,
      itemType: 'monthly',
    }));

    const combinedMap = new Map<string, any>();
    dailyList.forEach((b) => combinedMap.set(`hourly_${b.id}`, b));
    monthlyList.forEach((bm) => combinedMap.set(`monthly_${bm.id}`, bm));
    const combined = Array.from(combinedMap.values());

    combined.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || a.startTime || a.startDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.startTime || b.startDate || 0).getTime();
      return timeB - timeA;
    });

    setBookings(combined as any);
    await fetchWallet();

    const targetList = currentSelected.length > 0
      ? currentSelected
      : (paidIds.length > 0 ? combined.filter((b: any) => paidIds.includes(b.id)) : combined.slice(0, 1));

    let totalPaidAmount = 0;
    const paidList: PaidBookingQrItem[] = targetList.map((b: any) => {
      const isMonth = b.itemType === 'monthly' || Boolean(b.startDate);
      const updatedItem = combined.find((cb: any) => cb.id === b.id && (isMonth ? cb.itemType === 'monthly' : cb.itemType === 'hourly')) || b;
      const itemPrice = calculateItemPrice(updatedItem);
      totalPaidAmount += itemPrice;

      return {
        id: updatedItem.id,
        yardName: updatedItem.yard?.yardName,
        vendorName: updatedItem.yard?.vendor?.vendorName,
        startTime: isMonth
          ? `${updatedItem.startTime} (${updatedItem.startDate})`
          : new Date(updatedItem.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedItem.startTime).toLocaleDateString('vi-VN'),
        endTime: isMonth
          ? `${updatedItem.endTime} (${updatedItem.endDate})`
          : new Date(updatedItem.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(updatedItem.endTime).toLocaleDateString('vi-VN'),
        priced: itemPrice,
        sig: updatedItem.sig,
        verifyUrl: updatedItem.verifyUrl,
        isMonth,
      };
    });

    setSuccessModal({
      isOpen: true,
      count: paidList.length || 1,
      amount: totalPaidAmount > 0 ? totalPaidAmount : (payOSModal.paymentData?.amount || 0),
      message: 'Thanh toán qua PayOS thành công! Mã QR giữ lịch đã sẵn sàng và được gửi tự động tới Email của bạn.',
      paidBookings: paidList,
    });
  }, [payOSModal, selectedBookingIds, fetchWallet]);

  /**
   * Handles event processing for handleCancelPayOSLink.
   */
  const handleCancelPayOSLink = async (orderCode: number) => {
    try {
      await payosService.cancelPaymentLink(orderCode);
      toast.success('Đã hủy giao dịch thanh toán PayOS.', { id: 'payos-cancel-toast' });
    } catch {
    } finally {
      setPayOSModal({ isOpen: false, paymentData: null, booking: null });
      await fetchBookings();
    }
  };

  /**
   * Handles event processing for handleCancelSingle.
   */
  const handleCancelSingle = (bookingId: number) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    const isMonth = (targetBooking as any)?.itemType === 'monthly' || Boolean((targetBooking as any)?.startDate);

    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Hủy Đơn Đặt Sân',
      message: 'Bạn có chắc chắn muốn hủy đơn đặt sân này? Trạng thái đơn sẽ chuyển thành Đã Hủy.',
      type: 'danger',
      confirmText: 'Xác Nhận Hủy',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          const res = isMonth
            ? await bookingService.deleteBookingsMonth(bookingId)
            : await bookingService.cancelBooking(bookingId);
          if (res.success) {
            toast.success('Hủy đơn đặt sân thành công.');
            setSelectedBookingIds((prev) => prev.filter((id) => id !== bookingId));
            await fetchBookings();
          } else {
            toast.error(res.message || 'Không thể hủy đơn đặt sân.');
          }
        } catch {
          toast.error('Lỗi khi hủy đơn đặt sân.');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  /**
   * Handles user cancelling a paid booking (automatically refunded into wallet).
   */
  const handleCancelPaid = (bookingId: number) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;

    const isMonth = (targetBooking as any).itemType === 'monthly' || Boolean((targetBooking as any).startDate);

    let startMs = 0;
    if (isMonth) {
      const rawStartDate = String((targetBooking as any).startDate).split('T')[0];
      const startTimeStr = (targetBooking as any).startTime || '08:00';
      startMs = new Date(`${rawStartDate}T${startTimeStr}:00`).getTime();
    } else {
      startMs = new Date(targetBooking.startTime).getTime();
    }

    const nowMs = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    if (startMs - nowMs < oneHourMs) {
      toast.error('Đã gần tới giờ chơi hoặc đã qua giờ bắt đầu, không thể hủy đơn đặt sân.');
      return;
    }

    const refundAmount = calculateItemPrice(targetBooking);

    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Hủy Đơn & Nhận Hoàn Tiền Tự Động',
      message: `Bạn có chắc chắn muốn hủy đơn đặt sân #${bookingId} (${targetBooking.yard?.yardName || 'Sân'})? Vì thời gian bắt đầu còn hơn 1 tiếng, hệ thống sẽ tự động hoàn ngay ${refundAmount.toLocaleString('vi-VN')} Xu vào ví tài khoản của bạn.`,
      type: 'danger',
      confirmText: 'Xác Nhận Hủy & Hoàn Tiền',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          const res = isMonth
            ? await bookingService.cancelPaidBookingsMonth(bookingId)
            : await bookingService.cancelPaidBooking(bookingId);

          if (res.success) {
            toast.success(res.message || 'Đã hủy đơn và tự động hoàn tiền vào ví thành công!');
            await fetchBookings();
            await fetchWallet();
          } else {
            toast.error(res.message || 'Không thể hủy đơn đặt sân.');
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.message || err?.message || 'Lỗi khi hủy đơn đặt sân.');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const searchedBookings = visibleBookings.filter((b) => {
    const keyword = searchKeyword.trim().toLowerCase();
    const yardName = b.yard?.yardName?.toLowerCase() || '';
    const vendorName = (b.yard?.vendor as any)?.name?.toLowerCase() || (b.yard?.vendor as any)?.vendorName?.toLowerCase() || '';
    return !keyword || yardName.includes(keyword) || vendorName.includes(keyword);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBF9] font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      <DashboardNavbar
        currentUser={currentUser}
        onLogout={onLogout}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
      />

      <div className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 space-y-6">

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-[#1E3932] font-black tracking-tight">
            Giỏ Hàng & Đơn Đặt Sân
          </h1>
          <p className="text-xs sm:text-sm text-[#6F7E72] font-medium">
            Quản lý lịch thi đấu, thanh toán đơn hoặc chọn nhiều sân để thanh toán gộp bằng Xu
          </p>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className={`${activeStatusTab === 'unpaid' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-5`}>
            <CartItemList
              bookings={searchedBookings}
              activeStatusTab={activeStatusTab}
              onSelectStatusTab={setActiveStatusTab}
              selectedBookingIds={selectedBookingIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onPaySingle={handlePaySingle}
              onCancelSingle={handleCancelSingle}
              onHideSingle={handleDeleteSingle}
              onBatchDelete={handleBatchDelete}
              onCancelPaid={handleCancelPaid}
              onViewQr={(booking) => setSelectedQrBooking(booking)}
              onOpenRating={(booking) => setSelectedRatingBooking(booking)}
              isProcessing={isProcessing}
            />
          </div>

          {activeStatusTab === 'unpaid' && (
            <div className="lg:col-span-4 static lg:sticky lg:top-24">
              <CheckoutSummary
                selectedCount={selectedUnpaidBookings.length}
                totalAmount={totalSelectedAmount}
                paymentMethod={paymentMethod}
                onSelectPaymentMethod={setPaymentMethod}
                walletBalance={walletBalance}
                isProcessing={isProcessing}
                onCheckout={handleBatchCheckout}
              />
            </div>
          )}
        </main>

        <CartGuaranteeBanner />
      </div>

      <DashboardFooter />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        isLoading={isProcessing}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <PaymentSuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
        onViewPaidTab={() => setActiveStatusTab('paid')}
        totalCount={successModal.count}
        totalAmount={successModal.amount}
        message={successModal.message}
        paidBookings={successModal.paidBookings}
      />

      <PayOSPaymentModal
        isOpen={payOSModal.isOpen}
        paymentData={payOSModal.paymentData}
        booking={payOSModal.booking}
        selectedBookings={payOSModal.selectedBookings}
        onClose={() => setPayOSModal({ isOpen: false, paymentData: null, booking: null })}
        onSuccess={handlePayOSSuccess}
        onCancelPayment={handleCancelPayOSLink}
      />

      {/* Single Payment Method Selection Modal */}
      {singlePayModal.isOpen && singlePayModal.booking && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E6E2D8] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E6E2D8] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E3932]">Chọn Phương Thức Thanh Toán</h3>
                  <p className="text-xs text-[#6F7E72]">
                    {singlePayModal.booking.yard?.yardName || (singlePayModal.booking.yard?.id || (singlePayModal.booking as any).yardId ? `Sân #${singlePayModal.booking.yard?.id || (singlePayModal.booking as any).yardId}` : 'Sân thể thao')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSinglePayModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-2 rounded-full text-[#6F7E72] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Yard Details & Price Summary */}
            <div className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6F7E72] font-semibold">Tên sân thi đấu:</span>
                <span className="font-extrabold text-[#1E3932]">
                  {singlePayModal.booking.yard?.yardName || (singlePayModal.booking.yard?.id || (singlePayModal.booking as any).yardId ? `Sân #${singlePayModal.booking.yard?.id || (singlePayModal.booking as any).yardId}` : 'Sân thể thao')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6F7E72] font-semibold">Khung giờ:</span>
                <span className="font-mono font-bold text-[#1E3932]">
                  {formatTimeAMPM(new Date(singlePayModal.booking.startTime))} - {formatTimeAMPM(new Date(singlePayModal.booking.endTime))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6E2D8]">
                <span className="text-[#6F7E72] font-bold uppercase tracking-wider">Tổng tiền cần thanh toán:</span>
                <span className="text-base font-black text-[#006241] font-mono">
                  {(() => {
                    const b = singlePayModal.booking;
                    if (b.priced && Number(b.priced) > 0) {
                      return Number(b.priced).toLocaleString('vi-VN');
                    }
                    const price = Number(b.yard?.price || 0);
                    const start = new Date(b.startTime);
                    const end = new Date(b.endTime);
                    const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
                    return (price * durationHours).toLocaleString('vi-VN');
                  })()}đ
                </span>
              </div>
            </div>

            {/* Payment Method Selection Cards */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#6F7E72] uppercase tracking-wider block">
                Phương Thức Thanh Toán
              </span>

              {/* PayOS VietQR Card */}
              <label
                onClick={() => setSinglePayModal((prev) => ({ ...prev, method: 'PAYOS' }))}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${singlePayModal.method === 'PAYOS'
                  ? 'border-[#006241] bg-[#006241]/5 text-[#1E3932] shadow-sm'
                  : 'border-[#E6E2D8] bg-white hover:border-[#1E3932]/30 text-[#6F7E72]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006241]/10 flex items-center justify-center text-[#006241]">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1E3932]">Thanh Toán Ngân Hàng</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#006241]/10 text-[#006241] text-[10px] font-bold">
                        PayOS VietQR
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F7E72]">Quét mã QR qua ứng dụng ngân hàng hoặc MoMo</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="singlePaymentMethodChoice"
                  checked={singlePayModal.method === 'PAYOS'}
                  onChange={() => setSinglePayModal((prev) => ({ ...prev, method: 'PAYOS' }))}
                  className="w-4 h-4 accent-[#006241]"
                />
              </label>

              {/* Wallet Xu Card */}
              <label
                onClick={() => setSinglePayModal((prev) => ({ ...prev, method: 'WALLET' }))}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${singlePayModal.method === 'WALLET'
                  ? 'border-[#006241] bg-[#006241]/5 text-[#1E3932] shadow-sm'
                  : 'border-[#E6E2D8] bg-white hover:border-[#1E3932]/30 text-[#6F7E72]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1E3932]">Thanh Toán Bằng Xu Ví</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold font-mono">
                        Ví: {walletBalance.toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F7E72]">Trừ Xu trực tiếp trong ví tài khoản</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="singlePaymentMethodChoice"
                  checked={singlePayModal.method === 'WALLET'}
                  onChange={() => setSinglePayModal((prev) => ({ ...prev, method: 'WALLET' }))}
                  className="w-4 h-4 accent-[#006241]"
                />
              </label>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E2D8]">
              <button
                type="button"
                onClick={() => setSinglePayModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 rounded-full border border-[#E6E2D8] text-[#6F7E72] hover:text-[#1E3932] text-xs font-bold transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSinglePay}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>Xác Nhận Thanh Toán</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <BookingDetailQrModal
        booking={selectedQrBooking}
        onClose={() => setSelectedQrBooking(null)}
      />

      {/* Yard Rating Modal */}
      {selectedRatingBooking && (
        <YardRatingModal
          isOpen={true}
          yardId={
            Number(selectedRatingBooking.yard?.id || (selectedRatingBooking as any).yardId)
          }
          yardName={selectedRatingBooking.yard?.yardName}
          vendorName={
            (selectedRatingBooking.yard?.vendor as any)?.vendorName ||
            (selectedRatingBooking.yard?.vendor as any)?.name ||
            'Cụm Sân Thể Thao'
          }
          bookingId={selectedRatingBooking.id}
          currentUser={currentUser}
          onClose={() => setSelectedRatingBooking(null)}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};
