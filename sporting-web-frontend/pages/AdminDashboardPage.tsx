import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { tokenManager } from '../utils/tokenManager';
import { adminService, getUserRoleName, AdminUser, AdminVendor, AdminYard, SportTypeItem, TypeYardItem } from '../services/adminService';
import { AuthUser } from '../types/auth';
import { socketService, UserStatusItem } from '../services/socketService';

import { AdminSidebar, AdminTab } from '../component/admin/AdminSidebar';
import { AdminHeader } from '../component/admin/AdminHeader';
import { AdminOverviewTab } from '../component/admin/AdminOverviewTab';
import { AdminUsersTab } from '../component/admin/AdminUsersTab';
import { AdminVendorsTab } from '../component/admin/AdminVendorsTab';
import { AdminYardsTab } from '../component/admin/AdminYardsTab';
import { AdminTransactionsTab } from '../component/admin/AdminTransactionsTab';
import { AdminApprovalsTab } from '../component/admin/AdminApprovalsTab';
import { AdminSettingsTab } from '../component/admin/AdminSettingsTab';
import { AdminAiKeysTab } from '../component/admin/AdminAiKeysTab';
import { AdminUserModal } from '../component/admin/AdminUserModal';
import { AdminVendorModal } from '../component/admin/AdminVendorModal';
import { AdminYardModal } from '../component/admin/AdminYardModal';
import { AdminPromoteModal } from '../component/admin/AdminPromoteModal';
import { ConfirmModal } from '../component/common/ConfirmModal';
import { coinTransactionService, CoinTransactionData } from '../services/coinTransactionService';

interface AdminDashboardPageProps {
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser: initialUser,
  onLogout,
}) => {
  const navigate = useNavigate();
  const getInitialAdminTab = (): AdminTab => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab && ['overview', 'users', 'vendors', 'yards', 'transactions', 'approvals', 'settings', 'ai-keys'].includes(urlTab)) {
        return urlTab as AdminTab;
      }
      const saved = sessionStorage.getItem('sporting_admin_active_tab');
      if (saved && ['overview', 'users', 'vendors', 'yards', 'transactions', 'approvals', 'settings', 'ai-keys'].includes(saved)) {
        return saved as AdminTab;
      }
    } catch {}
    return 'overview';
  };

  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialAdminTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('sporting_admin_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [yards, setYards] = useState<AdminYard[]>([]);
  const [approvals, setApprovals] = useState<CoinTransactionData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilterState] = useState<'ALL' | 'admin' | 'vendor' | 'user'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      if (urlRole && ['ALL', 'admin', 'vendor', 'user'].includes(urlRole)) {
        return urlRole as any;
      }
      const saved = sessionStorage.getItem('sporting_admin_user_role_filter');
      if (saved && ['ALL', 'admin', 'vendor', 'user'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'ALL';
  });

  const setUserRoleFilter = (filter: 'ALL' | 'admin' | 'vendor' | 'user') => {
    setUserRoleFilterState(filter);
    try {
      sessionStorage.setItem('sporting_admin_user_role_filter', filter);
      const url = new URL(window.location.href);
      if (filter === 'ALL') {
        url.searchParams.delete('role');
      } else {
        url.searchParams.set('role', filter);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const [vendorStatusFilter, setVendorStatusFilterState] = useState<'ALL' | 'active' | 'pending' | 'reject'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlVal = params.get('vendorStatus');
      if (urlVal && ['ALL', 'active', 'pending', 'reject'].includes(urlVal)) {
        return urlVal as any;
      }
      const saved = sessionStorage.getItem('sporting_admin_vendor_status_filter');
      if (saved && ['ALL', 'active', 'pending', 'reject'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'ALL';
  });

  const setVendorStatusFilter = (filter: 'ALL' | 'active' | 'pending' | 'reject') => {
    setVendorStatusFilterState(filter);
    try {
      sessionStorage.setItem('sporting_admin_vendor_status_filter', filter);
      const url = new URL(window.location.href);
      if (filter === 'ALL') {
        url.searchParams.delete('vendorStatus');
      } else {
        url.searchParams.set('vendorStatus', filter);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  };

  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    roleId: 3,
  });

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<AdminVendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState<{
    vendorName: string;
    vendorAddress: string;
    vendorPhone: string;
    openTime?: string;
    closeTime?: string;
    status: 'active' | 'pending' | 'reject';
    userId?: number;
  }>({
    vendorName: '',
    vendorAddress: '',
    vendorPhone: '',
    openTime: '06:00',
    closeTime: '23:00',
    status: 'active',
    userId: 0,
  });

  const [yardModalOpen, setYardModalOpen] = useState(false);
  const [yardModalTab, setYardModalTab] = useState<'info' | 'images' | 'preview'>('info');
  const [editingYard, setEditingYard] = useState<AdminYard | null>(null);
  const [yardFormData, setYardFormData] = useState({
    yardName: '',
    price: 100000,
    pricePerHour: 100000,
    peakHourPrice: 150000,
    vendorId: 0,
    sportTypeId: 0,
    typeYardId: 0,
    quantity: 1,
  });

  const [sportTypes, setSportTypes] = useState<SportTypeItem[]>([]);
  const [typeYards, setTypeYards] = useState<TypeYardItem[]>([]);

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedPromoteUserId, setSelectedPromoteUserId] = useState<number | null>(null);
  const [targetRoleId, setTargetRoleId] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rejectVendorModal, setRejectVendorModal] = useState<{
    isOpen: boolean;
    vendorId: number | null;
    vendorName: string;
    reason: string;
  }>({
    isOpen: false,
    vendorId: null,
    vendorName: '',
    reason: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Xác Nhận',
    onConfirm: () => {},
  });

  useEffect(() => {
    /**
     * Validates and verifies parameters for verifyAdmin.
     */
    const verifyAdmin = async () => {
      const token = tokenManager.getActiveToken();
      if (!token) return;

      setIsLoadingUser(true);
      const user = await authService.fetchCurrentUser();
      if (!token || !user) return;

      if (user.role !== 'ADMIN') {
        toast.error('Từ chối truy cập. Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền truy cập trang này!', { id: 'access-denied' });
        navigate('/', { replace: true });
        return;
      }
      setCurrentUser(user);
      setIsLoadingUser(false);
      loadAllAdminData();
    };
    verifyAdmin();
  }, [navigate]);

  useEffect(() => {
    const refreshUsersStatus = async () => {
      try {
        const statuses = await socketService.fetchUsersStatusRest();
        if (Array.isArray(statuses) && statuses.length > 0) {
          const statusMap = new Map(statuses.map((s) => [Number(s.userId), s]));
          setUsers((prevUsers) => {
            if (!prevUsers || prevUsers.length === 0) return prevUsers;
            let hasChanges = false;
            const updated = prevUsers.map((user) => {
              const matched = statusMap.get(Number(user.id));
              if (matched && (user.isOnline !== matched.isOnline || user.statusTime !== matched.statusTime)) {
                hasChanges = true;
                return {
                  ...user,
                  isOnline: matched.isOnline,
                  statusTime: matched.statusTime || user.statusTime,
                };
              }
              return user;
            });
            return hasChanges ? updated : prevUsers;
          });
        }
      } catch {
      }
    };

    refreshUsersStatus();

    const statusInterval = setInterval(refreshUsersStatus, 15000);

    const heartbeatInterval = setInterval(() => {
      if (tokenManager.getActiveToken()) {
        socketService.sendUserActiveHeartbeat();
      }
    }, 25000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(heartbeatInterval);
    };
  }, [currentUser]);

  /**
   * Executes load All Admin Data operation.
   */
  const loadAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [usersData, vendorsData, yardsData, sportTypesData, typeYardsData, approvalsRes] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllVendors(),
        adminService.getAllYards(),
        adminService.getAllSportTypes(),
        adminService.getAllTypeYards(),
        coinTransactionService.getAdminApprovals(),
      ]);
      setUsers(usersData);
      setVendors(vendorsData);
      setSportTypes(sportTypesData);
      setTypeYards(typeYardsData);
      if (approvalsRes.success && Array.isArray(approvalsRes.data)) {
        setApprovals(approvalsRes.data);
      }

      if (vendorsData.length > 0) {
        const enrichedYards = await Promise.all(
          yardsData.map(async (yard) => {
            if (yard.vendor) return yard;
            const matchedVendor = vendorsData.find((v) => v.id === yard.vendorId);
            if (matchedVendor) {
              return { ...yard, vendor: matchedVendor };
            }
            if (yard.vendorId) {
              const vendorYards = await adminService.getYardsByVendor(yard.vendorId);
              const matched = vendorYards.find((vy) => vy.id === yard.id);
              return matched ? { ...yard, ...matched } : yard;
            }
            return yard;
          })
        );
        setYards(enrichedYards);
      } else {
        setYards(yardsData);
      }
    } catch {
      toast.error('Không thể tải dữ liệu Quản trị từ máy chủ.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = () => {
    tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, () => {
      if (onLogout) onLogout();
      navigate('/login', { replace: true });
    });
  };

  /**
   * Handles event processing for handleOpenUserModal.
   */
  const handleOpenUserModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        roleId: typeof user.role === 'object' ? (user.role?.id || 3) : 3,
      });
    } else {
      setEditingUser(null);
      setUserFormData({ username: '', email: '', password: '', roleId: 3 });
    }
    setUserModalOpen(true);
  };

  /**
   * Handles event processing for handleSaveUser.
   */
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = {
          username: userFormData.username,
          email: userFormData.email,
          roleId: Number(userFormData.roleId),
        };
        if (userFormData.password) payload.password = userFormData.password;

        const currentRoleId = typeof editingUser.role === 'object' ? (editingUser.role?.id || 3) : 3;
        const newRoleId = Number(userFormData.roleId);

        const res = await adminService.updateUser(editingUser.id, payload);
        if (res.success) {
          if (currentRoleId !== newRoleId) {
            if (editingUser.username) tokenManager.removeAccountToken(editingUser.username);
            if (editingUser.email) tokenManager.removeAccountToken(editingUser.email);
            if (userFormData.username && userFormData.username !== editingUser.username) {
              tokenManager.removeAccountToken(userFormData.username);
            }
            if (userFormData.email && userFormData.email !== editingUser.email) {
              tokenManager.removeAccountToken(userFormData.email);
            }
          }
          toast.success('Cập nhật thông tin người dùng thành công!');
          setUserModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error(res.message || 'Cập nhật thất bại.');
        }
      } else {
        if (!userFormData.password) {
          toast.error('Vui lòng nhập mật khẩu cho tài khoản mới.');
          setIsSubmitting(false);
          return;
        }
        const res = await adminService.createUser({
          username: userFormData.username,
          email: userFormData.email,
          password: userFormData.password,
          roleId: Number(userFormData.roleId),
        });
        if (res.success) {
          toast.success('Tạo tài khoản người dùng mới thành công!');
          setUserModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error(res.message || 'Tạo tài khoản thất bại.');
        }
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu thông tin người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles event processing for handleDeleteUser.
   */
  const handleDeleteUser = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Xóa Tài Khoản',
      message: 'Bạn có chắc chắn muốn xóa tài khoản người dùng này khỏi hệ thống?',
      type: 'danger',
      confirmText: 'Xác Nhận Xóa',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await adminService.deleteUser(id);
          if (res.success) {
            toast.success('Đã xóa tài khoản người dùng.');
            loadAllAdminData();
          } else {
            toast.error(res.message || 'Xóa tài khoản thất bại.');
          }
        } catch {
          toast.error('Lỗi khi xóa tài khoản người dùng.');
        }
      },
    });
  };

  /**
   * Handles event processing for handleOpenVendorModal.
   */
  const handleOpenVendorModal = (vendor?: AdminVendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorFormData({
        vendorName: vendor.vendorName || '',
        vendorAddress: vendor.vendorAddress || '',
        vendorPhone: vendor.vendorPhone || '',
        openTime: vendor.openTime || '06:00',
        closeTime: vendor.closeTime || '23:00',
        status: vendor.status || 'active',
        userId: vendor.userId || (vendor.user?.id || 0),
      });
    } else {
      setEditingVendor(null);
      setVendorFormData({
        vendorName: '',
        vendorAddress: '',
        vendorPhone: '',
        openTime: '06:00',
        closeTime: '23:00',
        status: 'active',
        userId: users[0]?.id || 0,
      });
    }
    setVendorModalOpen(true);
  };

  /**
   * Handles event processing for handleSaveVendor.
   */
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingVendor) {
        const res = await adminService.updateVendor(editingVendor.id, vendorFormData);
        if (res.success) {
          toast.success('Cập nhật thông tin cơ sở sân Vendor thành công!');
          setVendorModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error(res.message || 'Cập nhật thất bại.');
        }
      } else {
        const res = await adminService.createVendor(vendorFormData);
        if (res.success) {
          toast.success('Tạo mới cơ sở sân Vendor thành công!');
          setVendorModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error(res.message || 'Tạo cơ sở Vendor thất bại.');
        }
      }
    } catch {
      toast.error('Lỗi khi lưu thông tin cơ sở sân Vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles event processing for handleQuickChangeVendorStatus.
   */
  const handleQuickChangeVendorStatus = async (id: number, status: 'active' | 'pending' | 'reject') => {
    if (status === 'reject') {
      const targetVendor = vendors.find((v) => v.id === id);
      setRejectVendorModal({
        isOpen: true,
        vendorId: id,
        vendorName: targetVendor?.vendorName || `Vendor #${id}`,
        reason: '',
      });
      return;
    }

    try {
      const res = await adminService.updateVendor(id, { status });
      if (res.success) {
        if (status === 'active') {
          toast.success('Đã phê duyệt Vendor và gửi thông báo kích hoạt tới chủ sân!');
        } else {
          toast.success(`Đã cập nhật trạng thái Vendor: ${status.toUpperCase()}`);
        }
        loadAllAdminData();
      } else {
        toast.error(res.message || 'Cập nhật trạng thái Vendor thất bại.');
      }
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái Vendor.');
    }
  };

  /**
   * Handles confirmation of vendor rejection with reason.
   */
  const handleConfirmRejectVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectVendorModal.vendorId) return;

    try {
      setIsSubmitting(true);
      const res = await adminService.updateVendor(rejectVendorModal.vendorId, {
        status: 'reject',
        reason: rejectVendorModal.reason.trim(),
      });

      if (res.success) {
        toast.success('Đã từ chối Vendor và gửi thông báo lý do tới chủ sân!');
        setRejectVendorModal({ isOpen: false, vendorId: null, vendorName: '', reason: '' });
        loadAllAdminData();
      } else {
        toast.error(res.message || 'Từ chối Vendor thất bại.');
      }
    } catch {
      toast.error('Lỗi hệ thống khi từ chối Vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles event processing for handleDeleteVendor.
   */
  const handleDeleteVendor = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Xóa Cơ Sở Vendor',
      message: 'Bạn có chắc chắn muốn xóa cơ sở sân thể thao này?',
      type: 'danger',
      confirmText: 'Xác Nhận Xóa',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await adminService.deleteVendor(id);
          if (res.success) {
            toast.success('Đã xóa cơ sở Vendor.');
            loadAllAdminData();
          } else {
            toast.error(res.message || 'Xóa cơ sở thất bại.');
          }
        } catch {
          toast.error('Lỗi khi xóa cơ sở Vendor.');
        }
      },
    });
  };

  /**
   * Handles event processing for handleOpenYardModal.
   */
  const handleOpenYardModal = (yard?: AdminYard, initialTab: 'info' | 'images' | 'preview' = 'info') => {
    setYardModalTab(initialTab);
    if (yard) {
      setEditingYard(yard);
      setYardFormData({
        yardName: yard.yardName || '',
        price: Number(yard.price || yard.pricePerHour || 100000),
        pricePerHour: Number(yard.price || yard.pricePerHour || 100000),
        peakHourPrice: yard.peakHourPrice || 150000,
        vendorId: yard.vendorId || (yard.vendor?.id || 0),
        sportTypeId: (yard as any).sportType?.id || 0,
        typeYardId: (yard as any).typeYard?.id || 0,
        quantity: 1,
      });
    } else {
      setEditingYard(null);
      setYardFormData({
        yardName: '',
        price: 100000,
        pricePerHour: 100000,
        peakHourPrice: 150000,
        vendorId: vendors[0]?.id || 0,
        sportTypeId: sportTypes[0]?.id || 0,
        typeYardId: typeYards[0]?.id || 0,
        quantity: 1,
      });
    }
    setYardModalOpen(true);
  };

  /**
   * Handles event processing for handleSaveYard.
   */
  const handleSaveYard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingYard) {
        const res = await adminService.updateYard(editingYard.id, yardFormData);
        if (res.success) {
          toast.success('Cập nhật thông tin sân thành công!');
          setYardModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error(res.message || 'Cập nhật sân thất bại.');
        }
      } else {
        if (!yardFormData.vendorId) {
          toast.error('Vui lòng chọn Vendor quản lý sân!');
          setIsSubmitting(false);
          return;
        }

        const targetVendorId = Number(yardFormData.vendorId);
        const quantity = Math.max(1, Number(yardFormData.quantity) || 1);
        const rawInputName = yardFormData.yardName.trim() || 'Sân thể thao';

        const match = rawInputName.match(/^(.*?)\s*(\d+)$/);
        const prefix = match ? match[1].trim() : rawInputName;
        const lowerPrefix = prefix.toLowerCase();

        const vendorYards = yards.filter((y) => {
          const vId = y.vendorId || y.vendor?.id;
          return Number(vId) === targetVendorId;
        });

        const usedNumbers = new Set<number>();
        for (const y of vendorYards) {
          const yName = (y.yardName || '').trim();
          if (!yName) continue;
          if (yName.toLowerCase() === lowerPrefix) {
            usedNumbers.add(1);
          } else {
            const yMatch = yName.match(/^(.*?)\s*(\d+)$/);
            if (yMatch && yMatch[1].trim().toLowerCase() === lowerPrefix) {
              usedNumbers.add(parseInt(yMatch[2], 10));
            }
          }
        }

        const yardNamesToCreate: string[] = [];
        let candidate = 1;

        for (let i = 0; i < quantity; i++) {
          while (usedNumbers.has(candidate)) {
            candidate++;
          }
          usedNumbers.add(candidate);

          if (quantity === 1 && usedNumbers.size === 1 && candidate === 1 && !match) {
            yardNamesToCreate.push(rawInputName);
          } else {
            yardNamesToCreate.push(`${prefix} ${candidate}`);
          }
        }

        let createdCount = 0;
        for (const name of yardNamesToCreate) {
          const singlePayload = {
            ...yardFormData,
            yardName: name,
          };

          const res = await adminService.createYard(singlePayload);
          if (res.success) {
            createdCount++;
          }
        }

        if (createdCount > 0) {
          toast.success(`Đã tạo thành công ${createdCount} sân thể thao mới!`);
          setYardModalOpen(false);
          loadAllAdminData();
        } else {
          toast.error('Tạo sân thất bại, vui lòng kiểm tra lại thông tin.');
        }
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu thông tin sân.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles event processing for handleDeleteYard.
   */
  const handleDeleteYard = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Xóa Sân Thi Đấu',
      message: 'Bạn có chắc chắn muốn xóa sân này khỏi cơ sở?',
      type: 'danger',
      confirmText: 'Xác Nhận Xóa',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await adminService.deleteYard(id);
          if (res.success) {
            toast.success('Đã xóa sân thi đấu.');
            loadAllAdminData();
          } else {
            toast.error(res.message || 'Xóa sân thất bại.');
          }
        } catch {
          toast.error('Lỗi khi xóa sân thi đấu.');
        }
      },
    });
  };

  /**
   * Handles event processing for handleOpenPromoteModal.
   */
  const handleOpenPromoteModal = () => {
    const selectableUsers = users.filter((u) => {
      const isCurrentLoggedInUser =
        (currentUser?.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) ||
        (currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
      return !isCurrentLoggedInUser;
    });

    if (selectableUsers.length === 0) {
      toast.error('Không có tài khoản người dùng khả dụng khác để thay đổi quyền.');
      return;
    }
    setSelectedPromoteUserId(selectableUsers[0].id);
    setTargetRoleId(1);
    setPromoteModalOpen(true);
  };

  /**
   * Handles event processing for handlePromoteUserToAdmin.
   */
  const handlePromoteUserToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoteUserId) return;
    setIsSubmitting(true);
    try {
      const targetUser = users.find((u) => u.id === selectedPromoteUserId);
      const res = await adminService.updateUser(selectedPromoteUserId, { roleId: targetRoleId });
      if (res.success) {
        if (targetUser?.username) {
          tokenManager.removeAccountToken(targetUser.username);
        }
        if (targetUser?.email) {
          tokenManager.removeAccountToken(targetUser.email);
        }
        const roleLabel = targetRoleId === 1 ? 'Admin' : targetRoleId === 2 ? 'Vendor' : 'User';
        toast.success(`Đã cập nhật vai trò tài khoản ${targetUser?.username || ''} thành ${roleLabel}!`);
        setPromoteModalOpen(false);
        loadAllAdminData();
      } else {
        toast.error(res.message || 'Cập nhật vai trò thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật vai trò.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || getUserRoleName(u) === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      (v.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.vendorAddress || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = vendorStatusFilter === 'ALL' || v.status === vendorStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeVendorCount = vendors.filter((v) => v.status === 'active').length;
  const pendingVendorCount = vendors.filter((v) => v.status === 'pending').length;
  const pendingApprovalCount = approvals.filter((a) => a.status === 'pending').length;
  const adminCount = users.filter((u) => getUserRoleName(u) === 'admin').length;

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#F2F0EB] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <RefreshCw className="w-10 h-10 text-[#006241] animate-spin mb-3" />
        <p className="text-xs font-bold text-[#1E3932] tracking-wider uppercase">Authenticating Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F0EB] text-[#1E3932] font-['Plus_Jakarta_Sans',sans-serif] flex">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        userCount={users.length}
        vendorCount={vendors.length}
        pendingVendorCount={pendingVendorCount}
        yardCount={yards.length}
        pendingApprovalCount={pendingApprovalCount}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoadingData={isLoadingData}
          onRefreshData={loadAllAdminData}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <div key={activeTab} className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1 animate-tab-transition">
          {activeTab === 'overview' && (
            <AdminOverviewTab
              users={users}
              vendors={vendors}
              yards={yards}
              activeVendorCount={activeVendorCount}
              pendingVendorCount={pendingVendorCount}
              adminCount={adminCount}
              setActiveTab={setActiveTab}
              handleQuickChangeVendorStatus={handleQuickChangeVendorStatus}
              handleOpenPromoteModal={handleOpenPromoteModal}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              filteredUsers={filteredUsers}
              allUsers={users}
              currentUser={currentUser}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              handleOpenUserModal={handleOpenUserModal}
              handleDeleteUser={handleDeleteUser}
              onRefreshData={loadAllAdminData}
            />
          )}

          {activeTab === 'vendors' && (
            <AdminVendorsTab
              filteredVendors={filteredVendors}
              vendorStatusFilter={vendorStatusFilter}
              setVendorStatusFilter={setVendorStatusFilter}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              handleOpenVendorModal={handleOpenVendorModal}
              handleQuickChangeVendorStatus={handleQuickChangeVendorStatus}
              handleDeleteVendor={handleDeleteVendor}
              onRefreshData={loadAllAdminData}
            />
          )}

          {activeTab === 'yards' && (
            <AdminYardsTab
              yards={yards}
              vendors={vendors}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              handleOpenYardModal={handleOpenYardModal}
              handleDeleteYard={handleDeleteYard}
              onRefreshData={loadAllAdminData}
            />
          )}

          {activeTab === 'approvals' && (
            <AdminApprovalsTab
              approvals={approvals}
              isLoadingData={isLoadingData}
              onRefresh={loadAllAdminData}
            />
          )}

          {activeTab === 'transactions' && <AdminTransactionsTab />}

          {activeTab === 'settings' && <AdminSettingsTab />}

          {activeTab === 'ai-keys' && <AdminAiKeysTab />}
        </div>
      </main>

            <AdminUserModal
        isOpen={userModalOpen}
        editingUser={editingUser}
        userFormData={userFormData}
        setUserFormData={setUserFormData}
        isSubmitting={isSubmitting}
        onClose={() => setUserModalOpen(false)}
        onSave={handleSaveUser}
      />

      <AdminVendorModal
        isOpen={vendorModalOpen}
        editingVendor={editingVendor}
        users={users}
        vendorFormData={vendorFormData}
        setVendorFormData={setVendorFormData}
        isSubmitting={isSubmitting}
        onClose={() => setVendorModalOpen(false)}
        onSave={handleSaveVendor}
      />

      <AdminYardModal
        isOpen={yardModalOpen}
        editingYard={editingYard}
        vendors={vendors}
        sportTypes={sportTypes}
        typeYards={typeYards}
        yardFormData={yardFormData}
        setYardFormData={setYardFormData}
        isSubmitting={isSubmitting}
        initialTab={yardModalTab}
        onClose={() => setYardModalOpen(false)}
        onSave={handleSaveYard}
        onImagesUpdated={loadAllAdminData}
      />

      <AdminPromoteModal
        isOpen={promoteModalOpen}
        users={users}
        currentUser={currentUser}
        selectedPromoteUserId={selectedPromoteUserId}
        setSelectedPromoteUserId={setSelectedPromoteUserId}
        targetRoleId={targetRoleId}
        setTargetRoleId={setTargetRoleId}
        isSubmitting={isSubmitting}
        onClose={() => setPromoteModalOpen(false)}
        onSave={handlePromoteUserToAdmin}
      />

            <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Vendor Rejection Reason Modal */}
      {rejectVendorModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E6E2D8] overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-[#F8F7F4] border-b border-[#E6E2D8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E3932]">Từ Chối Hồ Sơ Vendor</h3>
                  <p className="text-xs text-[#6F7E72] font-medium mt-0.5 truncate max-w-[240px]">
                    {rejectVendorModal.vendorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectVendorModal({ isOpen: false, vendorId: null, vendorName: '', reason: '' })}
                className="w-8 h-8 rounded-full bg-white border border-[#E6E2D8] hover:bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                  Lý Do Từ Chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectVendorModal.reason}
                  onChange={(e) =>
                    setRejectVendorModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Ví dụ: Thiếu giấy phép kinh doanh, ảnh sân mờ, thông tin địa chỉ chưa chính xác..."
                  className="w-full px-3.5 py-2.5 bg-[#F8F7F4] border border-[#E6E2D8] rounded-xl text-xs text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <p className="text-[11px] text-[#6F7E72] mt-1.5">
                  💡 Lý do này sẽ tự động được gửi thành thông báo vào tài khoản của chủ sân.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectVendorModal({ isOpen: false, vendorId: null, vendorName: '', reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6F7E72] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectVendorModal.reason.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-rose-600/20"
                >
                  {isSubmitting ? 'Đang Xử Lý...' : 'Xác Nhận Từ Chối & Gửi Thông Báo'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
