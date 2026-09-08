import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Building2,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Send,
  Loader2,
  RefreshCw,
  Info,
  QrCode,
  ExternalLink,
  Copy,
  MoreVertical,
  RotateCcw,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  coinTransactionService,
  CoinTransactionData,
  BankQrData,
} from '../../services/coinTransactionService';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';

interface ApprovalActionMenuProps {
  item: CoinTransactionData;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  handleApproveClick: (item: CoinTransactionData) => void;
  handleOpenRejectModal: (id: number) => void;
  isProcessing: boolean;
}

const ApprovalActionMenu: React.FC<ApprovalActionMenuProps> = ({
  item,
  openId,
  setOpenId,
  handleApproveClick,
  handleOpenRejectModal,
  isProcessing,
}) => {
  const menuKey = `approval-${item.id}`;
  const isOpen = openId === menuKey;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, []);

  const handleToggle = () => {
    if (!isOpen) recalcPos();
    setOpenId(isOpen ? null : menuKey);
  };

  useEffect(() => {
    if (!isOpen) return;
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
        className="w-8 h-8 rounded-full hover:bg-[#F2F0EB] active:bg-[#E6E2D8] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center ml-auto focus:outline-none focus:ring-2 focus:ring-[#006241]/40 disabled:opacity-50"
        title="Thao tác xét duyệt"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 text-[#006241] animate-spin" />
        ) : (
          <MoreVertical className="w-4 h-4 text-[#1E3932]" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
          <div
            className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif]"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6F7E72] border-b border-[#F2F0EB]">
              Xét duyệt #{item.transactionCode || item.id}
            </div>

            <button
              onClick={() => {
                setOpenId(null);
                handleApproveClick(item);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#006241] hover:bg-emerald-50 rounded-xl transition-colors duration-150 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#006241] shrink-0" />
              <span>{item.type === 'withdraw' ? 'Phê Duyệt & Mở QR' : 'Phê Duyệt Yêu Cầu'}</span>
            </button>

            <button
              onClick={() => {
                setOpenId(null);
                handleOpenRejectModal(item.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors duration-150 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Từ Chối Yêu Cầu</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

interface AdminApprovalsTabProps {
  approvals: CoinTransactionData[];
  isLoadingData: boolean;
  onRefresh: () => void;
}

export const AdminApprovalsTab: React.FC<AdminApprovalsTabProps> = ({
  approvals,
  isLoadingData,
  onRefresh,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<
    'ALL' | 'pending' | 'withdraw' | 'refund' | 'completed' | 'failed'
  >('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTxId, setRejectTxId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Withdraw QR Payment Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTx, setQrTx] = useState<CoinTransactionData | null>(null);
  const [qrData, setQrData] = useState<BankQrData | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const pendingWithdraws = pendingApprovals.filter((a) => a.type === 'withdraw');
  const pendingRefunds = pendingApprovals.filter((a) => a.type === 'refund');
  const completedApprovals = approvals.filter((a) => a.status === 'completed');

  const pendingWithdrawTotal = pendingWithdraws.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );
  const pendingRefundTotal = pendingRefunds.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );

  const filteredList = approvals.filter((item) => {
    const matchesSearch =
      (item.transactionCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user?.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'pending') return item.status === 'pending';
    if (filterType === 'withdraw') return item.type === 'withdraw';
    if (filterType === 'refund') return item.type === 'refund';
    if (filterType === 'completed') return item.status === 'completed';
    if (filterType === 'failed') return item.status === 'failed' || item.status === 'cancelled';
    return true;
  });

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã chép ${label}!`);
  };

  /**
   * Direct approval handler
   */
  const handleApprove = async (id: number) => {
    setIsProcessingId(id);
    try {
      const res = await coinTransactionService.approveTransaction(id);
      if (res.success) {
        toast.success(res.message || 'Đã phê duyệt giao dịch thành công!');
        setQrModalOpen(false);
        setQrTx(null);
        setQrData(null);
        onRefresh();
      } else {
        toast.error(res.message || 'Phê duyệt thất bại.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi kết nối phê duyệt.');
    } finally {
      setIsProcessingId(null);
    }
  };

  /**
   * Handles clicking "Approve" button on UI.
   */
  const handleApproveClick = async (item: CoinTransactionData) => {
    if (item.type === 'withdraw') {
      setQrTx(item);
      setQrData(null);
      setQrModalOpen(true);
      setIsLoadingQr(true);

      try {
        const res = await coinTransactionService.getBankQrByTransactionId(item.id);
        if (res.success && res.data) {
          setQrData(res.data);
        } else {
          toast.error(res.message || 'Không thể tải mã QR thanh toán!');
          setQrModalOpen(false);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Lỗi khi lấy dữ liệu QR ngân hàng.');
        setQrModalOpen(false);
      } finally {
        setIsLoadingQr(false);
      }
    } else {
      await handleApprove(item.id);
    }
  };

  /**
   * Handles event processing for handleOpenRejectModal.
   */
  const handleOpenRejectModal = (id: number) => {
    setRejectTxId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  /**
   * Handles event processing for handleConfirmReject.
   */
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTxId) return;

    setIsProcessingId(rejectTxId);
    try {
      const res = await coinTransactionService.rejectTransaction(
        rejectTxId,
        rejectReason,
      );
      if (res.success) {
        toast.success(res.message || 'Đã từ chối đơn giao dịch!');
        setRejectModalOpen(false);
        onRefresh();
      } else {
        toast.error(res.message || 'Từ chối giao dịch thất bại.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi kết nối khi từ chối giao dịch.');
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6F7E72] uppercase tracking-wider block">
              Chờ Phê Duyệt
            </span>
            <div className="text-2xl font-black text-[#1E3932] font-mono">
              {pendingApprovals.length}{' '}
              <span className="text-xs font-normal text-[#6F7E72]">Đơn</span>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
              Cần xử lý ngay
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6F7E72] uppercase tracking-wider block">
              Tổng Rút Tiền Chờ Duyệt
            </span>
            <div className="text-xl font-black text-[#006241] font-mono">
              {pendingWithdrawTotal.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-[11px] font-bold text-[#006241] bg-[#006241]/10 px-2 py-0.5 rounded-full inline-block">
              {pendingWithdraws.length} yêu cầu rút
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#006241] flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6F7E72] uppercase tracking-wider block">
              Tổng Refund Chờ Duyệt
            </span>
            <div className="text-xl font-black text-amber-900 font-mono">
              {pendingRefundTotal.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block">
              {pendingRefunds.length} yêu cầu hoàn
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#6F7E72] uppercase tracking-wider block">
              Đã Hoàn Tất Duyệt
            </span>
            <div className="text-2xl font-black text-[#1E3932] font-mono">
              {completedApprovals.length}{' '}
              <span className="text-xs font-normal text-[#6F7E72]">Đơn</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
              Đã giải ngân / hoàn xu
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1E3932]/10 text-[#1E3932] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {[
              { id: 'pending', label: 'Chờ Phê Duyệt', count: pendingApprovals.length, icon: Clock },
              {
                id: 'withdraw',
                label: 'Đơn Rút Tiền',
                count: approvals.filter((a) => a.type === 'withdraw').length,
                icon: ArrowUpRight,
              },
              {
                id: 'refund',
                label: 'Đơn Refund',
                count: approvals.filter((a) => a.type === 'refund').length,
                icon: RotateCcw,
              },
              { id: 'completed', label: 'Đã Duyệt', count: completedApprovals.length, icon: CheckCircle2 },
              {
                id: 'failed',
                label: 'Từ Chối',
                count: approvals.filter(
                  (a) => a.status === 'failed' || a.status === 'cancelled',
                ).length,
                icon: XCircle,
              },
              { id: 'ALL', label: 'Tất Cả', count: approvals.length, icon: Layers },
            ].map((tab) => {
              const isSelected = filterType === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${isSelected
                    ? 'bg-[#006241] text-white border-[#006241] shadow-xs'
                    : 'bg-[#F2F0EB] text-[#6F7E72] border-transparent hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#FBF8F0]' : 'text-[#6F7E72]'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#E6E2D8] text-[#1E3932]'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#6F7E72] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              tabIndex={1}
              placeholder="Tìm theo user, mã GD, STK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:border-[#006241] focus:bg-white transition-all"
            />
          </div>
        </div>

        {isLoadingData ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#006241] animate-spin" />
            <span className="text-xs font-bold text-[#6F7E72]">
              Đang tải dữ liệu giao dịch duyệt...
            </span>
          </div>
        ) : (
          <AdminApprovalsDataTable
            filteredList={filteredList}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            handleApproveClick={handleApproveClick}
            handleOpenRejectModal={handleOpenRejectModal}
            isProcessingId={isProcessingId}
          />
        )}
      </div>

      {/* VietQR Withdraw Payment Modal - Dual Card Design */}
      {qrModalOpen && qrTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif] overflow-y-auto">
          {isLoadingQr ? (
            <div className="bg-white border border-[#E6E2D8] text-[#1E3932] rounded-[32px] p-12 shadow-2xl flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#006241] animate-spin" />
              <span className="text-sm font-bold text-[#6F7E72]">
                Đang truy vấn dữ liệu ví & khởi tạo mã VietQR...
              </span>
            </div>
          ) : qrData ? (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* CỘT BÊN TRÁI: KHUNG MÃ QR CODE */}
              <div className="bg-white border border-[#E6E2D8] rounded-[32px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-2xl text-[#1E3932]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-extrabold text-[#6F7E72] uppercase tracking-widest block">
                        CODE SCAN
                      </span>
                      <h3 className="text-base font-extrabold text-[#1E3932]">
                        Mã Thanh Toán VietQR
                      </h3>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center font-bold text-xs">
                      QR
                    </div>
                  </div>

                  <p className="text-xs text-[#6F7E72] leading-relaxed">
                    Dùng ứng dụng Ngân Hàng bất kỳ quét mã bên dưới để thực hiện chuyển khoản cho người dùng.
                  </p>

                  <div className="border-b border-[#F2F0EB] pb-2 flex gap-4 text-xs font-bold">
                    <span className="text-[#006241] border-b-2 border-[#006241] pb-2 px-1">
                      QR Code
                    </span>
                  </div>
                </div>

                {/* Center QR Code Container */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-[#F9F8F3] p-3.5 rounded-[24px] shadow-sm border border-[#E6E2D8] w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                    <img
                      src={qrData.qrUrl}
                      alt="VietQR Code"
                      className="w-full h-full object-contain rounded-xl bg-white p-1 border border-[#E6E2D8]"
                    />
                  </div>

                  <div className="text-center space-y-0.5 pt-1">
                    <div className="text-sm font-extrabold text-[#1E3932]">
                      Quét mã để chuyển khoản ngay
                    </div>
                    <div className="text-[11px] text-[#6F7E72]">
                      Hỗ trợ chuyển khoản liên ngân hàng Napas247
                    </div>
                  </div>
                </div>

                <a
                  href={qrData.qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#E6E2D8]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#006241]" />
                  <span>Mở hình ảnh QR đầy đủ</span>
                </a>
              </div>

              {/* CỘT BÊN PHẢI: CHI TIẾT THÔNG TIN CHUYỂN KHOẢN */}
              <div className="bg-white border border-[#E6E2D8] rounded-[32px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-2xl text-[#1E3932]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-extrabold text-[#6F7E72] uppercase tracking-widest block">
                        TRANSFER DETAILS
                      </span>
                      <h3 className="text-base font-extrabold text-[#1E3932]">
                        Chi Tiết Chuyển Khoản
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#006241]/10 text-[#006241] border border-[#006241]/20 text-[11px] font-mono font-bold">
                      #{qrTx.transactionCode || qrTx.id}
                    </span>
                  </div>

                  {/* Highlighted Amount Container */}
                  <div className="bg-[#006241]/10 border border-[#006241]/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-extrabold text-[#006241] uppercase tracking-wider block">
                        SỐ TIỀN CẦN THANH TOÁN
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-[#006241] font-mono">
                        {Number(qrData.amount).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#006241]/20 text-[#006241] flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Detailed Information List */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#6F7E72] uppercase block mb-0.5">
                        Người Yêu Cầu
                      </span>
                      <div className="font-extrabold text-[#1E3932] text-sm">
                        {qrTx.user?.username || `User #${qrTx.userId}`}
                      </div>
                      <div className="text-[11px] text-[#6F7E72] font-mono">
                        {qrTx.user?.email || ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-[#6F7E72] uppercase block mb-0.5">
                          Ngân Hàng
                        </span>
                        <div className="font-black text-[#006241] text-sm">
                          {qrData.bankName}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#6F7E72] uppercase block mb-0.5">
                          Tên Chủ Tài Khoản
                        </span>
                        <div className="font-extrabold uppercase text-[#1E3932] text-xs truncate bg-[#F9F8F3] px-2.5 py-1 rounded-lg border border-[#E6E2D8]">
                          {qrData.bankAccountName}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-[#6F7E72] uppercase">
                          Số Tài Khoản (STK)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(qrData.bankNumber, 'số tài khoản')}
                          className="text-[10px] text-[#006241] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Copy className="w-3 h-3" /> Chép
                        </button>
                      </div>
                      <div className="font-mono font-black text-[#1E3932] text-base bg-[#F9F8F3] px-3 py-1.5 rounded-xl border border-[#E6E2D8] tracking-wider">
                        {qrData.bankNumber}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-[#6F7E72] uppercase">
                          Nội Dung Chuyển Khoản
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(qrData.addInfo, 'nội dung chuyển khoản')}
                          className="text-[10px] text-[#006241] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Copy className="w-3 h-3" /> Chép
                        </button>
                      </div>
                      <div className="font-mono font-bold text-[#1E3932] text-xs bg-[#F9F8F3] p-3 rounded-xl border border-[#E6E2D8] break-all leading-relaxed">
                        {qrData.addInfo}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2F0EB]">
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#6F7E72] hover:text-[#1E3932] text-xs font-bold transition-all border border-[#E6E2D8] cursor-pointer"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingId === qrTx.id}
                    onClick={() => handleApprove(qrTx.id)}
                    className="px-6 py-2.5 rounded-2xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessingId === qrTx.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                    <span>Xác Nhận Đã Thanh Toán</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E6E2D8] text-rose-600 rounded-[32px] p-8 shadow-2xl text-center text-xs font-bold space-y-3">
              <div>Không thể khởi tạo dữ liệu mã QR. Vui lòng kiểm tra lại ví người dùng.</div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 bg-[#F2F0EB] text-[#1E3932] rounded-xl text-xs font-bold border border-[#E6E2D8]"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="w-full max-w-md bg-white rounded-[28px] border border-[#E6E2D8] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#F2F0EB] pb-3">
              <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Từ Chối Yêu Cầu Giao Dịch #{rejectTxId}</span>
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-[#6F7E72] hover:text-[#1E3932] p-1 rounded-full hover:bg-[#F2F0EB] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#1E3932] block">
                  Lý do từ chối (Không bắt buộc):
                </label>
                <textarea
                  rows={3}
                  tabIndex={1}
                  placeholder="Nhập lý do từ chối (Ví dụ: Thông tin STK ngân hàng không chính xác...)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#F9F8F3] border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F0EB]">
                <button
                  type="button"
                  tabIndex={2}
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#E6E2D8] text-xs font-bold text-[#6F7E72] hover:bg-[#F2F0EB] transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={isProcessingId === rejectTxId}
                  tabIndex={3}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isProcessingId === rejectTxId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Xác Nhận Từ Chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminApprovalsDataTable: React.FC<{
  filteredList: CoinTransactionData[];
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  handleApproveClick: (item: CoinTransactionData) => void;
  handleOpenRejectModal: (id: number) => void;
  isProcessingId: number | null;
}> = ({
  filteredList,
  openMenuId,
  setOpenMenuId,
  handleApproveClick,
  handleOpenRejectModal,
  isProcessingId,
}) => {
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
    } = useDataTable<CoinTransactionData>({
      data: filteredList,
      initialPageSize: 10,
      initialSortField: 'id',
      initialSortDirection: 'desc',
      searchFields: ['id', 'transactionCode', 'amount', 'type', 'status', (item) => item.user?.username || '', (item) => item.user?.email || ''],
      sortAccessors: {
        user: (item) => item.user?.username || '',
        amount: (item) => item.amount,
      },
      storageKey: 'sporting_admin_approvals_page_size',
    });

    if (filteredList.length === 0) {
      return (
        <div className="p-12 text-center rounded-2xl bg-[#F2F0EB]/50 border border-dashed border-[#E6E2D8] space-y-2 font-['Plus_Jakarta_Sans',sans-serif]">
          <AlertCircle className="w-8 h-8 text-[#6F7E72] mx-auto" />
          <h4 className="text-sm font-bold text-[#1E3932]">
            Không có đơn cần duyệt nào trong danh mục này
          </h4>
          <p className="text-xs text-[#6F7E72]">
            Tất cả yêu cầu đã được xử lý hoặc chưa có yêu cầu mới.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-[28px] border border-[#E6E2D8] shadow-xs overflow-hidden flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1E3932]">
            <thead className="bg-[#FBF8F0] border-b border-[#E6E2D8]">
              <tr>
                <DataTableHeader
                  label="MÃ GD"
                  field="id"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="NGƯỜI YÊU CẦU"
                  field="user"
                  sortable={false}
                />
                <DataTableHeader
                  label="LOẠI YÊU CẦU"
                  field="type"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.type}
                  onFilterChange={(val) => setColumnFilter('type', val)}
                  filterOptions={[
                    { label: 'Rút Tiền', value: 'withdraw' },
                    { label: 'Hoàn Tiền', value: 'refund' },
                  ]}
                />
                <DataTableHeader
                  label="SỐ TIỀN"
                  field="amount"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <DataTableHeader
                  label="THÔNG TIN CHUYỂN KHOẢN / CHI TIẾT"
                  field="description"
                  sortable={false}
                />
                <DataTableHeader
                  label="THỜI GIAN"
                  field="createdAt"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <DataTableHeader
                  label="TRẠNG THÁI"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                  filterValue={columnFilters.status}
                  onFilterChange={(val) => setColumnFilter('status', val)}
                  filterOptions={[
                    { label: 'Chờ Duyệt', value: 'pending' },
                    { label: 'Đã Duyệt', value: 'completed' },
                    { label: 'Từ Chối', value: 'failed' },
                  ]}
                />
                <DataTableHeader label="HÀNH ĐỘNG" align="right" sortable={false} />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0EB] text-[#1E3932] font-semibold">
              {paginatedData.map((item) => {
                const isPending = item.status === 'pending';
                const isWithdraw = item.type === 'withdraw';
                const isRefund = item.type === 'refund';
                const isCompleted = item.status === 'completed';
                const isFailed = item.status === 'failed' || item.status === 'cancelled';
                const dateStr = new Date(item.createdAt).toLocaleString('vi-VN');

                return (
                  <tr key={item.id} className="hover:bg-[#FBF8F0] transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-extrabold text-[#006241]">
                      #{item.transactionCode || item.id}
                    </td>

                    <td className="p-3.5">
                      <div className="font-extrabold text-[#1E3932]">
                        {item.user?.username || `User #${item.userId}`}
                      </div>
                      <div className="text-[10px] text-[#6F7E72] font-mono">
                        {item.user?.email || ''}
                      </div>
                    </td>

                    <td className="p-3.5">
                      {isWithdraw && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] font-extrabold border border-emerald-500/20">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          Rút Tiền Ngân Hàng
                        </span>
                      )}
                      {isRefund && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-extrabold border border-amber-500/20">
                          <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                          Refund Hoàn Tiền
                        </span>
                      )}
                      {!isWithdraw && !isRefund && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {item.type}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-mono font-black text-sm text-[#006241]">
                      {Number(item.amount || 0).toLocaleString('vi-VN')}đ
                    </td>

                    <td className="p-3.5 text-xs text-[#6F7E72]">
                      <div className="font-medium max-w-xs leading-relaxed text-[#1E3932]">
                        {item.description || 'Không có ghi chú'}
                      </div>
                    </td>

                    <td className="p-3.5 text-[11px] font-mono text-[#6F7E72]">
                      {dateStr}
                    </td>

                    <td className="p-3.5 text-center">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-extrabold border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Chờ Duyệt
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-[11px] font-extrabold border border-[#006241]/20">
                          <CheckCircle2 className="w-3 h-3 text-[#006241]" />
                          Đã Duyệt
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-800 text-[11px] font-extrabold border border-rose-500/20">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Từ Chối
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 pr-5 text-right">
                      {isPending ? (
                        <ApprovalActionMenu
                          item={item}
                          openId={openMenuId}
                          setOpenId={setOpenMenuId}
                          handleApproveClick={handleApproveClick}
                          handleOpenRejectModal={handleOpenRejectModal}
                          isProcessing={isProcessingId === item.id}
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#6F7E72]">
                          Đã xử lý
                        </span>
                      )}
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
          itemLabel="yêu cầu duyệt"
        />
      </div>
    );
  };

