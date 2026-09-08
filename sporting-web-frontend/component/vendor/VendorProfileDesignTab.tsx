import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  LayoutTemplate,
  CreditCard,
  Maximize2,
  Store,
  MapPin,
  Phone,
  Clock,
  Star,
  Zap,
  Shield,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  AlertCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { TimePickerInput } from '../common/TimePickerInput';
import toast from 'react-hot-toast';
import { vendorService, BackendVendor, BackendYardItem } from '../../services/vendorService';
import { getSportImageUrl } from '../../utils/sportImageUtils';
import { formatTimeAMPM } from '../../utils/dateUtils';

interface VendorProfileDesignTabProps {
  vendors: BackendVendor[];
  selectedVendor: BackendVendor | null;
  yards: BackendYardItem[];
  onVendorUpdated: () => void;
  onSelectVendor: (vendor: BackendVendor) => void;
}

type PreviewMode = 'CARD' | 'MODAL' | 'BANNER';
type DeviceMode = 'DESKTOP' | 'MOBILE';

const PRESET_IMAGES = [
  {
    name: 'Bóng Đá Sân Cỏ',
    url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Sân Cầu Lông Đèn Led',
    url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Pickleball / Tennis Hiện Đại',
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Sân Bóng Rổ Trong Nhà',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Sân Bóng Chuyền Thi Đấu',
    url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Khu Thể Thao Phức Hợp',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
  },
];

export const VendorProfileDesignTab: React.FC<VendorProfileDesignTabProps> = ({
  vendors,
  selectedVendor,
  yards,
  onVendorUpdated,
  onSelectVendor,
}) => {
  const activeVendors = vendors.filter((v) => String(v.status || '').toLowerCase() === 'active');
  const currentTargetVendor =
    selectedVendor || (activeVendors.length > 0 ? activeVendors[0] : vendors[0] || null);

  const [previewMode, setPreviewMode] = useState<PreviewMode>('CARD');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('DESKTOP');

  // Form states
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorPhone, setVendorPhone] = useState<string>('');
  const [vendorAddress, setVendorAddress] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>('06:00');
  const [closeTime, setCloseTime] = useState<string>('23:00');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when selected vendor changes
  useEffect(() => {
    if (currentTargetVendor) {
      setVendorName(currentTargetVendor.vendorName || '');
      setVendorPhone(currentTargetVendor.vendorPhone || '');
      setVendorAddress(currentTargetVendor.vendorAddress || '');
      setOpenTime(currentTargetVendor.openTime || '06:00');
      setCloseTime(currentTargetVendor.closeTime || '23:00');
      setAvatarUrl(currentTargetVendor.avatar || '');
    }
  }, [
    currentTargetVendor?.id,
    currentTargetVendor?.vendorName,
    currentTargetVendor?.vendorPhone,
    currentTargetVendor?.vendorAddress,
    currentTargetVendor?.openTime,
    currentTargetVendor?.closeTime,
    currentTargetVendor?.avatar,
  ]);

  if (!currentTargetVendor) {
    return (
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[28px] p-12 text-center space-y-4">
        <Store className="w-12 h-12 text-[#6F7E72] mx-auto opacity-50" />
        <h3 className="text-lg font-extrabold text-[#1E3932]">Chưa có Cụm sân nào khả dụng</h3>
        <p className="text-xs text-[#6F7E72] max-w-md mx-auto">
          Vui lòng đăng ký Cụm sân và chờ Admin kích hoạt để bắt đầu quản lý hồ sơ và giao diện.
        </p>
      </div>
    );
  }

  // Calculate pricing & sports for preview
  const currentYards = yards.filter(
    (y) => !y.vendor?.id || Number(y.vendor.id) === Number(currentTargetVendor.id)
  );
  const yardPrices = currentYards
    .map((y) => Number(y.price))
    .filter((p) => !isNaN(p) && p > 0);
  const minPrice = yardPrices.length > 0 ? Math.min(...yardPrices) : 5000;
  const maxPrice = yardPrices.length > 0 ? Math.max(...yardPrices) : 150000;
  const priceDisplay =
    minPrice === maxPrice
      ? `${minPrice.toLocaleString('vi-VN')}đ / giờ`
      : `${minPrice.toLocaleString('vi-VN')}đ – ${maxPrice.toLocaleString('vi-VN')}đ / giờ`;

  const sportsSet = new Set<string>();
  currentYards.forEach((y) => {
    const sp = y.sportType?.sportName || (y as any).sportName;
    if (sp) sportsSet.add(sp);
  });
  const sportsList = sportsSet.size > 0 ? Array.from(sportsSet) : ['BÓNG ĐÁ', 'BÓNG BÀN', 'CẦU LÔNG', 'PICKLEBALL'];
  const displaySports = sportsList.slice(0, 2);
  const remainingSportsCount = Math.max(0, sportsList.length - displaySports.length);

  const effectiveImage =
    avatarUrl.trim() !== ''
      ? avatarUrl
      : getSportImageUrl(sportsList[0] || currentTargetVendor.vendorName);

  /**
   * Handles local file selection and triggers upload to server Google Drive.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, JPEG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 8MB.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Đang tải ảnh lên máy chủ...');
    try {
      const res = await vendorService.uploadVendorAvatar(currentTargetVendor.id, file);
      if (res.success && res.data?.avatar) {
        setAvatarUrl(res.data.avatar);
        toast.success('Cập nhật ảnh đại diện & banner cụm sân thành công!', { id: toastId });
        onVendorUpdated();
      } else {
        toast.error(res.message || 'Tải ảnh lên thất bại.', { id: toastId });
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ khi tải ảnh.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Deletes avatar image and resets to default category artwork.
   */
  const handleDeleteAvatar = async () => {
    if (!avatarUrl) {
      toast.error('Cụm sân hiện đang sử dụng ảnh mặc định.');
      return;
    }

    setIsDeletingAvatar(true);
    const toastId = toast.loading('Đang xóa ảnh cụm sân...');
    try {
      const res = await vendorService.deleteVendorAvatar(currentTargetVendor.id);
      if (res.success) {
        setAvatarUrl('');
        toast.success('Đã xóa ảnh và chuyển về ảnh phân loại thể thao mặc định!', { id: toastId });
        onVendorUpdated();
      } else {
        toast.error(res.message || 'Không thể xóa ảnh.', { id: toastId });
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ khi xóa ảnh.', { id: toastId });
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  /**
   * Applies preset image.
   */
  const handleApplyPreset = (url: string) => {
    setAvatarUrl(url);
    toast.success('Đã chọn ảnh mẫu! Hãy bấm "Lưu Thay Đổi" để áp dụng cho cụm sân.');
  };

  /**
   * Saves profile modifications (name, phone, address, operating hours, avatar).
   */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error('Tên cụm sân không được để trống.');
      return;
    }
    if (!vendorPhone.trim()) {
      toast.error('Số điện thoại hotline không được để trống.');
      return;
    }
    if (!vendorAddress.trim()) {
      toast.error('Địa chỉ cụm sân không được để trống.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Đang lưu thông tin hồ sơ cụm sân...');
    try {
      const res = await vendorService.updateVendor(currentTargetVendor.id, {
        vendorName: vendorName.trim(),
        vendorPhone: vendorPhone.trim(),
        vendorAddress: vendorAddress.trim(),
        openTime,
        closeTime,
        avatar: avatarUrl.trim() !== '' ? avatarUrl.trim() : null,
      });

      if (res.success) {
        toast.success('Lưu thông tin hồ sơ & giao diện Cụm sân thành công!', { id: toastId });
        onVendorUpdated();
      } else {
        toast.error(res.message || 'Lưu thông tin thất bại.', { id: toastId });
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ khi lưu hồ sơ.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner & Selector */}
      <div className="bg-white rounded-[28px] p-6 border border-[#E6E2D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#006241] flex items-center justify-center text-white shadow-md border border-emerald-400/30 shrink-0">
            <LayoutTemplate className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#1E3932] tracking-tight">
                Quản Lý Profile & Giao Diện Cụm Sân
              </h2>
            </div>
            <p className="text-xs text-[#6F7E72] mt-0.5">
              Chỉnh sửa thông tin thương hiệu, upload ảnh đại diện và xem trước trực tiếp giao diện hiển thị cho người chơi.
            </p>
          </div>
        </div>

        {/* Vendor Selector dropdown if multiple vendors */}
        {vendors.length > 1 && (
          <CustomSelect
            options={vendors.map((v) => ({
              value: v.id,
              label: `${v.vendorName} (${v.status === 'active' ? 'Đã duyệt' : v.status})`,
            }))}
            value={currentTargetVendor.id}
            onChange={(val) => {
              const found = vendors.find((v) => String(v.id) === String(val));
              if (found) onSelectVendor(found);
            }}
            prefixLabel="Cụm:"
            icon={<Store className="w-4 h-4 text-[#006241]" />}
            buttonClassName="rounded-2xl bg-[#F2F0EB] border-[#E6E2D8]"
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Image Editor (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Image Upload Box */}
          <div className="bg-white rounded-[28px] p-6 border border-[#E6E2D8] shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#006241]" />
                <h3 className="text-sm font-extrabold text-[#1E3932] uppercase tracking-wider font-mono">
                  Hình Ảnh Đại Diện & Banner
                </h3>
              </div>
              {avatarUrl && (
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  Ảnh Tùy Chỉnh
                </span>
              )}
            </div>

            {/* Current Image Preview */}
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#F2F0EB] border border-[#E6E2D8] group shadow-inner">
              <img
                src={effectiveImage}
                alt={vendorName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Badges on preview */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#006241]/90 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                {sportsList[0] || 'THỂ THAO'}
              </div>

              {/* Action buttons overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 hover:bg-white text-[#1E3932] text-xs font-bold shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-102 active:scale-98"
                >
                  {isUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#006241]" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-[#006241]" />
                  )}
                  <span>{isUploading ? 'Đang tải lên...' : 'Tải Ảnh Mới'}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={isDeletingAvatar}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-102 active:scale-98"
                    title="Xóa ảnh tùy chỉnh, quay về ảnh mặc định"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Ảnh</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Image Presets Selector */}
            <div className="space-y-2 pt-2 border-t border-[#E6E2D8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Mẫu ảnh sân thể thao chất lượng cao:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.url)}
                    className="group relative aspect-[16/10] rounded-xl overflow-hidden border border-[#E6E2D8] hover:border-[#006241] transition-all cursor-pointer shadow-2xs hover:scale-103"
                    title={`Chọn mẫu: ${preset.name}`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-end p-1.5">
                      <span className="text-[9px] text-white font-bold line-clamp-1 drop-shadow-md">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Profile Information Form */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-[28px] p-6 border border-[#E6E2D8] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#006241]" />
                <h3 className="text-sm font-extrabold text-[#1E3932] uppercase tracking-wider font-mono">
                  Thông Tin Thương Hiệu & Cơ Sở
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Tên Cơ Sở / Cụm Sân <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Ví dụ: Cụm Sân Cầu Lông & Pickleball Sporting"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-sm text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Hotline Đặt Sân <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="0934975292"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-sm text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Khung Giờ Hoạt Động
                </label>
                <div className="flex items-center gap-1.5">
                  <TimePickerInput
                    value={openTime}
                    onChange={(val) => setOpenTime(val)}
                    buttonClassName="w-full bg-[#F2F0EB] border-[#E6E2D8] py-2.5"
                  />
                  <span className="text-xs text-[#6F7E72] font-bold">–</span>
                  <TimePickerInput
                    value={closeTime}
                    onChange={(val) => setCloseTime(val)}
                    buttonClassName="w-full bg-[#F2F0EB] border-[#E6E2D8] py-2.5"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Địa Chỉ Cụm Sân <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
                placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-sm text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241] resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all cursor-pointer hover:scale-101 active:scale-98 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4 text-emerald-300" />
                )}
                <span>{isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi Hồ Sơ'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Interactive Live Preview (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-[28px] p-6 border border-[#E6E2D8] shadow-sm space-y-6">
            {/* Preview Navigation Tabs & Device Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E2D8]">
              {/* Preview Modes */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F2F0EB] border border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('CARD')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${previewMode === 'CARD'
                      ? 'bg-[#006241] text-white shadow-sm'
                      : 'text-[#6F7E72] hover:text-[#1E3932]'
                    }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>1. Thẻ Cụm Sân</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode('MODAL')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${previewMode === 'MODAL'
                      ? 'bg-[#006241] text-white shadow-sm'
                      : 'text-[#6F7E72] hover:text-[#1E3932]'
                    }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>2. Modal Xem Nhanh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode('BANNER')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${previewMode === 'BANNER'
                      ? 'bg-[#006241] text-white shadow-sm'
                      : 'text-[#6F7E72] hover:text-[#1E3932]'
                    }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>3. Hero Banner</span>
                </button>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDeviceMode('DESKTOP')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${deviceMode === 'DESKTOP' ? 'bg-white text-[#006241] shadow-xs' : 'text-[#6F7E72]'
                    }`}
                  title="Giao diện máy tính"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('MOBILE')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${deviceMode === 'MOBILE' ? 'bg-white text-[#006241] shadow-xs' : 'text-[#6F7E72]'
                    }`}
                  title="Giao diện điện thoại"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Frame Container */}
            <div
              className={`mx-auto transition-all duration-300 p-4 sm:p-6 rounded-[24px] bg-[#F2F0EB] border border-[#E6E2D8] flex items-center justify-center min-h-[460px] ${deviceMode === 'MOBILE' ? 'max-w-sm shadow-xl' : 'w-full'
                }`}
            >
              {/* MODE 1: VENDOR CARD PREVIEW */}
              {previewMode === 'CARD' && (
                <div className="w-full max-w-sm mx-auto">
                  <article className="group relative bg-[#FBF8F0] rounded-[28px] overflow-hidden border border-[#E6E2D8] shadow-md flex flex-col justify-between hover:shadow-xl transition-all">
                    <div>
                      {/* Card Image Area */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#F2F0EB]">
                        <img
                          src={effectiveImage}
                          alt={vendorName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932]/70 via-transparent to-transparent opacity-80" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-[80%]">
                            {displaySports.map((sp) => (
                              <span
                                key={sp}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] shadow-sm backdrop-blur-md"
                              >
                                {sp}
                              </span>
                            ))}
                            {remainingSportsCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#1E3932]/90 text-white border border-white/20 shadow-sm backdrop-blur-md">
                                +{remainingSportsCount}
                              </span>
                            )}
                          </div>

                          <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#6F7E72] shadow-sm">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          </div>
                        </div>

                        {/* Price Tag Badge */}
                        <div className="absolute bottom-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1E3932]/90 backdrop-blur-md text-white text-xs font-mono font-black shadow-md border border-white/15">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase">TỪ</span>
                            <span>{minPrice.toLocaleString('vi-VN')}đ</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Content Info */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-black">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>5.0</span>
                            <span className="text-[10px] text-[#6F7E72] font-semibold">(128)</span>
                          </div>

                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] text-xs font-bold font-mono">
                            <MapPin className="w-3 h-3" />
                            <span>Cách dưới 1 km</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-extrabold text-[#1E3932] tracking-tight leading-tight line-clamp-1">
                            {vendorName || 'Tên Cụm Sân Thể Thao'}
                          </h3>
                          <div className="flex items-start gap-1.5 text-xs text-[#6F7E72] mt-1 line-clamp-2">
                            <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0 mt-0.5" />
                            <span>{vendorAddress || 'Địa chỉ cụm sân...'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[11px] font-bold text-[#1E3932]">
                            {currentYards.length || 15} Sân Thể Thao
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 pt-0">
                      <div className="w-full py-2.5 rounded-2xl bg-[#006241] text-white text-xs font-extrabold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md">
                        <span>XEM CHI TIẾT SÂN</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </article>
                </div>
              )}

              {/* MODE 2: QUICK VIEW MODAL PREVIEW */}
              {previewMode === 'MODAL' && (
                <div className="w-full max-w-md bg-[#FBF8F0] rounded-[32px] overflow-hidden shadow-2xl border border-[#E6E2D8] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header Image */}
                  <div className="relative h-44 sm:h-52 bg-[#F2F0EB]">
                    <img src={effectiveImage} alt={vendorName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932]/95 via-[#1E3932]/40 to-transparent" />

                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#006241] text-[#FBF8F0] font-mono text-[9px] font-bold uppercase tracking-wider shadow-sm">
                          {sportsList[0] || 'THỂ THAO'}
                        </span>
                        <h2 className="text-xl font-extrabold text-[#FBF8F0] leading-tight line-clamp-1">
                          {vendorName || 'Tên Cụm Sân'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF8F0]/90 backdrop-blur-md border border-white/20 shadow-sm">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-[#1E3932]">5.0</span>
                        <span className="text-[9px] text-[#6F7E72] font-semibold">(128)</span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="p-5 space-y-3.5 text-[#1E3932]">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] font-mono text-[11px] font-bold">
                        <Shield className="w-3 h-3" />
                        <span>Cách dưới 1 km</span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] font-mono text-[11px] font-semibold">
                        <Clock className="w-3 h-3 text-[#006241]" />
                        <span>{formatTimeAMPM(openTime)} - {formatTimeAMPM(closeTime)}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] font-mono text-[11px] font-bold">
                        <Phone className="w-3 h-3 text-[#006241]" />
                        <span>{vendorPhone || 'Hotline'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 bg-[#F2F0EB] rounded-xl border border-[#E6E2D8]">
                      <MapPin className="w-3.5 h-3.5 text-[#006241] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-[#6F7E72] font-extrabold uppercase tracking-wider block">
                          Địa chỉ thương hiệu
                        </span>
                        <p className="text-xs font-semibold text-[#1E3932] leading-snug">
                          {vendorAddress || 'Chưa cập nhật địa chỉ'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
                        Quy mô hạ tầng
                      </span>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {currentYards.length || 15} Sân Thể Thao
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-[#E6E2D8] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[#6F7E72] font-mono font-bold uppercase tracking-wider block">
                          Khung giá tham khảo
                        </span>
                        <div className="text-sm font-extrabold text-[#006241] font-mono">
                          {priceDisplay}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F0EB] text-[#6F7E72] font-mono font-medium">
                        Trực tiếp từ Vendor
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-2 border-t border-[#E6E2D8]">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-full border border-[#E6E2D8] text-xs font-extrabold text-[#6F7E72]"
                      >
                        ĐÓNG
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-2 rounded-full bg-[#006241] text-white text-xs font-extrabold uppercase tracking-wider text-center"
                      >
                        TRUY CẬP SÂN ↗
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: HERO BANNER PREVIEW */}
              {previewMode === 'BANNER' && (
                <div className="w-full relative bg-[#1E3932] text-[#FBF8F0] rounded-[24px] overflow-hidden shadow-2xl border border-emerald-950">
                  {/* Hero Background Image */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                      src={effectiveImage}
                      alt={vendorName}
                      className="w-full h-full object-cover opacity-50 brightness-90 contrast-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1E3932]/95 via-[#1E3932]/80 to-[#1E3932]/50" />
                  </div>

                  {/* Banner Content */}
                  <div className="relative z-10 p-5 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF8F0]/15 text-[#FBF8F0] font-mono text-[10px] font-bold backdrop-blur-md border border-[#FBF8F0]/20">
                        <ArrowLeft className="w-3 h-3" />
                        QUAY LẠI DANH SÁCH
                      </span>

                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#006241]/90 text-white font-mono text-[10px] font-bold border border-emerald-400/30 shadow-sm">
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>ĐỐI TÁC XÁC THỰC</span>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                      <div className="space-y-2 max-w-lg">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#006241] text-[#FBF8F0] font-mono text-[10px] font-extrabold uppercase">
                            {sportsList[0] || 'THỂ THAO'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-mono text-[10px] font-bold">
                            {currentYards.length || 15} Sân Khả Dụng
                          </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FBF8F0] tracking-tight leading-tight">
                          {vendorName || 'Tên Cụm Sân Thể Thao'}
                        </h1>

                        <div className="flex items-center gap-1.5 text-xs text-[#E6E2D8]">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="line-clamp-1">{vendorAddress || 'Địa chỉ cụm sân...'}</span>
                        </div>
                      </div>

                      {/* Floating Glass Stats Bar */}
                      <div className="flex items-center gap-2 bg-[#FBF8F0]/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <div>
                            <span className="text-xs font-black block leading-none">5.0</span>
                            <span className="text-[8px] font-mono text-[#E6E2D8] uppercase">Đánh Giá</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-xs font-black block leading-none font-mono">
                              {openTime} - {closeTime}
                            </span>
                            <span className="text-[8px] font-mono text-[#E6E2D8] uppercase">Giờ Mở Cửa</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#006241] text-white">
                          <Phone className="w-4 h-4 text-emerald-300" />
                          <div>
                            <span className="text-xs font-black block leading-none font-mono">
                              {vendorPhone || '0934975292'}
                            </span>
                            <span className="text-[8px] font-mono text-emerald-200 uppercase">Hotline</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Helper notice */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Mẹo: Bạn có thể chuyển đổi giữa 3 chế độ xem (<strong>Thẻ Cụm Sân</strong>, <strong>Modal Xem Nhanh</strong>, <strong>Hero Banner</strong>) để kiểm tra giao diện trước khi người chơi nhìn thấy.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
