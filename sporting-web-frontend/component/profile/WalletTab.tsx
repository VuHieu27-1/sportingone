import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowDownRight,
  ArrowUpRight,
  History,
  CreditCard,
  Plus,
  Download,
  RefreshCw,
  X,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Save,
  Edit3,
  Copy,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { walletService, WalletData } from '../../services/walletService';
import {
  coinTransactionService,
  CoinTransactionData,
} from '../../services/coinTransactionService';
import { apiClient } from '../../services/apiClient';
import { getPayOSQrImageUrl } from '../../utils/payosQr';
import { triggerPaymentSuccessCelebration } from '../../utils/celebrationEffects';

interface VietQRBankItem {
  id: number;
  name: string;
  code: string;
  shortName: string;
  short_name?: string;
  logo?: string;
}

interface PayOSDepositModalData {
  orderCode: number;
  checkoutUrl: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  bin?: string;
}

export const WalletTab: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [bankName, setBankName] = useState<string>('');
  const [bankNumber, setBankNumber] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');
  const [banksList, setBanksList] = useState<VietQRBankItem[]>([]);
  const [transactions, setTransactions] = useState<CoinTransactionData[]>([]);

  const sanitizeBankAccountName = (val: string): string => {
    if (!val) return '';
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z\s]/g, '');
  };

  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(true);
  const [isSavingBank, setIsSavingBank] = useState<boolean>(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action') === 'deposit' || params.get('openDeposit') === 'true';
  });
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCloseDepositModal = () => {
    setDepositModalOpen(false);
    if (searchParams.get('action') === 'deposit' || searchParams.get('openDeposit') === 'true') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('openDeposit');
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const openDeposit = searchParams.get('openDeposit');
    if (action === 'deposit' || openDeposit === 'true') {
      setDepositModalOpen(true);
    }
  }, [searchParams]);

  const [payosModalOpen, setPayosModalOpen] = useState(false);
  const [payosDepositData, setPayosDepositData] = useState<PayOSDepositModalData | null>(null);
  const [payosStatus, setPayosStatus] = useState<'PENDING' | 'SUCCESS' | 'CANCELLED'>('PENDING');

  /**
   * Retrieves Wallet information.
   */
  const fetchWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const res = await walletService.getMyWallet();
      if (res.success && res.data) {
        setWallet(res.data);
        setBalance(Number(res.data.balance || 0));
        setBankName(res.data.bankName || '');
        setBankNumber(res.data.bankNumber || '');
        setBankAccountName(res.data.bankAccountName || '');
      } else {
        setWallet(null);
        setBalance(0);
      }
    } catch {
      setBalance(0);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  /**
   * Retrieves Transactions information.
   */
  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const res = await coinTransactionService.getMyTransactions();
      if (res.success && Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch {
      setTransactions([]);
    } finally {
      setIsLoadingTx(false);
    }
  };

  /**
   * Validates and verifies parameters for checkPayOSCallback.
   */
  const checkPayOSCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    const statusParam = params.get('status');

    if (orderCode) {
      toast.loading('Đang đồng bộ giao dịch nạp xu PayOS...', { id: 'sync-payos' });
      try {
        const syncRes = await coinTransactionService.syncDepositStatus(orderCode);
        if (syncRes.success && (syncRes.data?.status === 'completed' || statusParam === 'success')) {
          triggerPaymentSuccessCelebration();
          toast.success('Nạp xu thành công! Số dư ví đã được cập nhật.', { id: 'sync-payos' });
        } else if (statusParam === 'cancel' || syncRes.data?.status === 'cancelled') {
          toast.error('Giao dịch nạp xu đã bị hủy.', { id: 'sync-payos' });
        } else {
          toast.dismiss('sync-payos');
        }
      } catch {
        toast.dismiss('sync-payos');
      } finally {
        const newUrl = window.location.pathname + '?tab=wallet';
        window.history.replaceState({}, '', newUrl);
        fetchWallet();
        fetchTransactions();
      }
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
    checkPayOSCallback();

    apiClient.get<VietQRBankItem[]>('/banks').then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setBanksList(res.data);
      }
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (payosModalOpen && payosDepositData && payosStatus === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const syncRes = await coinTransactionService.syncDepositStatus(payosDepositData.orderCode);
          if (syncRes.success && syncRes.data?.status === 'completed') {
            setPayosStatus('SUCCESS');
            triggerPaymentSuccessCelebration();
            toast.success(
              `Nạp xu thành công! +${(payosDepositData.amount || 0).toLocaleString('vi-VN')} Xu đã được cộng vào ví.`,
              { id: 'coin-deposit-success' },
            );
            fetchWallet();
            fetchTransactions();
            setTimeout(() => {
              setPayosModalOpen(false);
              setPayosDepositData(null);
            }, 2500);
          } else if (syncRes.data?.status === 'cancelled') {
            setPayosStatus('CANCELLED');
            toast.error('Giao dịch nạp xu đã bị hủy.', { id: 'coin-deposit-cancelled' });
          }
        } catch {
        }
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [payosModalOpen, payosDepositData, payosStatus]);

  /**
   * Handles event processing for handleSaveBankInfo.
   */
  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      toast.error('Vui lòng chọn hoặc nhập tên ngân hàng.');
      return;
    }
    if (!bankNumber.trim()) {
      toast.error('Vui lòng nhập số tài khoản ngân hàng.');
      return;
    }
    const cleanAccountName = sanitizeBankAccountName(bankAccountName);
    if (!cleanAccountName.trim()) {
      toast.error('Vui lòng nhập tên chủ tài khoản (Viết in hoa, không dấu).');
      return;
    }
    if (!/^[A-Z\s]+$/.test(cleanAccountName)) {
      toast.error('Tên chủ tài khoản chỉ được chứa chữ cái in hoa không dấu, không số/ký tự đặc biệt (VD: NGUYEN VAN A).');
      return;
    }

    setIsSavingBank(true);
    try {
      const res = await walletService.saveMyBankInfo({
        bankName: bankName.trim(),
        bankNumber: bankNumber.trim(),
        bankAccountName: cleanAccountName.trim(),
      });

      if (res.success && res.data) {
        setWallet(res.data);
        setBalance(Number(res.data.balance || 0));
        setBankName(res.data.bankName || '');
        setBankNumber(res.data.bankNumber || '');
        setBankAccountName(res.data.bankAccountName || '');
        toast.success('Lưu thông tin ngân hàng liên kết thành công!');
        setBankModalOpen(false);
      } else {
        toast.error(res.message || 'Lưu thông tin ngân hàng thất bại.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setIsSavingBank(false);
    }
  };

  /**
   * Handles event processing for handleDepositSubmit.
   */
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput);
    if (!val || val < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000 VNĐ (10.000 Xu).');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await coinTransactionService.createDeposit(val);
      if (res.success && res.data) {
        handleCloseDepositModal();
        setAmountInput('');

        setPayosDepositData(res.data);
        setPayosStatus('PENDING');
        setPayosModalOpen(true);
        toast.success('Khởi tạo mã VietQR thanh toán PayOS thành công!');
      } else {
        toast.error(res.message || 'Không thể tạo đơn nạp xu từ PayOS');
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã có lỗi xảy ra khi gọi PayOS');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles event processing for handleWithdrawSubmit.
   */
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet?.bankName || !wallet?.bankNumber || !wallet?.bankAccountName) {
      toast.error('Vui lòng liên kết thông tin ngân hàng trước khi rút xu.');
      setBankModalOpen(true);
      return;
    }

    const val = Number(amountInput);
    if (!val || val < 20000) {
      toast.error('Số tiền rút tối thiểu là 20.000 Xu.');
      return;
    }
    if (val > balance) {
      toast.error('Số dư Xu không đủ để thực hiện giao dịch này.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await coinTransactionService.requestWithdraw({
        amount: val,
        bankName: wallet.bankName,
        bankNumber: wallet.bankNumber,
        bankAccountName: wallet.bankAccountName,
      });

      if (res.success) {
        toast.success(res.message || 'Đã gửi yêu cầu rút tiền thành công, đang chờ Admin duyệt!');
        setWithdrawModalOpen(false);
        setAmountInput('');
        fetchWallet();
        fetchTransactions();
      } else {
        toast.error(res.message || 'Không thể tạo yêu cầu rút xu');
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã có lỗi xảy ra khi tạo yêu cầu rút xu.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles event processing for handleCopyText.
   */
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`, { id: 'copy-payos-toast' });
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="p-6 sm:p-8 rounded-[28px] bg-[#1E3932] text-[#FBF8F0] border border-[#006241]/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#006241]/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <WalletIcon className="w-4 h-4 text-emerald-400" />
            Ví Tài Khoản Sporting One
          </div>
          <div>
            <span className="block text-xs font-semibold text-[#A3B1A8] uppercase tracking-wider">
              Tổng Số Dư Xu
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#FBF8F0] tracking-tight flex items-baseline gap-2 mt-1">
              {isLoadingWallet ? (
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              ) : (
                <>
                  <span>{balance.toLocaleString('vi-VN')}</span>
                  <span className="text-emerald-400 text-lg font-mono">XU</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-[#A3B1A8] font-medium">
            1 Xu = 1 VNĐ. Xu dùng để thanh toán đặt sân và tham gia giải đấu.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={() => {
              setAmountInput('');
              setDepositModalOpen(true);
            }}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-extrabold text-xs shadow-lg transition-all cursor-pointer border border-white/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nạp Xu PayOS</span>
          </button>

          <button
            onClick={() => {
              if (!wallet?.bankName || !wallet?.bankNumber) {
                toast.error(
                  'Bạn chưa liên kết ngân hàng. Vui lòng cập nhật ngân hàng trước khi rút!',
                );
                setBankName(wallet?.bankName || '');
                setBankNumber(wallet?.bankNumber || '');
                setBankModalOpen(true);
                return;
              }
              setAmountInput('');
              setWithdrawModalOpen(true);
            }}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FBF8F0] font-extrabold text-xs transition-all cursor-pointer border border-white/20"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Rút Xu</span>
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F0EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#1E3932] text-base">
                Tài Khoản Ngân Hàng Liên Kết
              </h3>
              <p className="text-xs text-[#6F7E72] font-medium">
                Tài khoản dùng cho dịch vụ nạp/rút xu và chuyển khoản chi hộ VietQR
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setBankName(wallet?.bankName || '');
              setBankNumber(wallet?.bankNumber || '');
              setBankAccountName(wallet?.bankAccountName || '');
              setBankModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-extrabold text-xs transition-all cursor-pointer border border-[#E6E2D8]"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#006241]" />
            <span>
              {wallet?.bankName && wallet?.bankNumber
                ? 'Chỉnh Sửa Ngân Hàng'
                : 'Liên Kết Ngân Hàng'}
            </span>
          </button>
        </div>

        {wallet?.bankName && wallet?.bankNumber ? (
          <div className="p-5 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1E3932] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-[#006241]">
                <CreditCard className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#1E3932] text-base">
                    {wallet.bankName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã liên kết
                  </span>
                </div>
                {wallet.bankAccountName && (
                  <p className="text-xs font-bold text-[#1E3932] uppercase mt-0.5 tracking-wide">
                    Chủ tài khoản:{' '}
                    <span className="font-black text-[#006241]">{wallet.bankAccountName}</span>
                  </p>
                )}
                <p className="text-xs font-mono font-bold text-[#6F7E72] mt-0.5 tracking-wider">
                  Số tài khoản:{' '}
                  <span className="text-[#1E3932] font-extrabold">
                    {wallet.bankNumber}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm">
                  Chưa liên kết tài khoản ngân hàng
                </h4>
                <p className="text-xs text-amber-700 font-medium">
                  Vui lòng thêm tài khoản ngân hàng chính chủ để thực hiện các giao
                  dịch rút tiền.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F0EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
              <History className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-[#1E3932] text-base">
              Lịch Sử Giao Dịch Ví
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#6F7E72]">
            {transactions.length} Giao dịch
          </span>
        </div>

        <div className="divide-y divide-[#F2F0EB]">
          {isLoadingTx ? (
            <div className="py-6 text-center text-xs text-[#6F7E72] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#006241]" />
              <span>Đang tải lịch sử giao dịch xu...</span>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-[#6F7E72] font-medium py-4 text-center">
              Chưa có giao dịch xu nào được ghi nhận.
            </p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'deposit' || tx.type === 'refund'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-rose-500/10 text-rose-700'
                      }`}
                  >
                    {tx.type === 'deposit' || tx.type === 'refund' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#1E3932] text-sm leading-snug">
                      {tx.description ||
                        (tx.type === 'deposit'
                          ? 'Nạp Xu vào ví'
                          : 'Rút / Thanh toán Xu')}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#6F7E72] font-mono">
                      <span>Mã GD: #{tx.transactionCode || tx.id}</span>
                      <span>·</span>
                      <span>
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-base font-black font-mono block ${tx.type === 'deposit' || tx.type === 'refund'
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                      }`}
                  >
                    {tx.type === 'deposit' || tx.type === 'refund'
                      ? `+${Math.abs(Number(tx.amount || 0)).toLocaleString('vi-VN')}`
                      : `-${Math.abs(Number(tx.amount || 0)).toLocaleString('vi-VN')}`}{' '}
                    Xu
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${tx.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : tx.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                      }`}
                  >
                    {tx.status === 'completed'
                      ? 'Thành công'
                      : tx.status === 'pending'
                        ? 'Đang chờ xử lý'
                        : 'Bị hủy'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {depositModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Nạp Xu Vào Ví Account</h3>
              </div>
              <button
                onClick={handleCloseDepositModal}
                className="text-[#A3B1A8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Số Xu cần nạp (1 Xu = 1 VNĐ)
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6E2D8] text-base font-extrabold text-[#006241] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
                <p className="text-[11px] text-[#6F7E72] mt-1 font-medium">
                  Nạp tối thiểu 10.000 Xu. Bạn có thể thanh toán trực tiếp qua chuyển khoản VietQR PayOS.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[50000, 100000, 200000, 500000, 1000000, 2000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountInput(String(preset))}
                    className="py-2 px-2 rounded-xl bg-white border border-[#E6E2D8] hover:border-[#006241] text-xs font-bold font-mono text-[#1E3932] transition-colors cursor-pointer"
                  >
                    +{preset.toLocaleString('vi-VN')} Xu
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 text-xs text-[#1E3932] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006241] shrink-0" />
                <span>
                  Hệ thống sẽ khởi tạo mã VietQR PayOS trực tiếp để bạn quét mã thanh toán.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={handleCloseDepositModal}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-full bg-[#006241] text-[#FBF8F0] font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác Nhận Nạp</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PayOS QR Modal */}
      {payosModalOpen && payosDepositData && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-[#FBFBF9] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#006241]/10 flex items-center justify-center text-[#006241]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1E3932] tracking-tight">
                    Thanh Toán Nạp Xu - VietQR PayOS
                  </h2>
                </div>
              </div>

              <button
                onClick={() => {
                  setPayosModalOpen(false);
                  setPayosDepositData(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {payosStatus === 'SUCCESS' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Thanh toán thành công! +{(payosDepositData.amount || 0).toLocaleString('vi-VN')} Xu đã được cộng vào ví của bạn.
                  </span>
                </div>
              )}

              {payosStatus === 'CANCELLED' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Giao dịch nạp xu này đã bị hủy.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center bg-[#FAF8F5] border border-slate-200/70 rounded-2xl p-4 text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-sm w-full max-w-[240px]">
                    <img
                      src={getPayOSQrImageUrl(
                        payosDepositData.qrCode,
                        payosDepositData.bin || '970422',
                        payosDepositData.accountNumber || 'V3CAS5601571936',
                        payosDepositData.amount || 0,
                        payosDepositData.description || `Nap xu #${payosDepositData.orderCode}`,
                        payosDepositData.accountName || 'SPORTING ONE',
                      )}
                      alt="VietQR PayOS Nạp Xu"
                      className="w-full h-auto object-contain rounded-md max-h-[240px]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-7">
                  <div className="p-4 bg-[#FBF8F0] border border-[#E6E2D8] rounded-2xl space-y-3 text-xs shadow-sm">
                    <div className="text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider flex items-center justify-between border-b border-[#E6E2D8] pb-2">
                      <span>THÔNG TIN CHUYỂN KHOẢN</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#006241] font-extrabold font-mono text-[10px]">
                        NAPAS 24/7
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#6F7E72] py-0.5">
                      <span className="font-semibold">Chủ tài khoản:</span>
                      <span className="font-extrabold text-[#1E3932] uppercase">
                        {payosDepositData.accountName || 'SPORTING ONE'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#6F7E72] py-0.5">
                      <span className="font-semibold">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5 font-mono font-extrabold text-[#006241] text-sm">
                        <span>{payosDepositData.accountNumber || 'V3CAS5601571936'}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              payosDepositData.accountNumber || 'V3CAS5601571936',
                              'Số tài khoản',
                            )
                          }
                          className="p-1 rounded-md bg-white hover:bg-[#006241] hover:text-white border border-[#E6E2D8] text-[#1E3932] transition-colors cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#6F7E72] py-0.5">
                      <span className="font-semibold">Số tiền nạp:</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-[#006241] text-sm">
                        <span>{(payosDepositData.amount || 0).toLocaleString('vi-VN')} đ</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              String(payosDepositData.amount || 0),
                              'Số tiền',
                            )
                          }
                          className="p-1 rounded-md bg-white hover:bg-[#006241] hover:text-white border border-[#E6E2D8] text-[#1E3932] transition-colors cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center justify-between gap-2 mt-2">
                      <div>
                        <span className="block font-semibold text-[10px] text-amber-700 uppercase tracking-wider">
                          Nội dung CK:
                        </span>
                        <span className="font-mono font-black text-[#1E3932] text-xs break-all">
                          {payosDepositData.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            payosDepositData.description || '',
                            'Nội dung chuyển khoản',
                          )
                        }
                        className="p-1.5 rounded-lg bg-white hover:bg-amber-700 hover:text-white border border-amber-300 text-amber-800 transition-colors cursor-pointer shrink-0 shadow-sm"
                        title="Sao chép nội dung chuyển khoản"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-[#FBFBF9] flex items-center justify-between text-xs">
              <button
                onClick={async () => {
                  if (payosDepositData?.orderCode) {
                    await coinTransactionService.cancelDeposit(payosDepositData.orderCode);
                    toast.error('Đã hủy giao dịch nạp xu.');
                    fetchTransactions();
                  }
                  setPayosModalOpen(false);
                  setPayosDepositData(null);
                }}
                className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200/80 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Hủy giao dịch</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bank Modal */}
      {bankModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">
                  {wallet?.bankName
                    ? 'Chỉnh Sửa Thông Tin Ngân Hàng'
                    : 'Liên Kết Ngân Hàng Rút Tiền'}
                </h3>
              </div>
              <button
                onClick={() => setBankModalOpen(false)}
                className="text-[#A3B1A8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankInfo} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                  Tên Ngân Hàng <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="vietqr-banks-modal-list"
                    required
                    tabIndex={1}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Chọn hoặc nhập tên ngân hàng..."
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6E2D8] text-sm font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                  />
                  <datalist id="vietqr-banks-modal-list">
                    {banksList.map((b) => (
                      <option
                        key={b.id}
                        value={b.shortName || b.short_name || b.name}
                      >
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                  Số Tài Khoản Ngân Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  tabIndex={2}
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                  placeholder="Ví dụ: 99998888666"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6E2D8] text-sm font-mono font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1.5 flex items-center justify-between">
                  <span>Tên Chủ Tài Khoản Ngân Hàng <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-[#6F7E72] font-semibold">Viết in hoa, không dấu</span>
                </label>
                <input
                  type="text"
                  required
                  tabIndex={3}
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(sanitizeBankAccountName(e.target.value))}
                  placeholder="Ví dụ: NGUYEN VU HIEU"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6E2D8] text-sm font-extrabold uppercase text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
                <p className="text-[11px] text-[#6F7E72] mt-1 font-medium">
                  Tự động chuẩn hóa chữ IN HOA không dấu (không chứa số hoặc ký tự đặc biệt)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#006241]/10 text-xs text-[#1E3932] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006241] shrink-0" />
                <span>
                  Kiểm tra kỹ tên ngân hàng và số tài khoản chính chủ trước khi bấm
                  Lưu.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  tabIndex={4}
                  onClick={() => setBankModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  tabIndex={5}
                  className="px-6 py-2.5 rounded-full bg-[#006241] text-[#FBF8F0] font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingBank ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Lưu Thông Tin Ngân Hàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Withdraw Modal */}
      {withdrawModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">
                  Rút Xu Về Ngân Hàng Liên Kết
                </h3>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="text-[#A3B1A8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Số Xu cần rút (Tối đa: {balance.toLocaleString('vi-VN')} Xu)
                </label>
                <input
                  type="number"
                  required
                  min={20000}
                  max={balance}
                  tabIndex={1}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Ví dụ: 100000"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6E2D8] text-base font-bold text-[#1E3932] font-mono focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 text-xs text-[#1E3932] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006241] shrink-0" />
                <span>
                  Yêu cầu rút Xu sẽ được hệ thống xử lý và chuyển vào tài khoản chính
                  chủ của bạn: {wallet?.bankName} - {wallet?.bankNumber}.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-full bg-[#006241] text-[#FBF8F0] font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác Nhận Rút</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
