import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, X, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { AdminUser } from '../../services/adminService';
import { CustomSelect } from '../common/CustomSelect';

interface AdminUserModalProps {
  isOpen: boolean;
  editingUser: AdminUser | null;
  userFormData: {
    username: string;
    email: string;
    password: string;
    roleId: number;
  };
  setUserFormData: React.Dispatch<
    React.SetStateAction<{
      username: string;
      email: string;
      password: string;
      roleId: number;
    }>
  >;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen,
  editingUser,
  userFormData,
  setUserFormData,
  isSubmitting,
  onClose,
  onSave,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in duration-200">
        <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base">
              {editingUser ? 'Cập Nhật Tài Khoản User' : 'Tạo Tài Khoản User Mới'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#6F7E72] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">Tên đăng nhập (Username)</label>
            <input
              type="text"
              required
              tabIndex={1}
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">Địa chỉ Email</label>
            <input
              type="email"
              required
              tabIndex={2}
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">
              Mật khẩu {editingUser && '(Bỏ trống nếu không thay đổi)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!editingUser}
                tabIndex={3}
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu mới'}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F7E72] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1">Phân Quyền Vai Trò (Role)</label>
            <CustomSelect
              options={[
                { value: 1, label: 'Quản Trị Viên (Admin)' },
                { value: 2, label: 'Đối Tác Quản Lý Sân (Vendor)' },
                { value: 3, label: 'Người Chơi Thể Thao (User)' },
              ]}
              value={userFormData.roleId}
              onChange={(val) => setUserFormData({ ...userFormData, roleId: Number(val) })}
              buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
            <button
              type="button"
              tabIndex={5}
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] font-bold text-xs cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              tabIndex={6}
              className="px-6 py-2.5 rounded-full bg-[#006241] text-[#FBF8F0] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu Tài Khoản</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
