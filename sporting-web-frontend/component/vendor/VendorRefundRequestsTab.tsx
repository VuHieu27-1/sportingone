import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  AlertCircle,
  Coins,
  Clock,
  MessageSquare,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { BackendBooking, bookingService } from '../../services/bookingService';
import { formatTimeAMPM } from '../../utils/dateUtils';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import toast from 'react-hot-toast';

interface RefundRequestActionMenuProps {
  booking: BackendBooking;
  openId: number | null;
  setOpenId: (id: number | null) => void;
  onApprove: (booking: BackendBooking) => void;
  onReject: (booking: BackendBooking) => void;
  isProcessing: boolean;
}

const RefundRequestActionMenu: React.FC<RefundRequestActionMenuProps> = ({
  booking,
  openId,
  setOpenId,
  onApprove,
  onReject,
  isProcessing,
}) => {
  const isOpen = openId === booking.id;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 16 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(16, window.innerWidth - rect.right);

    if (spaceBelow < 180) {
      setPos({ bottom: window.innerHeight - rect.top + 6, right });
    } else {
      setPos({ top: rect.bottom + 6, right });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    recalcPos();
    setOpenId(isOpen ? null : booking.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    recalcPos();
    const sync = () => recalcPos();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [isOpen, recalcPos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={isProcessing}
        className="w-9 h-9 rounded-full bg-white hover:bg-[#F2F0EB] active:bg-[#E6E2D8] transition-all cursor-pointer border border-[#E6E2D8] flex items-center justify-center ml-auto shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#006241]/40 disabled:opacity-50"
        title="Thao tác xét duyệt hoàn tiền"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 text-[#006241] animate-spin" />
        ) : (
          <MoreVertical className="w-4 h-4 text-[#1E3932]" />
        )}
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
            <div
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7E72] border-b border-[#F2F0EB]">
                Thao tác #LA-{booking.id}
              </div>

              <button
                onClick={() => {
                  setOpenId(null);
                  onApprove(booking);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#006241] hover:bg-emerald-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Duyệt Hoàn Tiền</span>
              </button>

              <button
                onClick={() => {
                  setOpenId(null);
                  onReject(booking);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Từ Chối Yêu Cầu</span>
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

interface VendorRefundRequestsTabProps {
  bookings: BackendBooking[];
  onRefresh?: () => void;
}

export const VendorRefundRequestsTab: React.FC<VendorRefundRequestsTabProps> = ({
  bookings,
  onRefresh,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Approve Modal State
  const [approveModalBooking, setApproveModalBooking] = useState<BackendBooking | null>(null);

  // Reject Modal State
  const [rejectModalBooking, setRejectModalBooking] = useState<BackendBooking | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Filter ONLY bookings with status === 'refund'
  const refundRequests = useMemo(() => {
    return bookings.filter((b) => String(b.status || '').toLowerCase().trim() === 'refund');
  }, [bookings]);

  // Overall calculations for pending refund requests
  const stats = useMemo(() => {
    let totalRefundAmount = 0;
    refundRequests.forEach((b) => {
      const startMs = new Date(b.startTime).getTime();
      const endMs = new Date(b.endTime).getTime();
      const hours = (endMs - startMs) / (1000 * 60 * 60);
      const calcHours = hours > 0 ? hours : 1;
      const priceNum =
        b.priced && Number(b.priced) > 0
          ? Number(b.priced)
          : Math.round(calcHours * Number(b.yard?.price || 0));
      totalRefundAmount += priceNum;
    });

    return {
      totalCount: refundRequests.length,
      totalRefundAmount,
    };
  }, [refundRequests]);

  const {
    paginatedData,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    sortField,
    sortDirection,
    globalSearch,
    columnFilters,
    setCurrentPage,
    setPageSize,
    setGlobalSearch,
    setColumnFilter,
    handleSort,
  } = useDataTable<BackendBooking>({
    data: refundRequests,
    initialPageSize: 10,
    initialSortField: 'id',
    initialSortDirection: 'desc',
    searchFields: [
      'id',
      (b) => b.user?.username || '',
      (b) => b.user?.email || '',
      (b) => b.yard?.yardName || '',
      (b) => b.yard?.sportType?.sportName || '',
      (b) => b.yard?.vendor?.vendorName || '',
    ],
    sortAccessors: {
      user: (b) => b.user?.username || '',
      yard: (b) => b.yard?.yardName || '',
      vendor: (b) => b.yard?.vendor?.vendorName || '',
      priced: (b) => Number(b.priced || b.yard?.price || 0),
    },
    storageKey: 'sporting_vendor_refund_requests_page_size',
  });

  /**
   * Handles confirming refund approval.
   */
  const handleConfirmApprove = async () => {
    if (!approveModalBooking) return;
    setProcessingId(approveModalBooking.id);
    try {
      const res = await bookingService.processRefund(approveModalBooking.id);
      if (res.success) {
        toast.success(res.message || 'Đã duyệt yêu cầu hoàn tiền thành công!');
        setApproveModalBooking(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.message || 'Không thể duyệt yêu cầu hoàn tiền.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt yêu cầu hoàn tiền.');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handles confirming refund rejection with reason.
   */
  const handleConfirmReject = async () => {
    if (!rejectModalBooking) return;
    toast.error('Hệ thống hiện tại xử lý hoàn tiền tự động theo chính sách hủy sân.');
    setRejectModalBooking(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Yêu Cầu Chờ Duyệt
            </span>
            <span className="text-2xl font-black text-[#1E3932]">
              {stats.totalCount} <span className="text-xs font-medium text-[#6F7E72]">đơn</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 flex items-center justify-center text-[#006241] shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#6F7E72] font-semibold block uppercase tracking-wider">
              Tổng Tiền Cần Hoàn
            </span>
            <span className="text-2xl font-black text-[#006241]">
              {stats.totalRefundAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-[#E6E2D8] shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-[#E6E2D8] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <span>Yêu Cầu Hoàn Tiền (Refund Requests)</span>
            </h3>
            <p className="text-xs text-[#6F7E72] mt-0.5 font-medium">
              Xem xét và phê duyệt hoàn Xu hoặc từ chối các yêu cầu hủy đặt sân từ khách hàng.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#6F7E72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm mã đơn, khách, sân..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F0EB]/50 border border-[#E6E2D8] rounded-xl text-xs text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:border-[#006241] transition-colors"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6F7E72] hover:text-[#1E3932]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {refundRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-extrabold text-[#1E3932]">Không có yêu cầu hoàn tiền nào đang chờ xử lý</h4>
            <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
              Tuyệt vời! Hiện tại cụm sân của bạn không có đơn đặt sân nào đang chờ duyệt hoàn tiền.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E6E2D8]">
            <table className="w-full text-left text-xs border-collapse font-['Plus_Jakarta_Sans',sans-serif]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[#1E3932] uppercase font-mono text-[11px] tracking-wider">
                  <DataTableHeader
                    label="ORDER ID"
                    field="id"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5 pl-5"
                  />
                  <DataTableHeader
                    label="KHÁCH HÀNG"
                    field="user"
                    sortable={false}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="SÂN & MÔN THỂ THAO"
                    field="yard"
                    sortable={false}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="CỤM SÂN & ĐỊA CHỈ"
                    field="vendor"
                    sortable={false}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="KHUNG GIỜ ĐẶT"
                    field="startTime"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="SỐ TIỀN CẦN HOÀN"
                    field="priced"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                    className="p-3.5"
                  />
                  <DataTableHeader
                    label="TRẠNG THÁI"
                    field="status"
                    sortable={false}
                    align="center"
                    className="p-3.5"
                  />
                  <DataTableHeader label="HÀNH ĐỘNG" align="right" sortable={false} className="p-3.5 pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932] font-semibold">
                {paginatedData.map((b) => {
                  const yardName = b.yard?.yardName || (b as any).yardName || 'Sân tiêu chuẩn';
                  const sportName = b.yard?.sportType?.sportName || (b as any).sportName || 'Thể thao';
                  const vendorName =
                    (b.yard?.vendor as any)?.vendorName ||
                    (b.yard?.vendor as any)?.name ||
                    (b as any).vendorName ||
                    'Cụm sân Sporting';
                  const vendorAddress =
                    (b.yard?.vendor as any)?.vendorAddress || (b as any).vendorAddress || 'Việt Nam';

                  const startObj = new Date(b.startTime);
                  const endObj = new Date(b.endTime);
                  const startFormatted = formatTimeAMPM(startObj);
                  const endFormatted = formatTimeAMPM(endObj);
                  const dateStr = startObj.toLocaleDateString('vi-VN');

                  const startMs = startObj.getTime();
                  const endMs = endObj.getTime();
                  const hours = (endMs - startMs) / (1000 * 60 * 60);
                  const calcHours = hours > 0 ? hours : 1;
                  const priceNum =
                    b.priced && Number(b.priced) > 0
                      ? Number(b.priced)
                      : Math.round(calcHours * Number(b.yard?.price || 0));

                  const isCurrentProcessing = processingId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-[#FBF8F0] transition-colors">
                      {/* Order ID */}
                      <td className="p-3.5 pl-5 font-mono font-extrabold text-[#006241]">
                        #LA-{b.id}
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-[#1E3932]">
                          {b.user?.username || (b as any).username || `User #${(b as any).userId || b.id}`}
                        </div>
                        <div className="text-[10px] text-[#6F7E72] font-mono">
                          {b.user?.email || (b as any).email || ''}
                        </div>
                      </td>

                      {/* Yard & Sport */}
                      <td className="p-3.5">
                        <div
                          onClick={() => b.yard?.id && window.open(`/yard/${b.yard.id}`, '_blank')}
                          className={`font-bold text-[#1E3932] transition-colors ${b.yard?.id ? 'hover:text-[#006241] cursor-pointer' : ''
                            }`}
                          title="Xem chi tiết sân"
                        >
                          {yardName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-[#006241]/10 text-[#006241] text-[10px] font-extrabold">
                            {sportName}
                          </span>
                          <span className="text-[10px] text-[#6F7E72]">
                            ({(b.yard as any)?.type || (b as any).yardType || 'Sân 7'})
                          </span>
                        </div>
                      </td>

                      {/* Vendor Name & Address */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="font-bold text-[#1E3932] truncate">{vendorName}</div>
                        <div className="text-[10px] text-[#6F7E72] truncate" title={vendorAddress}>
                          {vendorAddress}
                        </div>
                      </td>

                      {/* Time */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-[#1E3932] font-extrabold text-[11px]">
                          {startFormatted} - {endFormatted}
                        </div>
                        <div className="text-[10px] text-[#6F7E72] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Amount to Refund */}
                      <td className="p-3.5 text-right font-mono font-black text-sm text-[#006241]">
                        {priceNum.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-black border border-amber-500/30 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chờ Duyệt Hoàn Tiền
                        </span>
                      </td>

                      {/* Action Menu (Single Button) */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <RefundRequestActionMenu
                          booking={b}
                          openId={openMenuId}
                          setOpenId={setOpenMenuId}
                          onApprove={(booking) => setApproveModalBooking(booking)}
                          onReject={(booking) => {
                            setRejectModalBooking(booking);
                            setRejectReason('');
                          }}
                          isProcessing={isCurrentProcessing}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {refundRequests.length > 0 && (
          <DataTablePagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="yêu cầu hoàn tiền"
          />
        )}
      </div>

      {/* MODAL 1: Confirm Approve Refund */}
      {approveModalBooking &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#E6E2D8] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1E3932]">Xác Nhận Duyệt Hoàn Tiền</h3>
                  <p className="text-xs text-[#6F7E72] font-medium">Đơn đặt sân #LA-{approveModalBooking.id}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] space-y-2 text-xs text-[#1E3932]">
                <div className="flex justify-between">
                  <span className="text-[#6F7E72]">Khách hàng:</span>
                  <span className="font-extrabold">{approveModalBooking.user?.username || (approveModalBooking as any).username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7E72]">Sân đặt:</span>
                  <span className="font-extrabold">{approveModalBooking.yard?.yardName || (approveModalBooking as any).yardName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6F7E72]">Số Xu hoàn trả ví:</span>
                  <span className="font-mono font-black text-[#006241] text-sm">
                    {Number(approveModalBooking.priced || approveModalBooking.yard?.price || 0).toLocaleString('vi-VN')} Xu
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#6F7E72] leading-relaxed">
                Sau khi xác nhận, hệ thống sẽ tự động hoàn số Xu trên vào ví của khách hàng và cập nhật đơn sang trạng thái <strong>Đã Hoàn Tiền</strong>.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalBooking(null)}
                  disabled={processingId !== null}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E2D8] bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={processingId !== null}
                  className="px-5 py-2.5 rounded-xl bg-[#006241] hover:bg-[#004d33] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {processingId !== null ? 'Đang Xử Lý...' : 'Xác Nhận Duyệt Hoàn Tiền'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL 2: Reject Refund with Reason */}
      {rejectModalBooking &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#E6E2D8] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1E3932]">Từ Chối Yêu Cầu Hoàn Tiền</h3>
                  <p className="text-xs text-[#6F7E72] font-medium">Đơn đặt sân #LA-{rejectModalBooking.id}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#006241]" />
                  Lý Do Từ Chối (Bắt buộc gửi cho khách hàng):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Đã quá thời hạn cho phép hủy đặt sân theo quy định 2 tiếng trước giờ thi đấu..."
                  rows={4}
                  className="w-full p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6E2D8] text-xs text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:border-[#006241] focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              <p className="text-xs text-[#6F7E72] leading-relaxed">
                Khi từ chối, đơn đặt sân sẽ được giữ lại trạng thái <strong>Đã Thanh Toán</strong> và lý do từ chối trên sẽ được gửi thông báo trực tiếp đến tài khoản khách hàng.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalBooking(null);
                    setRejectReason('');
                  }}
                  disabled={processingId !== null}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E2D8] bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={processingId !== null || !rejectReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {processingId !== null ? 'Đang Gửi...' : 'Xác Nhận Từ Chối'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
