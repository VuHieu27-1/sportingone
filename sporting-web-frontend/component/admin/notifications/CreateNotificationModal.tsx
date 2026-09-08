import React, { useState, useMemo, useEffect } from 'react';
import { X, Bell, Send, Users, UserCheck, Search, CheckSquare, Square, Shield, Store, User as UserIcon, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminUser, getUserRoleName, getUserRoleLabel } from '../../../services/adminService';
import { accountAvatarCache } from '../../../services/userProfileService';
import { notificationService, NotificationItem } from '../../../services/notificationService';
import { AuthUser } from '../../../types/auth';

interface CreateNotificationModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  users: AdminUser[];
  initialNotification?: NotificationItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

type RecipientMode = 'ALL' | 'ROLE_USER' | 'ROLE_VENDOR' | 'ROLE_ADMIN' | 'CUSTOM';

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  currentUser,
  users,
  initialNotification,
  onClose,
  onSuccess,
}) => {
  const [notificationName, setNotificationName] = useState('');
  const [contents, setContents] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialNotification) {
        setNotificationName(initialNotification.notificationName || '');
        setContents(initialNotification.contents || '');
        const recipientIds = (initialNotification.notificationUsers || [])
          .map((nu) => nu.receiver?.id)
          .filter((id): id is number => typeof id === 'number');

        if (recipientIds.length > 0) {
          setSelectedUserIds(recipientIds);
          setRecipientMode('CUSTOM');
        } else {
          setRecipientMode('ALL');
        }
      } else {
        setNotificationName('');
        setContents('');
        setSelectedUserIds([]);
        setRecipientMode('ALL');
      }
      setSearchQuery('');
    }
  }, [isOpen, initialNotification]);

  // Initialize selected IDs based on mode
  const effectiveReceiverIds = useMemo(() => {
    if (recipientMode === 'ALL') {
      return users.map((u) => u.id);
    }
    if (recipientMode === 'ROLE_USER') {
      return users.filter((u) => getUserRoleName(u) === 'user').map((u) => u.id);
    }
    if (recipientMode === 'ROLE_VENDOR') {
      return users.filter((u) => getUserRoleName(u) === 'vendor').map((u) => u.id);
    }
    if (recipientMode === 'ROLE_ADMIN') {
      return users.filter((u) => getUserRoleName(u) === 'admin').map((u) => u.id);
    }
    return selectedUserIds;
  }, [recipientMode, users, selectedUserIds]);

  // Filtered users for custom search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.detailUser?.name?.toLowerCase().includes(q) ||
        u.detailUser?.phone?.includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    setSelectedUserIds((prev) => {
      const set = new Set([...prev, ...filteredIds]);
      return Array.from(set);
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredUsers.map((u) => u.id));
    setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notificationName.trim()) {
      toast.error('Vui lòng nhập tiêu đề thông báo!');
      return;
    }
    if (!contents.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo!');
      return;
    }
    if (effectiveReceiverIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 người nhận!');
      return;
    }

    const senderId = currentUser?.id ? Number(currentUser.id) : 1;

    try {
      setIsSubmitting(true);
      const res = await notificationService.createNotification({
        userId: senderId,
        notificationName: notificationName.trim(),
        contents: contents.trim(),
        receiverIds: effectiveReceiverIds,
      });

      if (res) {
        toast.success(`Đã gửi thông báo thành công đến ${effectiveReceiverIds.length} người dùng!`);
        // Reset form
        setNotificationName('');
        setContents('');
        setSelectedUserIds([]);
        setRecipientMode('ALL');
        onSuccess();
        onClose();
      } else {
        toast.error('Không thể tạo thông báo. Vui lòng kiểm tra lại!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi tạo thông báo!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E2D8] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#F8F7F4] border-b border-[#E6E2D8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 flex items-center justify-center text-[#006241]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1E3932]">
                {initialNotification ? 'Gửi Lại Thông Báo' : 'Tạo & Gửi Thông Báo Mới'}
              </h3>
              <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
                {initialNotification
                  ? 'Gửi lại thông báo này cho danh sách người nhận hoặc chỉnh sửa thông tin trước khi gửi.'
                  : 'Soạn tin và phân phát thông báo trực tiếp đến người dùng hệ thống.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Notification Title */}
          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
              Tiêu Đề Thông Báo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="VD: Cập nhật chính sách đặt sân hoặc Khuyến mãi Tết 2026..."
              value={notificationName}
              onChange={(e) => setNotificationName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E6E2D8] bg-white text-xs text-[#1E3932] font-medium focus:outline-none focus:ring-2 focus:ring-[#006241] focus:border-transparent transition-all"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-[#6F7E72] font-medium">
                {notificationName.length}/150 ký tự
              </span>
            </div>
          </div>

          {/* Notification Content */}
          <div>
            <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
              Nội Dung Chi Tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Nhập nội dung chi tiết thông báo muốn truyền tải đến người dùng..."
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E6E2D8] bg-white text-xs text-[#1E3932] font-medium focus:outline-none focus:ring-2 focus:ring-[#006241] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Select Recipient Target */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#006241]" />
                <span>Đối Tượng Nhận Thông Báo</span>
              </label>
              <span className="px-2.5 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-extrabold text-[11px]">
                {effectiveReceiverIds.length} người nhận được chọn
              </span>
            </div>

            {/* Selector Options */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRecipientMode('ALL')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recipientMode === 'ALL'
                    ? 'bg-[#006241] text-white border-[#006241] shadow-sm'
                    : 'bg-[#F8F7F4] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Tất Cả User</div>
                  <div className={`text-[9px] ${recipientMode === 'ALL' ? 'text-white/80' : 'text-[#6F7E72]'}`}>
                    {users.length} tài khoản
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientMode('ROLE_USER')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recipientMode === 'ROLE_USER'
                    ? 'bg-[#006241] text-white border-[#006241] shadow-sm'
                    : 'bg-[#F8F7F4] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB]'
                }`}
              >
                <UserIcon className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Người Chơi</div>
                  <div className={`text-[9px] ${recipientMode === 'ROLE_USER' ? 'text-white/80' : 'text-[#6F7E72]'}`}>
                    {users.filter((u) => getUserRoleName(u) === 'user').length} người
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientMode('ROLE_VENDOR')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recipientMode === 'ROLE_VENDOR'
                    ? 'bg-[#006241] text-white border-[#006241] shadow-sm'
                    : 'bg-[#F8F7F4] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB]'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Đối Tác (Vendor)</div>
                  <div className={`text-[9px] ${recipientMode === 'ROLE_VENDOR' ? 'text-white/80' : 'text-[#6F7E72]'}`}>
                    {users.filter((u) => getUserRoleName(u) === 'vendor').length} đối tác
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientMode('ROLE_ADMIN')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recipientMode === 'ROLE_ADMIN'
                    ? 'bg-[#006241] text-white border-[#006241] shadow-sm'
                    : 'bg-[#F8F7F4] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB]'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Ban Quản Trị</div>
                  <div className={`text-[9px] ${recipientMode === 'ROLE_ADMIN' ? 'text-white/80' : 'text-[#6F7E72]'}`}>
                    {users.filter((u) => getUserRoleName(u) === 'admin').length} admin
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientMode('CUSTOM')}
                className={`col-span-2 sm:col-span-2 flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  recipientMode === 'CUSTOM'
                    ? 'bg-[#006241] text-white border-[#006241] shadow-sm'
                    : 'bg-[#F8F7F4] text-[#1E3932] border-[#E6E2D8] hover:bg-[#F2F0EB]'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Chọn Người Dùng Cụ Thể (Tùy Chọn)</div>
                  <div className={`text-[9px] ${recipientMode === 'CUSTOM' ? 'text-white/80' : 'text-[#6F7E72]'}`}>
                    Tìm kiếm & chọn thủ công nhiều tài khoản
                  </div>
                </div>
              </button>
            </div>

            {/* Custom User Picker with Input Search */}
            {recipientMode === 'CUSTOM' && (
              <div className="mt-3 p-3.5 bg-[#F8F7F4] rounded-2xl border border-[#E6E2D8] space-y-3 animate-fade-in">
                {/* Search & Bulk Select Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo username, email, họ tên, số điện thoại..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E6E2D8] rounded-xl text-xs text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-3 py-2 bg-white border border-[#E6E2D8] rounded-xl text-[10px] font-bold text-[#006241] hover:bg-[#006241]/5 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Chọn Tất Cả</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      className="px-3 py-2 bg-white border border-[#E6E2D8] rounded-xl text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      <span>Bỏ Chọn</span>
                    </button>
                  </div>
                </div>

                {/* List of Users to Pick */}
                <div className="max-h-48 overflow-y-auto divide-y divide-[#E6E2D8] bg-white rounded-xl border border-[#E6E2D8] custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#6F7E72]">
                      Không tìm thấy người dùng phù hợp.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isChecked = selectedUserIds.includes(u.id);
                      const roleName = getUserRoleName(u);
                      const roleLabel = getUserRoleLabel(u);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleUser(u.id)}
                          className={`p-2.5 flex items-center justify-between gap-3 hover:bg-[#F9F8F5] cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#006241]/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-[#006241] rounded border-[#E6E2D8] focus:ring-[#006241] cursor-pointer"
                            />
                            {(() => {
                              const uAv = u.avatar || accountAvatarCache.getAvatar(u.username);
                              return uAv ? (
                                <img
                                  src={uAv}
                                  alt={u.username}
                                  className="w-6 h-6 rounded-full object-cover shrink-0 select-none shadow-xs border border-[#1E3932]/10"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#1E3932] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              );
                            })()}
                            <div className="truncate text-left">
                              <div className="text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {u.detailUser?.name && (
                                  <span className="text-[10px] text-[#6F7E72] font-medium truncate">
                                    ({u.detailUser.name})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#6F7E72] truncate">{u.email}</div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                roleName === 'admin'
                                  ? 'bg-[#006241]/10 text-[#006241]'
                                  : roleName === 'vendor'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {roleLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E6E2D8] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || effectiveReceiverIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] active:bg-[#005234] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang Gửi...' : `Gửi Cho ${effectiveReceiverIds.length} Người`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
