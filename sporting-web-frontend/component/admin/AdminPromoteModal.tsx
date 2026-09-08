import React from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, RefreshCw, Save } from 'lucide-react';
import { AdminUser, getUserRoleLabel } from '../../services/adminService';
import { AuthUser } from '../../types/auth';
import { CustomSelect } from '../common/CustomSelect';

interface AdminPromoteModalProps {
  isOpen: boolean;
  users: AdminUser[];
  currentUser: AuthUser | null;
  selectedPromoteUserId: number | null;
  setSelectedPromoteUserId: (id: number) => void;
  targetRoleId: number;
  setTargetRoleId: (roleId: number) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const AdminPromoteModal: React.FC<AdminPromoteModalProps> = ({
  isOpen,
  users,
  currentUser,
  selectedPromoteUserId,
  setSelectedPromoteUserId,
  targetRoleId,
  setTargetRoleId,
  isSubmitting,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const selectableUsers = users.filter((u) => {
    const isCurrentLoggedInUser =
      (currentUser?.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) ||
      (currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
    return !isCurrentLoggedInUser;
  });

  const target = users.find((u) => u.id === selectedPromoteUserId);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in duration-200">
        <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base">Cấp Quyền &amp; Phân Vai Trò Tài Khoản</h3>
          </div>
          <button onClick={onClose} className="text-[#6F7E72] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">
              Chọn Tài Khoản Cần Thay Đổi Quyền Hạn
            </label>
            <CustomSelect
              options={selectableUsers.map((u) => ({
                value: u.id,
                label: `${u.username} (${u.email}) - ${getUserRoleLabel(u)}`,
              }))}
              value={selectedPromoteUserId || ''}
              onChange={(val) => setSelectedPromoteUserId(Number(val))}
              buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6F7E72] mb-1">Tên Đăng Nhập (Username)</label>
            <input
              type="text"
              disabled
              value={target?.username || ''}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-bold text-[#1E3932] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6F7E72] mb-1">Địa Chỉ Email</label>
            <input
              type="text"
              disabled
              value={target?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-mono font-bold text-[#1E3932] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">Chọn Vai Trò Mới Sẽ Cấp</label>
            <CustomSelect
              options={[
                { value: 1, label: 'Quản Trị Viên (Admin)' },
                { value: 2, label: 'Đối Tác Quản Lý Sân (Vendor)' },
                { value: 3, label: 'Người Chơi Thể Thao (User)' },
              ]}
              value={targetRoleId}
              onChange={(val) => setTargetRoleId(Number(val))}
              buttonClassName="w-full bg-white border-[#006241] py-2.5 text-[#006241]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
            <button
              type="button"
              tabIndex={3}
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-xs cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPromoteUserId}
              tabIndex={4}
              className="px-6 py-2.5 rounded-full bg-[#006241] text-[#FBF8F0] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu Vai Trò Mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
