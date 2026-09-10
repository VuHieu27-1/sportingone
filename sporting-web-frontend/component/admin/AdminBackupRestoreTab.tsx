import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  Cloud,
  HardDrive,
  ShieldCheck,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  FileArchive,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  Lock,
  ChevronDown,
  MoreVertical,
  Upload,
} from 'lucide-react';
import {
  BackupItem,
  BackupStorageStatus,
  RestoreExecutionResult,
  backupRestoreService,
} from '../../services/backupRestoreService';
import { useDataTable } from '../../hooks/useDataTable';
import { DataTableHeader } from '../common/DataTableHeader';
import { DataTablePagination } from '../common/DataTablePagination';
import { CustomSelect } from '../common/CustomSelect';
import { AdminSafetyRestoreModal } from './AdminSafetyRestoreModal';

interface BackupActionDropdownProps {
  item: BackupItem;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRestore: (item: BackupItem) => void;
  onDownload: (item: BackupItem) => void;
  onDelete: (item: BackupItem) => void;
}

const BackupActionDropdown: React.FC<BackupActionDropdownProps> = ({
  item,
  isOpen,
  onToggle,
  onClose,
  onRestore,
  onDownload,
  onDelete,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current || typeof window === 'undefined') return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 190;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;
    setPos({
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-[#1E3932] text-white border-[#1E3932] shadow-sm'
            : 'bg-white hover:bg-[#F2F0EB] text-[#1E3932] border-[#E6E2D8] shadow-xs hover:border-[#D5D0C7]'
        }`}
        title="Tùy chọn thao tác bản sao lưu"
      >
        <MoreVertical className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-400' : 'text-[#006241]'}`} />
        <span>Thao Tác</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'text-[#6F7E72]'
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div
              className="fixed z-[9999] w-56 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl p-1.5 space-y-1 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              {/* Option 1: Restore */}
              <button
                onClick={() => {
                  onClose();
                  onRestore(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-[#1E3932]">Khôi Phục Dữ Liệu</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Quy trình an toàn 9 bước</div>
                </div>
              </button>

              {/* Option 2: Download */}
              <button
                onClick={() => {
                  onClose();
                  onDownload(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F2F0EB] flex items-center justify-center text-[#1E3932] shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div>Tải Về File ZIP</div>
                  <div className="text-[10px] text-[#6F7E72] font-normal">{formatBytes(item.fileSize)}</div>
                </div>
              </button>

              <div className="h-px bg-[#F2F0EB] mx-1" />

              {/* Option 3: Delete */}
              <button
                onClick={() => {
                  onClose();
                  onDelete(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <span>Xóa Bản Sao Lưu</span>
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export const AdminBackupRestoreTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [status, setStatus] = useState<BackupStorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [backupNotes, setBackupNotes] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Upload Restore states
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [isUploadingRestore, setIsUploadingRestore] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [list, storageStatus] = await Promise.all([
        backupRestoreService.getAll(),
        backupRestoreService.getStatus(),
      ]);
      setBackups(list);
      setStatus(storageStatus);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu backup:', err);
      setActionErrorMsg('Không thể tải danh sách bản sao lưu: ' + (err.message || 'Lỗi server'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Vui lòng chọn file .ZIP sao lưu từ máy tính.');
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn khôi phục cơ sở dữ liệu từ file "${uploadFile.name}"?\n\nHệ thống sẽ tự động tạo bản sao lưu an toàn (Safety Backup) của dữ liệu hiện tại trước khi khôi phục.`,
      )
    ) {
      return;
    }

    setIsUploadingRestore(true);
    setUploadError(null);
    try {
      const result = await backupRestoreService.restoreFromUploadedZip(uploadFile, uploadNotes);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadNotes('');
      setActionSuccessMsg(
        `Khôi phục thành công từ file "${uploadFile.name}"! Đã tạo bản Safety Backup #${result.safetyBackup.id}`,
      );
      await fetchData();
    } catch (err: any) {
      setUploadError('Khôi phục thất bại: ' + (err.message || 'Lỗi xử lý file'));
    } finally {
      setIsUploadingRestore(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setActionErrorMsg(null);
    try {
      const newBackup = await backupRestoreService.createBackup(backupNotes.trim() || undefined);
      setShowCreateModal(false);
      setBackupNotes('');
      setActionSuccessMsg(`Tạo bản sao lưu thành công: ${newBackup.filename}`);
      await fetchData();
    } catch (err: any) {
      setActionErrorMsg('Tạo bản sao lưu thất bại: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (item: BackupItem) => {
    try {
      await backupRestoreService.downloadBackup(item.id, item.filename);
    } catch (err: any) {
      alert('Không thể tải file: ' + err.message);
    }
  };

  const handleDelete = async (item: BackupItem) => {
    if (!confirm(`Bạn có chắc muốn xóa bản sao lưu "${item.filename}"?`)) return;
    try {
      await backupRestoreService.deleteBackup(item.id);
      setActionSuccessMsg(`Đã xóa bản sao lưu #${item.id}`);
      await fetchData();
    } catch (err: any) {
      alert('Không thể xóa bản sao lưu: ' + err.message);
    }
  };

  const handleRestoreComplete = (result: RestoreExecutionResult) => {
    setActionSuccessMsg(
      `Khôi phục thành công! Đã tạo bản Safety Backup an toàn #${result.safetyBackup.id}`,
    );
    fetchData();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [activeSubTab, setActiveSubTab] = useState<'system' | 'safety'>('system');
  const [systemTypeFilter, setSystemTypeFilter] = useState<string>('ALL');

  const systemBackups = React.useMemo(() => {
    return backups.filter((b) => b.backupType !== 'SAFETY_BEFORE_RESTORE');
  }, [backups]);

  const filteredSystemBackups = React.useMemo(() => {
    if (systemTypeFilter === 'ALL') return systemBackups;
    return systemBackups.filter((b) => b.backupType === systemTypeFilter);
  }, [systemBackups, systemTypeFilter]);

  const safetyBackups = React.useMemo(() => {
    return backups.filter((b) => b.backupType === 'SAFETY_BEFORE_RESTORE');
  }, [backups]);

  // Hook 1: DataTable for System Backups
  const {
    paginatedData: systemData,
    totalItems: systemTotal,
    currentPage: systemPage,
    pageSize: systemPageSize,
    totalPages: systemTotalPages,
    sortField: systemSortField,
    sortDirection: systemSortDirection,
    globalSearch: systemSearch,
    columnFilters: systemColumnFilters,
    setCurrentPage: setSystemPage,
    setPageSize: setSystemPageSize,
    setGlobalSearch: setSystemSearch,
    clearColumnFilters: clearSystemFilters,
    handleSort: handleSystemSort,
  } = useDataTable<BackupItem>({
    data: filteredSystemBackups,
    initialPageSize: 10,
    initialSortField: 'createdAt',
    initialSortDirection: 'desc',
    searchFields: [
      'filename',
      'notes',
      'backupType',
      (b) => `#${b.id}`,
      (b) => b.checksum || '',
    ],
    sortAccessors: {
      filename: (b) => b.filename,
      backupType: (b) => b.backupType,
      fileSize: (b) => Number(b.fileSize || 0),
      createdAt: (b) => new Date(b.createdAt).getTime(),
    },
    storageKey: 'sporting_admin_system_backups_page_size',
  });

  // Hook 2: DataTable for Safety Backups
  const {
    paginatedData: safetyData,
    totalItems: safetyTotal,
    currentPage: safetyPage,
    pageSize: safetyPageSize,
    totalPages: safetyTotalPages,
    sortField: safetySortField,
    sortDirection: safetySortDirection,
    globalSearch: safetySearch,
    columnFilters: safetyColumnFilters,
    setCurrentPage: setSafetyPage,
    setPageSize: setSafetyPageSize,
    setGlobalSearch: setSafetySearch,
    clearColumnFilters: clearSafetyFilters,
    handleSort: handleSafetySort,
  } = useDataTable<BackupItem>({
    data: safetyBackups,
    initialPageSize: 10,
    initialSortField: 'createdAt',
    initialSortDirection: 'desc',
    searchFields: [
      'filename',
      'notes',
      (b) => `#${b.id}`,
      (b) => b.checksum || '',
    ],
    sortAccessors: {
      filename: (b) => b.filename,
      fileSize: (b) => Number(b.fileSize || 0),
      createdAt: (b) => new Date(b.createdAt).getTime(),
    },
    storageKey: 'sporting_admin_safety_backups_page_size',
  });

  const renderCleanNote = (note?: string | null) => {
    if (!note) return <span className="text-gray-400 italic text-xs">—</span>;
    const match = note.match(/phục hồi bản sao lưu #(\d+)(?:\s*\(([^)]+)\))?/i);
    if (match) {
      const targetId = match[1];
      const targetFilename = match[2];
      return (
        <div className="space-y-1 max-w-xs md:max-w-sm">
          <div className="text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
            <span className="text-emerald-800">Khôi phục bản #{targetId}</span>
          </div>
          {targetFilename && (
            <div
              className="text-[11px] font-mono text-[#52525B] bg-[#F2F0EB] px-2 py-0.5 rounded-md truncate border border-[#E6E2D8]"
              title={`Bản sao lưu mục tiêu: ${targetFilename}`}
            >
              {targetFilename}
            </div>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-[#52525B] font-medium truncate max-w-xs block" title={note}>
        {note}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Overview Stat Cards - Compact Business Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: System Backups */}
        <div
          onClick={() => setActiveSubTab('system')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            activeSubTab === 'system'
              ? 'border-[#006241] ring-1 ring-[#006241]/30 shadow-xs'
              : 'border-[#E6E2D8] hover:border-[#D5D0C7]'
          }`}
        >
          <div className="flex items-center justify-between text-[#6F7E72] mb-1">
            <span className="text-xs font-bold">Sao Lưu Hệ Thống</span>
            <Database className="w-4 h-4 text-[#006241]" />
          </div>
          <div className="text-2xl font-black text-[#1E3932]">{systemBackups.length}</div>
          <p className="text-[11px] text-[#8C988F] font-medium mt-0.5">Thủ công &amp; lịch định kỳ</p>
        </div>

        {/* Card 2: Safety Backups */}
        <div
          onClick={() => setActiveSubTab('safety')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            activeSubTab === 'safety'
              ? 'border-emerald-600 ring-1 ring-emerald-600/30 shadow-xs'
              : 'border-[#E6E2D8] hover:border-[#D5D0C7]'
          }`}
        >
          <div className="flex items-center justify-between text-[#6F7E72] mb-1">
            <span className="text-xs font-bold text-emerald-800">Bản Lưu An Toàn</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{safetyBackups.length}</div>
          <p className="text-[11px] text-[#8C988F] font-medium mt-0.5">Điểm phục hồi trước Restore</p>
        </div>

        {/* Card 3: Google Drive Cloud */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8]">
          <div className="flex items-center justify-between text-[#6F7E72] mb-1">
            <span className="text-xs font-bold">Google Drive</span>
            <Cloud className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.googleDrive?.configured ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="text-base font-extrabold text-[#1E3932]">
              {status?.googleDrive?.configured ? 'Đã Kết Nối' : 'Chưa Kết Nối'}
            </span>
          </div>
          <p className="text-[11px] text-[#8C988F] font-medium mt-0.5 truncate" title={status?.googleDrive?.folderName}>
            Thư mục: {status?.googleDrive?.folderName || 'sporting-backups'}
          </p>
        </div>

        {/* Card 4: Automated Schedule */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8]">
          <div className="flex items-center justify-between text-[#6F7E72] mb-1">
            <span className="text-xs font-bold">Lịch Tự Động</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-[#1E3932] mt-1">
            {status?.schedule?.enabled !== false
              ? `${status?.schedule?.time || '18:00'} Hàng Ngày`
              : 'Đang Tắt'}
          </div>
          <p className="text-[11px] text-[#8C988F] font-medium mt-0.5 truncate">
            {status?.schedule?.nextRun ? `Lần tới: ${status.schedule.nextRun}` : 'Đồng bộ tự động'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {actionSuccessMsg}
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {actionErrorMsg}
          </div>
          <button
            onClick={() => setActionErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Unified Table Card */}
      <div className="bg-white rounded-2xl border border-[#E6E2D8] shadow-2xs overflow-hidden">
        {/* Compact Integrated Header: Tabs on Left, Actions on Right */}
        <div className="p-3.5 border-b border-[#E6E2D8] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FAF8F5]/60">
          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1 bg-[#F2F0EB] p-1 rounded-xl shrink-0 self-start">
            <button
              type="button"
              onClick={() => setActiveSubTab('system')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'system'
                  ? 'bg-white text-[#1E3932] shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[#006241]" />
              <span>Bản sao lưu hệ thống</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  activeSubTab === 'system'
                    ? 'bg-[#006241]/10 text-[#006241]'
                    : 'bg-black/5 text-[#6F7E72]'
                }`}
              >
                {systemBackups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('safety')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'safety'
                  ? 'bg-white text-[#1E3932] shadow-xs'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bản lưu an toàn</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  activeSubTab === 'safety'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-black/5 text-[#6F7E72]'
                }`}
              >
                {safetyBackups.length}
              </span>
            </button>
          </div>

          {/* Right Toolbar: Search, Filter, Refresh, Create */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
              <input
                type="text"
                value={activeSubTab === 'system' ? systemSearch : safetySearch}
                onChange={(e) =>
                  activeSubTab === 'system'
                    ? setSystemSearch(e.target.value)
                    : setSafetySearch(e.target.value)
                }
                placeholder="Tìm theo tên file, ghi chú..."
                className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#E6E2D8] text-[#1E3932] outline-none focus:ring-1 focus:ring-[#006241]"
              />
            </div>

            {/* Type Filter (System tab only) */}
            {activeSubTab === 'system' && (
              <CustomSelect
                options={[
                  { value: 'ALL', label: 'Tất cả loại' },
                  { value: 'MANUAL', label: 'Thủ công' },
                  { value: 'AUTOMATED', label: 'Tự động' },
                ]}
                value={systemTypeFilter}
                onChange={(val) => setSystemTypeFilter(val as string)}
                className="w-32 shrink-0"
                buttonClassName="bg-white rounded-xl border-[#E6E2D8] text-xs py-1.5"
              />
            )}

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] transition-colors cursor-pointer disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Restore from ZIP Button */}
            <button
              type="button"
              onClick={() => {
                setUploadFile(null);
                setUploadNotes('');
                setUploadError(null);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#D5D0C7] text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] transition-all cursor-pointer shrink-0"
              title="Tải lên file .ZIP từ máy tính để khôi phục cơ sở dữ liệu"
            >
              <Upload className="w-3.5 h-3.5 text-[#006241]" />
              <span>Restore từ file .ZIP</span>
            </button>

            {/* Create Backup Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006241] hover:bg-[#004e34] text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo sao lưu</span>
            </button>
          </div>
        </div>

        {/* Tab 1: System Backups Table */}
        {activeSubTab === 'system' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">
                    <DataTableHeader
                      label="Bản sao lưu"
                      field="filename"
                      sortField={systemSortField}
                      sortDirection={systemSortDirection}
                      onSort={handleSystemSort}
                      className="py-3 px-5 font-bold"
                    />
                    <DataTableHeader
                      label="Loại"
                      field="backupType"
                      sortField={systemSortField}
                      sortDirection={systemSortDirection}
                      onSort={handleSystemSort}
                      className="py-3 px-3 font-bold"
                    />
                    <th className="py-3 px-3 font-bold">Ghi chú</th>
                    <DataTableHeader
                      label="Dung lượng"
                      field="fileSize"
                      sortField={systemSortField}
                      sortDirection={systemSortDirection}
                      onSort={handleSystemSort}
                      className="py-3 px-3 font-bold"
                    />
                    <th className="py-3 px-3 font-bold">Lưu trữ</th>
                    <DataTableHeader
                      label="Thời gian tạo"
                      field="createdAt"
                      sortField={systemSortField}
                      sortDirection={systemSortDirection}
                      onSort={handleSystemSort}
                      className="py-3 px-3 font-bold"
                    />
                    <th className="py-3 px-5 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F0EB] text-xs text-[#1E3932]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#6F7E72]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#006241] mb-2" />
                        Đang tải danh sách...
                      </td>
                    </tr>
                  ) : systemData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#6F7E72]">
                        <Database className="w-7 h-7 text-[#A3B899] mx-auto opacity-50 mb-1" />
                        <p className="font-bold text-xs text-[#1E3932]">Chưa có bản sao lưu hệ thống nào</p>
                      </td>
                    </tr>
                  ) : (
                    systemData.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3 px-5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#1E3932] flex items-center gap-1.5">
                              <FileArchive className="w-3.5 h-3.5 shrink-0 text-[#006241]" />
                              <span
                                className="truncate max-w-[240px] md:max-w-xs font-mono text-xs font-medium"
                                title={item.filename}
                              >
                                {item.filename}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8C988F] flex items-center gap-1.5 pl-5">
                              <span>#{item.id}</span>
                              <span>•</span>
                              <span>{item.tablesCount || 0} bảng</span>
                              <span>•</span>
                              <span>{(item.recordsCount || 0).toLocaleString()} dòng</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.backupType === 'AUTOMATED' ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Tự động
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-semibold text-[#6F7E72] bg-[#F2F0EB] px-2 py-0.5 rounded-md border border-[#E6E2D8]">
                              Thủ công
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          {renderCleanNote(item.notes)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono font-medium text-[#1E3932]">
                          {formatBytes(item.fileSize)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span
                              className="p-1 rounded-md bg-[#F2F0EB] text-[#1E3932]"
                              title="Local Server"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                            </span>
                            {item.googleDriveFileId ? (
                              <span
                                className="p-1 rounded-md bg-sky-50 text-sky-700"
                                title="Google Drive"
                              >
                                <Cloud className="w-3.5 h-3.5" />
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-[#6F7E72]">
                          <div className="font-semibold text-[#1E3932]">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                          <div className="text-[10px] text-[#8C988F]">
                            {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <BackupActionDropdown
                              item={item}
                              isOpen={openActionId === item.id}
                              onToggle={() =>
                                setOpenActionId(openActionId === item.id ? null : item.id)
                              }
                              onClose={() => setOpenActionId(null)}
                              onRestore={(b) => setSelectedBackupForRestore(b)}
                              onDownload={(b) => handleDownload(b)}
                              onDelete={(b) => handleDelete(b)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              totalItems={systemTotal}
              currentPage={systemPage}
              pageSize={systemPageSize}
              totalPages={systemTotalPages}
              onPageChange={setSystemPage}
              onPageSizeChange={setSystemPageSize}
              itemLabel="bản sao lưu hệ thống"
            />
          </div>
        )}

        {/* Tab 2: Safety Backups Table */}
        {activeSubTab === 'safety' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E6E2D8] text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">
                    <DataTableHeader
                      label="Bản lưu an toàn"
                      field="filename"
                      sortField={safetySortField}
                      sortDirection={safetySortDirection}
                      onSort={handleSafetySort}
                      className="py-3 px-5 font-bold"
                    />
                    <th className="py-3 px-3 font-bold">Bản khôi phục mục tiêu</th>
                    <DataTableHeader
                      label="Dung lượng"
                      field="fileSize"
                      sortField={safetySortField}
                      sortDirection={safetySortDirection}
                      onSort={handleSafetySort}
                      className="py-3 px-3 font-bold"
                    />
                    <th className="py-3 px-3 font-bold">Lưu trữ</th>
                    <DataTableHeader
                      label="Thời gian tạo"
                      field="createdAt"
                      sortField={safetySortField}
                      sortDirection={safetySortDirection}
                      onSort={handleSafetySort}
                      className="py-3 px-3 font-bold"
                    />
                    <th className="py-3 px-5 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F0EB] text-xs text-[#1E3932]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#6F7E72]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-700 mb-2" />
                        Đang tải danh sách...
                      </td>
                    </tr>
                  ) : safetyData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#6F7E72]">
                        <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto opacity-50 mb-1" />
                        <p className="font-bold text-xs text-[#1E3932]">Chưa có bản Safety Backup nào</p>
                      </td>
                    </tr>
                  ) : (
                    safetyData.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3 px-5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#1E3932] flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span
                                className="truncate max-w-[240px] md:max-w-xs font-mono text-xs font-medium"
                                title={item.filename}
                              >
                                {item.filename}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8C988F] flex items-center gap-1.5 pl-5">
                              <span>#{item.id}</span>
                              <span>•</span>
                              <span>{item.tablesCount || 0} bảng</span>
                              <span>•</span>
                              <span>{(item.recordsCount || 0).toLocaleString()} dòng</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          {renderCleanNote(item.notes)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono font-medium text-[#1E3932]">
                          {formatBytes(item.fileSize)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span
                              className="p-1 rounded-md bg-[#F2F0EB] text-[#1E3932]"
                              title="Local Server"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                            </span>
                            {item.googleDriveFileId ? (
                              <span
                                className="p-1 rounded-md bg-sky-50 text-sky-700"
                                title="Google Drive"
                              >
                                <Cloud className="w-3.5 h-3.5" />
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-[#6F7E72]">
                          <div className="font-semibold text-[#1E3932]">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                          <div className="text-[10px] text-[#8C988F]">
                            {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <BackupActionDropdown
                              item={item}
                              isOpen={openActionId === item.id}
                              onToggle={() =>
                                setOpenActionId(openActionId === item.id ? null : item.id)
                              }
                              onClose={() => setOpenActionId(null)}
                              onRestore={(b) => setSelectedBackupForRestore(b)}
                              onDownload={(b) => handleDownload(b)}
                              onDelete={(b) => handleDelete(b)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              totalItems={safetyTotal}
              currentPage={safetyPage}
              pageSize={safetyPageSize}
              totalPages={safetyTotalPages}
              onPageChange={setSafetyPage}
              onPageSizeChange={setSafetyPageSize}
              itemLabel="bản sao lưu an toàn"
            />
          </div>
        )}
      </div>

      {/* Modal: Create Backup */}
      {showCreateModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif] animate-fadeIn">
            <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[28px] max-w-md w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#006241]" />
                  Tạo Bản Sao Lưu Toàn Diện
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#6F7E72] hover:text-[#1E3932] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#6F7E72] leading-relaxed">
                Hệ thống sẽ kết xuất toàn bộ dữ liệu hiện tại thành định dạng nén chuẩn ZIP kèm manifest tính toán SHA-256 và lưu trữ vào Local Vault (kèm đồng bộ Google Drive thư mục sporting-backups).
              </p>

              <form onSubmit={handleCreateBackup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Ghi chú bản sao lưu (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Sao lưu trước khi nâng cấp giải đấu mùa hè..."
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] placeholder-[#A3B899] focus:outline-none focus:border-[#006241]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-2xl border border-[#D5D0C7] text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] cursor-pointer disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2.5 rounded-2xl bg-[#006241] hover:bg-[#004e34] text-white text-xs font-extrabold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang sao lưu...
                      </>
                    ) : (
                      'Bắt Đầu Sao Lưu'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal: Production-Safe Restore */}
      <AdminSafetyRestoreModal
        backup={selectedBackupForRestore}
        isOpen={Boolean(selectedBackupForRestore)}
        onClose={() => setSelectedBackupForRestore(null)}
        onRestoreSuccess={handleRestoreComplete}
      />

      {/* Modal: Restore From Uploaded ZIP File */}
      {showUploadModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif] animate-fadeIn">
            <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[28px] max-w-lg w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#006241]" />
                  Khôi Phục Dữ Liệu Từ File .ZIP
                </h3>
                <button
                  type="button"
                  disabled={isUploadingRestore}
                  onClick={() => setShowUploadModal(false)}
                  className="text-[#6F7E72] hover:text-[#1E3932] cursor-pointer disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#6F7E72] leading-relaxed">
                Tải lên một file sao lưu định dạng <span className="font-bold text-[#1E3932]">.ZIP</span> đã lưu trữ trên máy tính của bạn để khôi phục toàn diện cơ sở dữ liệu.
              </p>

              {/* Safety guarantee banner */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-emerald-900">Bảo vệ an toàn (Zero Data Loss):</span> Hệ thống sẽ <b>tự động tạo một bản Safety Backup</b> của dữ liệu hiện tại trước khi khôi phục.
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadRestore} className="space-y-4">
                {/* File Dropzone / Picker */}
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Chọn file .ZIP sao lưu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (!file.name.toLowerCase().endsWith('.zip')) {
                          setUploadError('Vui lòng chọn đúng file có đuôi .zip');
                          return;
                        }
                        setUploadFile(file);
                        setUploadError(null);
                      }
                    }}
                  />

                  {!uploadFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#D5D0C7] hover:border-[#006241] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/70 hover:bg-white"
                    >
                      <FileArchive className="w-8 h-8 text-[#006241] mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-[#1E3932]">
                        Nhấp để chọn file sao lưu .ZIP
                      </p>
                      <p className="text-[11px] text-[#6F7E72] mt-0.5">
                        Hoặc kéo thả file vào đây (chứa file database.sql)
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006241] flex items-center justify-center shrink-0">
                          <FileArchive className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1E3932] truncate">
                            {uploadFile.name}
                          </p>
                          <p className="text-[11px] text-[#6F7E72] font-mono">
                            {formatBytes(uploadFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isUploadingRestore}
                        onClick={() => {
                          setUploadFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 cursor-pointer disabled:opacity-50"
                      >
                        Đổi file
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Ghi chú bản phục hồi (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Phục hồi sự cố mất dữ liệu từ file sao lưu ngày..."
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    disabled={isUploadingRestore}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] placeholder-[#A3B899] focus:outline-none focus:border-[#006241]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isUploadingRestore}
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#D5D0C7] text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] cursor-pointer disabled:opacity-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || isUploadingRestore}
                    className="px-5 py-2 rounded-xl bg-[#006241] hover:bg-[#004e34] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingRestore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang khôi phục dữ liệu...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Bắt Đầu Khôi Phục</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
