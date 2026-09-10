import { apiClient, API_BASE_URL } from './apiClient';
import { tokenManager } from '../utils/tokenManager';

export type BackupType = 'MANUAL' | 'AUTOMATED' | 'SAFETY_BEFORE_RESTORE';
export type BackupStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type StorageLocation = 'LOCAL' | 'GOOGLE_DRIVE' | 'BOTH';

export interface BackupItem {
  id: number;
  filename: string;
  fileSize: number;
  checksum: string | null;
  backupType: BackupType;
  status: BackupStatus;
  storageLocation: StorageLocation;
  googleDriveFileId: string | null;
  googleDriveWebUrl: string | null;
  tablesCount: number;
  recordsCount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestoreStepLog {
  step: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  message: string;
  timestamp: string;
}

export interface RestoreExecutionResult {
  success: boolean;
  message: string;
  safetyBackup: {
    id: number;
    filename: string;
    fileSize: number;
    checksum: string | null;
    createdAt: string;
  };
  restoredBackup: {
    id?: number;
    filename: string;
  };
  executionTrace: RestoreStepLog[];
}

export interface BackupStorageStatus {
  totalBackups: number;
  safetyBackups: number;
  latestBackup: BackupItem | null;
  latestSafety: BackupItem | null;
  googleDrive: {
    configured: boolean;
    folderName: string;
    rootFolderId: string;
    backupFolderId?: string;
    message?: string;
  };
  schedule?: {
    enabled: boolean;
    time: string;
    cron: string;
    nextRun: string | null;
  };
  localBackupDir: string;
}

export const backupRestoreService = {
  /**
   * Lấy danh sách tất cả các bản sao lưu
   */
  async getAll(): Promise<BackupItem[]> {
    const res = await apiClient.get<BackupItem[]>('/backup-restore');
    return res.data || [];
  },

  /**
   * Lấy trạng thái lưu trữ và Google Drive
   */
  async getStatus(): Promise<BackupStorageStatus> {
    const res = await apiClient.get<BackupStorageStatus>('/backup-restore/status');
    if (!res.success) {
      throw new Error(res.message || 'Không thể tải trạng thái lưu trữ');
    }
    return res.data!;
  },

  /**
   * Tạo bản sao lưu mới (Manual Backup)
   */
  async createBackup(notes?: string): Promise<BackupItem> {
    const res = await apiClient.post<BackupItem>('/backup-restore/backup', {
      backupType: 'MANUAL',
      notes,
    });
    if (!res.success) {
      throw new Error(res.message || 'Tạo bản sao lưu thất bại');
    }
    return res.data!;
  },

  /**
   * Thực thi quy trình Khôi Phục Dữ Liệu An Toàn Chuẩn Production:
   * Select Backup -> Confirm Restore -> Download -> Validate -> SAFETY BACKUP CURRENT DATA
   * -> Verify Safety Backup SUCCESS -> Restore Selected Backup -> Verify Restore -> Complete
   */
  async restoreBackup(id: number, executedBy?: string): Promise<RestoreExecutionResult> {
    const res = await apiClient.post<RestoreExecutionResult>(`/backup-restore/restore/${id}`, {
      adminConfirmation: 'CONFIRMED',
      executedBy,
    });
    if (!res.success) {
      throw new Error(res.message || 'Khôi phục bản sao lưu thất bại');
    }
    return res.data!;
  },

  /**
   * Tải về file ZIP sao lưu
   */
  async downloadBackup(id: number, filename: string): Promise<void> {
    const token = tokenManager.getActiveToken();
    const response = await fetch(`${API_BASE_URL}/backup-restore/download/${id}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.message || `Tải file bản sao lưu thất bại (Mã lỗi ${response.status})`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Xóa bản sao lưu
   */
  async deleteBackup(id: number): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/backup-restore/${id}`,
    );
    if (!res.success) {
      throw new Error(res.message || 'Xóa bản sao lưu thất bại');
    }
    return res.data!;
  },

  /**
   * Khôi phục cơ sở dữ liệu từ file .ZIP tải lên từ máy tính (Disaster Recovery)
   */
  async restoreFromUploadedZip(file: File, notes?: string): Promise<RestoreExecutionResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (notes?.trim()) {
      formData.append('notes', notes.trim());
    }

    const res = await apiClient.post<RestoreExecutionResult>(
      '/backup-restore/restore-upload',
      formData,
    );

    if (!res.success) {
      throw new Error(res.message || 'Khôi phục từ file ZIP thất bại');
    }
    return res.data!;
  },
};
