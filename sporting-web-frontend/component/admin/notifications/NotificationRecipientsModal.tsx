import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Search, CheckCircle2, Clock, Mail, Phone, Shield, Store, User as UserIcon, RotateCcw } from 'lucide-react';
import { NotificationItem, NotificationRecipientItem } from '../../../services/notificationService';
import { accountAvatarCache } from '../../../services/userProfileService';
import { formatDisplayDateTime } from '../../../utils/dateUtils';

interface NotificationRecipientsModalProps {
  isOpen: boolean;
  notification: NotificationItem | null;
  onClose: () => void;
  onResend?: (notification: NotificationItem) => void;
}

export const NotificationRecipientsModal: React.FC<NotificationRecipientsModalProps> = ({
  isOpen,
  notification,
  onClose,
  onResend,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'read' | 'unread'>('ALL');

  const recipients = useMemo(() => {
    return notification?.notificationUsers || [];
  }, [notification]);

  const readCount = useMemo(() => {
    return recipients.filter((r) => r.status === 'read').length;
  }, [recipients]);

  const unreadCount = recipients.length - readCount;

  const filteredRecipients = useMemo(() => {
    return recipients.filter((item) => {
      // Filter by status
      if (filterStatus === 'read' && item.status !== 'read') return false;
      if (filterStatus === 'unread' && item.status === 'read') return false;

      // Filter by search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const u = item.receiver;
      if (!u) return false;
      return (
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.detailUser?.name?.toLowerCase().includes(q) ||
        u.detailUser?.phone?.includes(q)
      );
    });
  }, [recipients, filterStatus, searchQuery]);

  if (!isOpen || !notification) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E2D8] overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#F8F7F4] border-b border-[#E6E2D8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006241]/10 border border-[#006241]/20 flex items-center justify-center text-[#006241]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1E3932]">
                Danh Sách Người Nhận Thông Báo
              </h3>
              <p className="text-xs text-[#6F7E72] font-medium mt-0.5 truncate max-w-md">
                {notification.notificationName}
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

        {/* Notification Brief Details & Metrics */}
        <div className="px-6 py-3 bg-[#F2F0EB]/60 border-b border-[#E6E2D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="text-[#6F7E72]">
            <span className="font-bold text-[#1E3932]">Thời gian gửi:</span>{' '}
            {formatDisplayDateTime(notification.createdAt)}
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1E3932] text-white font-extrabold text-[11px]">
              Tổng: {recipients.length}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300">
              Đã xem: {readCount}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300">
              Chưa đọc: {unreadCount}
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#E6E2D8] bg-white space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6F7E72]" />
              <input
                type="text"
                placeholder="Tìm kiếm người nhận theo tên, email, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F8F7F4] border border-[#E6E2D8] rounded-xl text-xs text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'Tất Cả', count: recipients.length },
                { id: 'read', label: 'Đã Xem', count: readCount },
                { id: 'unread', label: 'Chưa Đọc', count: unreadCount },
              ].map((tab) => {
                const isSelected = filterStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#006241] text-white shadow-xs'
                        : 'bg-[#F2F0EB] text-[#6F7E72] hover:bg-[#E6E2D8] hover:text-[#1E3932]'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recipients List */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2">
          {filteredRecipients.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6F7E72]">
              {recipients.length === 0
                ? 'Thông báo này chưa có người nhận nào.'
                : 'Không tìm thấy người nhận khớp với từ khóa tìm kiếm.'}
            </div>
          ) : (
            filteredRecipients.map((item: NotificationRecipientItem) => {
              const u = item.receiver;
              if (!u) return null;
              const roleName = u.role?.roleName?.toLowerCase() || 'user';
              const isRead = item.status === 'read';

              return (
                <div
                  key={item.id}
                  className="p-3 bg-[#F8F7F4] hover:bg-[#F2F0EB] rounded-2xl border border-[#E6E2D8] transition-colors flex items-center justify-between gap-3"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const recAv = u.avatar || accountAvatarCache.getAvatar(u.username || '');
                      return recAv ? (
                        <img
                          src={recAv}
                          alt={u.username || 'User'}
                          className="w-9 h-9 rounded-full object-cover shrink-0 select-none shadow-xs border border-[#1E3932]/10"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1E3932] text-white font-black text-xs flex items-center justify-center shrink-0">
                          {u.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      );
                    })()}
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#1E3932]">{u.username}</span>
                        {u.detailUser?.name && (
                          <span className="text-[11px] text-[#6F7E72] font-semibold truncate">
                            ({u.detailUser.name})
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            roleName === 'admin'
                              ? 'bg-[#006241]/10 text-[#006241]'
                              : roleName === 'vendor'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {roleName === 'admin' ? (
                            <Shield className="w-2.5 h-2.5" />
                          ) : roleName === 'vendor' ? (
                            <Store className="w-2.5 h-2.5" />
                          ) : (
                            <UserIcon className="w-2.5 h-2.5" />
                          )}
                          {roleName.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-[10px] text-[#6F7E72]">
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#6F7E72]" />
                            <span>{u.email}</span>
                          </span>
                        )}
                        {u.detailUser?.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-[#6F7E72]" />
                            <span>{u.detailUser.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isRead ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã Xem</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[10px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Đã Nhận Tin</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F8F7F4] border-t border-[#E6E2D8] flex items-center justify-between">
          {onResend ? (
            <button
              onClick={() => {
                onClose();
                onResend(notification);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#006241]/10 hover:bg-[#006241]/20 text-[#006241] text-xs font-bold transition-colors cursor-pointer border border-[#006241]/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gửi Lại Thông Báo Này</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1E3932] hover:bg-[#006241] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
