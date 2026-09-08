import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  KeyRound,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AiApiKeyItem,
  CreateAiApiKeyPayload,
  UpdateAiApiKeyPayload,
  aiApiKeyService,
  TestKeyResult,
  AiProvider,
  AiKeyStatus,
} from '../../services/aiApiKeyService';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

interface AdminAiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingKey?: AiApiKeyItem | null;
}

export const AdminAiKeyModal: React.FC<AdminAiKeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingKey,
}) => {
  const isEditing = !!editingKey;

  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<AiKeyStatus>('active');
  const [priority, setPriority] = useState<number>(1);
  const [note, setNote] = useState('');

  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestKeyResult | null>(null);

  // Business status select options with clean vector SVG icons
  const statusOptions: SelectOption[] = [
    {
      value: 'active',
      label: 'Đang hoạt động (Active)',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    },
    {
      value: 'cooldown',
      label: 'Đang Cooldown (Tạm nghỉ)',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    },
    {
      value: 'disabled',
      label: 'Đã tắt kết nối (Disabled)',
      icon: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    },
  ];

  useEffect(() => {
    if (editingKey) {
      setName(editingKey.name || '');
      setApiKey(editingKey.apiKey || '');
      setStatus(editingKey.status || 'active');
      setPriority(editingKey.priority || 1);
      setNote(editingKey.note || '');
    } else {
      setName('');
      setApiKey('');
      setStatus('active');
      setPriority(1);
      setNote('');
    }
    setShowKey(false);
    setTestResult(null);
  }, [editingKey, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập mã API Key trước khi kiểm tra');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await aiApiKeyService.testKey(trimmed, 'gemini');
      setTestResult(res);
      if (res.valid) {
        toast.success(res.message || 'API Key hợp lệ và hoạt động tốt!');
      } else {
        toast.error(res.message || 'Kiểm tra thất bại, API Key không hợp lệ!');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi kiểm tra kết nối API Key';
      setTestResult({
        valid: false,
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Vui lòng nhập tên nhận diện cho API Key');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập mã API Key');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingKey) {
        const payload: UpdateAiApiKeyPayload = {
          name: name.trim(),
          apiKey: apiKey.trim(),
          provider: 'gemini',
          status,
          priority: Number(priority) || 1,
          note: note.trim() || undefined,
        };
        await aiApiKeyService.updateKey(editingKey.id, payload);
        toast.success(`Đã cập nhật API Key [${name}] thành công!`);
      } else {
        const payload: CreateAiApiKeyPayload = {
          name: name.trim(),
          apiKey: apiKey.trim(),
          provider: 'gemini',
          status,
          priority: Number(priority) || 1,
          note: note.trim() || undefined,
        };
        await aiApiKeyService.createKey(payload);
        toast.success(`Đã thêm mới API Key [${name}] vào hệ thống!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu API Key';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200 text-left">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shadow-xs select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {isEditing ? 'Chỉnh Sửa API Key' : 'Thêm API Key'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấu hình API Key phục vụ cơ chế tự động xoay vòng đa tầng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tên Key */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Tên nhận diện API Key <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: AI Key 01 - Production"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Mã API Key <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Lấy từ bảng điều khiển API Key của bạn
              </span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập mã API Key..."
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showKey ? 'Ẩn mã key' : 'Hiện mã key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Test connection row */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Kiểm tra tính hợp lệ và tốc độ phản hồi của Key trước khi lưu
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang test...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Kết Nối</span>
                </>
              )}
            </button>
          </div>

          {/* Test result display */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${testResult.valid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{testResult.message}</p>
                {testResult.latencyMs !== undefined && (
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Độ trễ: {testResult.latencyMs}ms | Trạng thái: Sẵn sàng
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Mức độ ưu tiên (Priority)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Số nhỏ hơn được ưu tiên sử dụng trước (VD: 1 trước 2).
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Trạng thái hoạt động
              </label>
              <CustomSelect
                options={statusOptions}
                value={status}
                onChange={(val) => setStatus(val as AiKeyStatus)}
                size="md"
                className="w-full"
                buttonClassName="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Key dự phòng cấp cho dự án, hạn mức 15 RPM..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? 'Lưu Thay Đổi' : 'Connect Integration'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
