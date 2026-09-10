import React from 'react';
import { ShoppingBag, CheckSquare, Square, Trash2 } from 'lucide-react';
import { BackendBooking } from '../../services/bookingService';
import { CartItemCard } from './CartItemCard';

interface CartItemListProps {
  bookings: BackendBooking[];
  activeStatusTab: 'ALL' | 'unpaid' | 'paid' | 'refunded' | 'cancelled';
  onSelectStatusTab: (tab: 'ALL' | 'unpaid' | 'paid' | 'refunded' | 'cancelled') => void;
  selectedBookingIds: number[];
  onToggleSelect: (bookingId: number) => void;
  onToggleSelectAll: () => void;
  onPaySingle: (bookingId: number) => void;
  onCancelSingle: (bookingId: number) => void;
  onHideSingle: (bookingId: number) => void;
  onBatchDelete?: () => void;
  onCancelPaid?: (bookingId: number) => void;
  onViewQr?: (booking: BackendBooking) => void;
  onOpenRating?: (booking: BackendBooking) => void;
  isProcessing: boolean;
}

export const CartItemList: React.FC<CartItemListProps> = ({
  bookings,
  activeStatusTab,
  onSelectStatusTab,
  selectedBookingIds,
  onToggleSelect,
  onToggleSelectAll,
  onPaySingle,
  onCancelSingle,
  onHideSingle,
  onBatchDelete,
  onCancelPaid,
  onViewQr,
  onOpenRating,
  isProcessing,
}) => {
  const unpaidItems = bookings.filter((b) => (b.status || 'unpaid') === 'unpaid');
  const paidItems = bookings.filter((b) => b.status === 'paid');
  const refundedItems = bookings.filter((b) => b.status === 'refunded');
  const cancelledItems = bookings.filter((b) => b.status === 'cancelled');

  const statusOrderMap: Record<string, number> = {
    unpaid: 1,
    refund: 2,
    refunded: 3,
    paid: 4,
    cancelled: 5,
  };

  const filteredBookings = bookings
    .filter((b) => {
      if (activeStatusTab === 'ALL') return true;
      return (b.status || 'unpaid') === activeStatusTab;
    })
    .sort((a, b) => {
      if (activeStatusTab === 'ALL') {
        const orderA = statusOrderMap[a.status || 'unpaid'] || 99;
        const orderB = statusOrderMap[b.status || 'unpaid'] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
      }
      const timeA = new Date((a as any).createdAt || (a as any).startTime || (a as any).startDate || 0).getTime();
      const timeB = new Date((b as any).createdAt || (b as any).startTime || (b as any).startDate || 0).getTime();
      return timeB - timeA;
    });

  const isAllFilteredSelected =
    filteredBookings.length > 0 && filteredBookings.every((b) => selectedBookingIds.includes(b.id));

  const selectedCountInTab = filteredBookings.filter((b) => selectedBookingIds.includes(b.id)).length;

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      {/* Header filter tabs & Select all / Batch Delete controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E2D8] pb-4">
        {/* Status Filter Tabs - Kept on 1 single row with smooth horizontal scroll if needed */}
        <div className="flex items-center flex-nowrap overflow-x-auto gap-2 py-1 max-w-full scrollbar-none">
          {[
            { id: 'ALL', label: 'Tất Cả', count: bookings.length },
            { id: 'unpaid', label: 'Chờ Thanh Toán', count: unpaidItems.length },
            { id: 'paid', label: 'Đã Thanh Toán', count: paidItems.length },
            { id: 'refunded', label: 'Đã Hoàn Tiền', count: refundedItems.length },
            { id: 'cancelled', label: 'Đã Hủy', count: cancelledItems.length },
          ].map((tab) => {
            const isSelected = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectStatusTab(tab.id as any)}
                className={`whitespace-nowrap shrink-0 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#006241] text-white shadow-sm'
                    : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Action Controls: Select All & Batch Delete */}
        <div className="flex flex-wrap items-center gap-2">
          {filteredBookings.length > 0 && (
            <button
              onClick={onToggleSelectAll}
              className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#006241] hover:text-[#1E3932] transition-colors cursor-pointer bg-[#006241]/10 hover:bg-[#006241]/15 px-3 sm:px-3.5 py-1.5 rounded-full border border-[#006241]/20 shrink-0"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#006241] shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-[#6F7E72] shrink-0" />
              )}
              <span className="hidden sm:inline">
                {activeStatusTab === 'unpaid'
                  ? `Chọn tất cả sân chờ thanh toán (${filteredBookings.length})`
                  : `Chọn tất cả (${filteredBookings.length})`}
              </span>
              <span className="sm:hidden">
                Chọn tất cả ({filteredBookings.length})
              </span>
            </button>
          )}

          {activeStatusTab !== 'unpaid' && selectedCountInTab > 0 && onBatchDelete && (
            <button
              onClick={onBatchDelete}
              disabled={isProcessing}
              className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer px-3 sm:px-4 py-1.5 rounded-full shadow-md hover:shadow-lg active:scale-95 border border-rose-600 shrink-0"
              title="Xóa mềm các đơn đã chọn"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Xóa các đơn đã chọn ({selectedCountInTab})</span>
              <span className="sm:hidden">Xóa ({selectedCountInTab})</span>
            </button>
          )}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#FBF8F0] rounded-[28px] border border-[#E6E2D8] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#1E3932]">
            Không có đơn đặt sân nào trong danh mục này
          </h3>
          <p className="text-xs text-[#6F7E72] max-w-sm">
            Bạn có thể chọn đặt sân mới tại các thương hiệu thể thao trên hệ thống Sporting ONE.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <CartItemCard
              key={booking.id}
              booking={booking}
              isSelected={selectedBookingIds.includes(booking.id)}
              onToggleSelect={onToggleSelect}
              onPaySingle={onPaySingle}
              onCancelSingle={onCancelSingle}
              onHideSingle={onHideSingle}
              onCancelPaid={onCancelPaid}
              onViewQr={onViewQr}
              onOpenRating={onOpenRating}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      )}
    </div>
  );
};
