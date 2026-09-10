import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  ShieldCheck,
  X,
  FileArchive,
  ArrowRight,
  HardDrive,
  Cloud,
} from 'lucide-react';
import {
  BackupItem,
  RestoreExecutionResult,
  RestoreStepLog,
  backupRestoreService,
} from '../../services/backupRestoreService';

interface AdminSafetyRestoreModalProps {
  backup: BackupItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (result: RestoreExecutionResult) => void;
}

const MANDATORY_STEPS = [
  { step: 1, name: 'Select Backup', label: '1. Chọn bản sao lưu mục tiêu' },
  { step: 2, name: 'Confirm Restore', label: '2. Xác nhận quyền Quản trị viên' },
  { step: 3, name: 'Download Backup', label: '3. Nạp dữ liệu từ kho lưu trữ' },
  { step: 4, name: 'Validate Backup', label: '4. Kiểm tra Checksum & Manifest' },
  { step: 5, name: 'SAFETY BACKUP CURRENT DATA', label: '5. SAFETY BACKUP DỮ LIỆU HIỆN TẠI', isSafety: true },
  { step: 6, name: 'Verify Safety Backup SUCCESS', label: '6. Xác minh Safety Backup SUCCESS', isSafety: true },
  { step: 7, name: 'Restore Selected Backup', label: '7. Ghi đè & Khôi phục dữ liệu mục tiêu' },
  { step: 8, name: 'Verify Restore', label: '8. Kiểm tra tính toàn vẹn hệ thống' },
  { step: 9, name: 'Complete', label: '9. Hoàn tất quy trình phục hồi an toàn' },
];

export const AdminSafetyRestoreModal: React.FC<AdminSafetyRestoreModalProps> = ({
  backup,
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [stepLogs, setStepLogs] = useState<RestoreStepLog[]>([]);
  const [restoreResult, setRestoreResult] = useState<RestoreExecutionResult | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !backup || !mounted || typeof document === 'undefined') return null;

  const handleStartRestore = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setRestoreResult(null);

    // Initial simulation of steps UI before receiving full backend trace
    setActiveStepIndex(1);
    const initialLogs: RestoreStepLog[] = [
      {
        step: 1,
        name: 'Select Backup',
        status: 'SUCCESS',
        message: `Đã chọn: ${backup.filename}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        step: 2,
        name: 'Confirm Restore',
        status: 'SUCCESS',
        message: 'Xác nhận từ Admin đã được phê duyệt.',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        step: 3,
        name: 'Download Backup',
        status: 'RUNNING',
        message: 'Đang nạp file sao lưu mục tiêu...',
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    setStepLogs(initialLogs);

    try {
      // Execute restore flow on backend (which strictly performs steps 1 -> 9)
      setActiveStepIndex(5); // In-progress indicator focusing on Safety Backup
      const result = await backupRestoreService.restoreBackup(backup.id);

      setRestoreResult(result);
      setStepLogs(result.executionTrace);
      setActiveStepIndex(9);
      onRestoreSuccess(result);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Quá trình khôi phục thất bại hoặc Safety Backup không vượt qua xác minh.';
      setErrorMsg(msg);
      setActiveStepIndex(-1);
    } finally {
      setIsRunning(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif] animate-fadeIn">
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[28px] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1E3932] text-white p-6 flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                Production-Safe Restore
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-[#1E3932] font-black uppercase tracking-wider">
                  Zero Data Loss
                </span>
              </h3>
              <p className="text-xs text-[#A3B899] mt-0.5">
                Bảo vệ dữ liệu toàn vẹn bằng cơ chế Safety Backup bắt buộc trước khi phục hồi
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Target Backup Card */}
          <div className="bg-white p-4 rounded-2xl border border-[#E6E2D8] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6F7E72] font-semibold">
              <span className="flex items-center gap-1.5">
                <FileArchive className="w-4 h-4 text-[#006241]" />
                Bản sao lưu mục tiêu (Sẽ phục hồi)
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#F2F0EB] text-[#1E3932]">
                ID: #{backup.id}
              </span>
            </div>
            <div className="text-sm font-bold text-[#1E3932] break-all">
              {backup.filename}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6F7E72] pt-1 border-t border-[#F2F0EB]">
              <span>Kích thước: <b>{formatBytes(backup.fileSize)}</b></span>
              <span>Số bảng: <b>{backup.tablesCount || 'Toàn bộ'}</b></span>
              <span>Tổng bản ghi: <b>{backup.recordsCount?.toLocaleString() || 'N/A'}</b></span>
              <span>Ngày tạo: <b>{new Date(backup.createdAt).toLocaleString('vi-VN')}</b></span>
            </div>
          </div>

          {/* Hard Requirement Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 uppercase tracking-wide">
                Cam kết an toàn:
              </p>
              <p className="text-amber-800 leading-relaxed font-medium">
                Dữ liệu hiện tại trên Live Database sẽ được tự động sao lưu và xác minh <b>SUCCESS</b> trước khi bất kỳ lệnh ghi đè nào được thực hiện. File bản sao lưu mục tiêu và bản sao lưu an toàn đều được <b>giữ nguyên vẹn 100%</b> trong hệ thống, không bao giờ bị xóa sau khi khôi phục.
              </p>
            </div>
          </div>

          {/* Mandatory Sequence Stepper */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#1E3932] uppercase tracking-wider flex items-center justify-between">
              <span>Tiến trình 9 bước tiêu chuẩn</span>
              {isRunning && (
                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang thực thi an toàn...
                </span>
              )}
            </h4>

            <div className="bg-white rounded-2xl border border-[#E6E2D8] p-4 divide-y divide-[#F2F0EB]">
              {MANDATORY_STEPS.map((s, idx) => {
                const log = stepLogs.find((l) => l.step === s.step);
                const isStepSuccess = log?.status === 'SUCCESS' || (restoreResult && restoreResult.success);
                const isStepFailed = log?.status === 'FAILED' || (errorMsg && activeStepIndex === s.step);
                const isStepActive = isRunning && activeStepIndex === s.step;

                return (
                  <div
                    key={s.step}
                    className={`py-2.5 flex items-center justify-between text-xs transition-colors ${s.isSafety ? 'bg-emerald-500/5 px-2 rounded-lg my-0.5' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isStepSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isStepFailed ? (
                        <X className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : isStepActive ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#D5D0C7] flex items-center justify-center text-[10px] text-[#A3B899] font-bold shrink-0">
                          {s.step}
                        </div>
                      )}
                      <span
                        className={`font-semibold truncate ${s.isSafety
                          ? 'text-emerald-800 font-extrabold'
                          : isStepSuccess
                            ? 'text-[#1E3932]'
                            : 'text-[#6F7E72]'
                          }`}
                      >
                        {s.label}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {isStepSuccess && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          SUCCESS
                        </span>
                      )}
                      {isStepFailed && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          FAILED
                        </span>
                      )}
                      {isStepActive && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                          RUNNING
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Banner */}
          {restoreResult && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl space-y-2 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                Khôi phục hoàn tất an toàn 100%!
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                {restoreResult.message}
              </p>
              <div className="bg-emerald-800/60 p-2.5 rounded-xl text-xs space-y-1 font-mono text-emerald-200">
                <div>🛡️ Safety Backup ID: <b>#{restoreResult.safetyBackup.id}</b></div>
                <div className="truncate">📁 File: {restoreResult.safetyBackup.filename}</div>
                <div>📦 Dung lượng: {formatBytes(restoreResult.safetyBackup.fileSize)}</div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl space-y-1 text-xs animate-fadeIn">
              <div className="font-extrabold flex items-center gap-2 text-rose-900 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Khôi phục bị gián đoạn (Dữ liệu an toàn)
              </div>
              <p className="leading-relaxed font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-white border-t border-[#E6E2D8] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={isRunning}
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-[#D5D0C7] text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] transition-colors cursor-pointer disabled:opacity-50"
          >
            {restoreResult ? 'Đóng' : 'Hủy bỏ'}
          </button>

          {!restoreResult && (
            <button
              type="button"
              disabled={isRunning}
              onClick={handleStartRestore}
              className="px-6 py-2.5 rounded-2xl bg-[#006241] hover:bg-[#004e34] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tiến hành an toàn...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Bắt Đầu Quy Trình Restore An Toàn
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
