import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác Nhận',
  cancelText = 'Bỏ Qua',
  type = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-[#006241]" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-rose-600" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-100/80 border-rose-200';
      case 'warning':
        return 'bg-amber-100/80 border-amber-200';
      case 'info':
        return 'bg-[#006241]/10 border-[#006241]/20';
      default:
        return 'bg-rose-100/80 border-rose-200';
    }
  };

  const getConfirmBtnStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:bg-rose-800';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:bg-amber-800';
      case 'info':
        return 'bg-[#006241] hover:bg-[#1E3932] text-white shadow-[#006241]/20 active:bg-[#004d33]';
      default:
        return 'bg-rose-600 hover:bg-rose-700 text-white';
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div className="relative w-full max-w-md bg-[#FBF8F0] rounded-[28px] border border-[#E6E2D8] p-6 shadow-2xl z-10 space-y-5 text-[#1E3932] animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Đóng cửa sổ xác nhận"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#6F7E72] hover:text-[#1E3932] border border-[#E6E2D8] transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${getIconBg()}`}>
            {getIcon()}
          </div>
          <div className="flex-1 pr-6">
            <h3 id="confirm-modal-title" className="text-lg font-extrabold text-[#1E3932] leading-tight">
              {title}
            </h3>
            <p id="confirm-modal-description" className="text-xs text-[#6F7E72] font-medium mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[40px] px-5 py-2.5 rounded-full bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-[40px] px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${getConfirmBtnStyle()}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
