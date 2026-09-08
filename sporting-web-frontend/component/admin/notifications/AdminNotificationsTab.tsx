import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Plus, RefreshCw, Search, Trash2, Users, Calendar, Eye, Send, Sparkles, MoreVertical, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService, NotificationItem } from '../../../services/notificationService';
import { accountAvatarCache } from '../../../services/userProfileService';
import { AdminUser } from '../../../services/adminService';
import { AuthUser } from '../../../types/auth';
import { formatDisplayDateTime } from '../../../utils/dateUtils';
import { CreateNotificationModal } from './CreateNotificationModal';
import { NotificationRecipientsModal } from './NotificationRecipientsModal';

const NotificationActionMenu: React.FC<{
  item: NotificationItem;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onView: (item: NotificationItem) => void;
  onResend: (item: NotificationItem) => void;
  onDelete: (id: number) => void;
}> = ({ item, openId, setOpenId, onView, onResend, onDelete }) => {
  const menuKey = `notif-${item.id}`;
  const isOpen = openId === menuKey;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(8, window.innerWidth - rect.right);

    if (spaceBelow < 150) {
      setPos({ bottom: window.innerHeight - rect.top + 6, right });
    } else {
      setPos({ top: rect.bottom + 6, right });
    }
  }, []);

  const handleToggle = () => {
    if (!isOpen) recalcPos();
    setOpenId(isOpen ? null : menuKey);
  };

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

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-7 h-7 rounded-full hover:bg-[#F2F0EB] active:bg-[#E6E2D8] transition-colors cursor-pointer border border-[#E6E2D8] flex items-center justify-center mx-auto focus:outline-none focus:ring-2 focus:ring-[#006241]/40"
        title="Thao tác"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-3.5 h-3.5 text-[#1E3932]" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenId(null)} />
            <div
              className="fixed z-[9999] w-52 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xl overflow-hidden p-1.5 space-y-0.5 text-left font-['Plus_Jakarta_Sans',sans-serif] animate-in fade-in zoom-in-95 duration-150"
              style={{
                ...(pos.top !== undefined ? { top: `${pos.top}px` } : {}),
                ...(pos.bottom !== undefined ? { bottom: `${pos.bottom}px` } : {}),
                right: `${pos.right}px`,
              }}
            >
              <button
                onClick={() => {
                  setOpenId(null);
                  onView(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Xem Người Nhận</span>
              </button>

              <button
                onClick={() => {
                  setOpenId(null);
                  onResend(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#006241] hover:bg-emerald-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#006241] shrink-0" />
                <span>Gửi Lại Thông Báo</span>
              </button>

              <div className="h-px bg-[#F2F0EB] mx-2" />

              <button
                onClick={() => {
                  setOpenId(null);
                  onDelete(item.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Xóa Thông Báo</span>
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

interface AdminNotificationsTabProps {
  users: AdminUser[];
  currentUser: AuthUser | null;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  users,
  currentUser,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resendingNotification, setResendingNotification] = useState<NotificationItem | null>(null);
  const [viewingNotification, setViewingNotification] = useState<NotificationItem | null>(null);

  const handleOpenCreateModal = () => {
    setResendingNotification(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenResendModal = (item: NotificationItem) => {
    setResendingNotification(item);
    setIsCreateModalOpen(true);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getAllNotifications();
      setNotifications(data || []);
    } catch (err: any) {
      toast.error('Không thể tải danh sách thông báo!');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDeleteNotification = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này khỏi hệ thống?')) {
      return;
    }
    try {
      const ok = await notificationService.deleteNotification(id);
      if (ok) {
        toast.success('Đã xóa thông báo thành công!');
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error('Không thể xóa thông báo!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xóa thông báo!');
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const q = searchQuery.toLowerCase().trim();
    return notifications.filter(
      (n) =>
        n.notificationName?.toLowerCase().includes(q) ||
        n.contents?.toLowerCase().includes(q) ||
        n.user?.username?.toLowerCase().includes(q)
    );
  }, [notifications, searchQuery]);

  const totalRecipientsCount = useMemo(() => {
    return notifications.reduce((sum, n) => sum + (n.notificationUsers?.length || 0), 0);
  }, [notifications]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner / Actions */}
      <div className="p-5 rounded-[24px] bg-white border border-[#E6E2D8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#006241]" />
            <span>Quản Lý Thông Báo Gửi Người Dùng</span>
          </h2>
          <p className="text-[11px] text-[#6F7E72] font-medium mt-0.5">
            Soạn thảo, phân loại đối tượng nhận và theo dõi lịch sử thông báo trong hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
            <input
              type="text"
              placeholder="Tìm kiếm thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#F2F0EB] border border-[#E6E2D8] rounded-full text-[11px] font-bold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-[#006241]"
            />
          </div>

          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-2 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] transition-colors cursor-pointer border border-[#E6E2D8]"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#006241] hover:bg-[#007a52] text-white text-[11px] font-extrabold shadow-sm transition-all cursor-pointer border border-white/20 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Thông Báo Mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E6E2D8] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#6F7E72]">
              Tổng Đợt Gửi
            </div>
            <div className="text-xl font-black text-[#1E3932]">{notifications.length}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6E2D8] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#6F7E72]">
              Lượt Người Nhận
            </div>
            <div className="text-xl font-black text-[#1E3932]">{totalRecipientsCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E6E2D8] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#6F7E72]">
              Người Nhận / Đợt TB
            </div>
            <div className="text-xl font-black text-[#1E3932]">
              {notifications.length > 0
                ? Math.round(totalRecipientsCount / notifications.length)
                : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications History Table */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D8] shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs text-[#1E3932] border-collapse" style={{ minWidth: 720 }}>
          <colgroup>
            <col style={{ width: '32%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>

          <thead>
            <tr className="border-b border-[#E6E2D8] bg-[#F8F7F4]">
              {['Tiêu Đề & Nội Dung', 'Người Gửi ', 'Số Người Nhận', 'Thời Gian Gửi', 'Thao Tác'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[10px] uppercase tracking-wide font-extrabold text-[#6F7E72] ${i === 4 ? 'text-center' : 'text-left'
                    }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F2F0EB]">
            {filteredNotifications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6F7E72] text-xs font-semibold">
                  {isLoading
                    ? 'Đang tải dữ liệu thông báo...'
                    : 'Chưa có thông báo nào được tạo hoặc không tìm thấy kết quả phù hợp.'}
                </td>
              </tr>
            ) : (
              filteredNotifications.map((item) => {
                const recipientCount = item.notificationUsers?.length || 0;
                return (
                  <tr key={item.id} className="hover:bg-[#F9F8F5] transition-colors duration-100">
                    {/* Title & Preview */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 max-w-sm">
                        <div className="font-extrabold text-xs text-[#1E3932] line-clamp-1">
                          {item.notificationName}
                        </div>
                        <div className="text-[11px] text-[#6F7E72] line-clamp-2">
                          {item.contents}
                        </div>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="px-4 py-3.5">
                      {(() => {
                        const senderAv = item.user?.avatar || accountAvatarCache.getAvatar(item.user?.username || '');
                        return (
                          <div className="flex items-center gap-2">
                            {senderAv ? (
                              <img
                                src={senderAv}
                                alt={item.user?.username || 'Admin'}
                                className="w-6 h-6 rounded-full object-cover shrink-0 select-none shadow-xs border border-[#1E3932]/10"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#1E3932] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {item.user?.username?.charAt(0)?.toUpperCase() || 'A'}
                              </div>
                            )}
                            <span className="font-bold text-xs text-[#1E3932]">
                              {item.user?.username || 'Admin'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Recipients Count Badge */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setViewingNotification(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241]/10 hover:bg-[#006241]/20 border border-[#006241]/20 text-[#006241] font-extrabold text-[11px] transition-colors cursor-pointer"
                        title="Click để xem chi tiết danh sách người nhận"
                      >
                        <Users className="w-3 h-3" />
                        <span>{recipientCount} người nhận</span>
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-[#6F7E72] text-[11px] font-medium">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDisplayDateTime(item.createdAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <NotificationActionMenu
                        item={item}
                        openId={openMenuId}
                        setOpenId={setOpenMenuId}
                        onView={setViewingNotification}
                        onResend={handleOpenResendModal}
                        onDelete={handleDeleteNotification}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        currentUser={currentUser}
        users={users}
        initialNotification={resendingNotification}
        onClose={() => {
          setIsCreateModalOpen(false);
          setResendingNotification(null);
        }}
        onSuccess={fetchNotifications}
      />

      <NotificationRecipientsModal
        isOpen={!!viewingNotification}
        notification={viewingNotification}
        onClose={() => setViewingNotification(null)}
        onResend={handleOpenResendModal}
      />
    </div>
  );
};
