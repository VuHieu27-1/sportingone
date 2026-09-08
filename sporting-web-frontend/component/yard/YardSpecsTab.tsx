import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Car,
  Wifi,
  Droplets,
  Shirt,
  Video,
  Layers,
  SunMedium,
  Users,
  Upload,
  Plus,
  Trash2,
  Star,
  Check,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Camera,
  Info,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendYardItem, getSportImageUrl } from '../../services/vendorService';
import { imagesYardService, BackendYardImage } from '../../services/imagesYardService';
import { AuthUser } from '../../types/auth';

interface YardSpecsTabProps {
  yard: BackendYardItem;
  currentUser?: AuthUser | null;
  onBookNow?: () => void;
}

export const YardSpecsTab: React.FC<YardSpecsTabProps> = ({
  yard,
  currentUser,
  onBookNow,
}) => {
  const sportName = yard.sportType?.sportName || 'Thể thao';
  const typeName = yard.typeYard?.typeName || 'Sân thi đấu tiêu chuẩn';
  const fallbackSportImage = getSportImageUrl(sportName);

  const [images, setImages] = useState<BackendYardImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Upload modal form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isCoverSelection, setIsCoverSelection] = useState<number>(0);
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user is Vendor or Admin
  const roleStr = String(currentUser?.role || '').toUpperCase();
  const canManageImages = roleStr === 'ADMIN' || roleStr === 'VENDOR';

  // Load real yard images from database
  const loadYardImages = useCallback(async () => {
    if (!yard?.id) return;
    setIsLoadingImages(true);
    try {
      const res = await imagesYardService.getYardImages(yard.id);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setImages(res.data);
        setSelectedImageIndex(0);
      } else {
        setImages([]);
      }
    } catch {
      setImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  }, [yard?.id]);

  useEffect(() => {
    loadYardImages();
  }, [loadYardImages]);

  // Combined list of display items: if no custom images, show fallback sport image
  const displayImages: Array<{ id: number | string; imageUrl: string; isCover: boolean; caption: string | null }> =
    images.length > 0
      ? images
      : [
        {
          id: 'fallback',
          imageUrl: fallbackSportImage,
          isCover: true,
          caption: `Hình ảnh chuẩn môn ${sportName}`,
        },
      ];

  const currentImage = displayImages[selectedImageIndex] || displayImages[0];

  // Thumbnail Navigation
  const handlePrevThumb = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
  };

  const handleNextThumb = () => {
    setSelectedImageIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
  };

  // Handle setting cover image
  const handleSetCover = async (imageId: number) => {
    try {
      const res = await imagesYardService.updateYardImage(imageId, { isCover: true });
      if (res.success) {
        toast.success('Đã đặt làm ảnh bìa sân thành công!');
        loadYardImages();
      } else {
        toast.error(res.message || 'Không thể đặt làm ảnh bìa');
      }
    } catch {
      toast.error('Lỗi khi cập nhật ảnh bìa');
    }
  };

  // Handle deleting image
  const handleDeleteImage = async (imageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi sân?')) return;

    try {
      const res = await imagesYardService.deleteYardImage(imageId);
      if (res.success) {
        toast.success('Đã xóa ảnh sân thành công');
        loadYardImages();
      } else {
        toast.error(res.message || 'Không thể xóa ảnh');
      }
    } catch {
      toast.error('Lỗi khi xóa ảnh');
    }
  };

  // Handle file selection in upload modal
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesList = Array.from(files);
    setSelectedFiles(newFilesList);

    const previews = newFilesList.map((file) => URL.createObjectURL(file));
    setFilePreviews(previews);
    setIsCoverSelection(0);
  };

  // Handle submitting upload
  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 tệp hình ảnh để tải lên');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const isCover = i === isCoverSelection;
        const res = await imagesYardService.uploadYardImage(
          file,
          yard.id,
          isCover,
          uploadCaption || undefined,
        );
        if (res.success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã tải lên ${successCount} ảnh lên`);
        setIsUploadModalOpen(false);
        setSelectedFiles([]);
        setFilePreviews([]);
        setUploadCaption('');
        loadYardImages();
      } else {
        toast.error('Không thể tải ảnh lên máy chủ');
      }
    } catch (err: any) {
      toast.error(`Lỗi khi tải ảnh: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const FACILITIES = [
    {
      icon: Car,
      title: 'Bãi Đỗ Xe Rộng Rãi',
      desc: 'Khu vực gửi xe máy và ô tô an toàn có bảo vệ 24/7.',
    },
    {
      icon: Droplets,
      title: 'Phòng Tắm & Thay Đồ',
      desc: 'Khu vệ sinh riêng biệt, nước nóng lạnh sạch sẽ.',
    },
    {
      icon: Wifi,
      title: 'Wifi Tốc Độ Cao',
      desc: 'Phủ sóng toàn bộ khuôn viên sân hoàn toàn miễn phí.',
    },
    {
      icon: Shirt,
      title: 'Cho Thuê Dụng Cụ',
      desc: 'Hỗ trợ thuê bóng, vợt, áo bib thi đấu và nước uống.',
    },
    {
      icon: Video,
      title: 'Camera An Ninh',
      desc: 'Hệ thống camera giám sát đảm bảo an toàn tài sản.',
    },
    {
      icon: SunMedium,
      title: 'Hệ Thống Đèn LED',
      desc: 'Chiếu sáng chống lóa công suất cao chuyên dụng ban đêm.',
    },
  ];

  const basePrice = Number(yard.price || 0);
  const discountPercent = yard.sale?.discountPercent || 0;
  const finalPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBF8F0] p-6 rounded-[28px] border border-[#E6E2D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-xs font-black uppercase tracking-wider font-mono">
              Ảnh Thực Tế 100%
            </span>
            <span className="text-xs text-[#6F7E72] font-semibold">
              {images.length > 0 ? `${images.length} Ảnh Đã Tải Lên` : 'Hình ảnh tiêu chuẩn'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1E3932] mt-1.5 tracking-tight">
            Hình Ảnh Thực Tế & Cơ Sở Vật Chất Sân
          </h2>
          <p className="text-xs sm:text-sm text-[#6F7E72] mt-0.5">
            Quan sát toàn diện không gian thi đấu, mặt sân, ánh sáng và tiện ích thực tế trước khi đặt lịch.
          </p>
        </div>

        {/* Vendor Image Management CTA Button */}
        {canManageImages && (
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#006241] hover:bg-[#004f34] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Thêm Ảnh Cho Sân</span>
          </button>
        )}
      </div>

      {/* Main E-Commerce Style Image Gallery & Court Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-6 sm:p-8 rounded-[32px] border border-[#E6E2D8] shadow-xs">
        {/* Left Vertical Thumbnails Strip (2 Cols on lg) */}
        <div className="lg:col-span-2 flex lg:flex-col items-center gap-3 order-2 lg:order-1 overflow-x-auto lg:overflow-y-auto no-scrollbar max-h-[540px]">
          {/* Scroll Up Button for large lists */}
          {displayImages.length > 4 && (
            <button
              type="button"
              onClick={handlePrevThumb}
              className="hidden lg:flex w-full items-center justify-center py-1.5 rounded-xl bg-[#FBF8F0] hover:bg-[#F2F0EB] text-[#6F7E72] border border-[#E6E2D8] transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}

          {displayImages.map((img, idx) => {
            const isSelected = idx === selectedImageIndex;
            return (
              <button
                key={`${img.id}-${idx}`}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-full lg:h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 group ${isSelected
                  ? 'border-[#006241] ring-3 ring-[#006241]/20 shadow-md scale-102'
                  : 'border-[#E6E2D8] hover:border-[#006241]/50 opacity-70 hover:opacity-100'
                  }`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || `Ảnh sân ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {img.isCover && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#006241] text-white text-[9px] font-black uppercase">
                    Bìa
                  </span>
                )}
              </button>
            );
          })}

          {/* Scroll Down Button */}
          {displayImages.length > 4 && (
            <button
              type="button"
              onClick={handleNextThumb}
              className="hidden lg:flex w-full items-center justify-center py-1.5 rounded-xl bg-[#FBF8F0] hover:bg-[#F2F0EB] text-[#6F7E72] border border-[#E6E2D8] transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center Main High-Resolution Preview (6 Cols on lg) */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col space-y-3">
          <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[460px] rounded-[28px] overflow-hidden bg-[#1E3932]/5 border border-[#E6E2D8] group shadow-inner">
            <img
              src={currentImage?.imageUrl}
              alt={currentImage?.caption || yard.yardName}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-103"
            />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold font-mono">
                {selectedImageIndex + 1} / {displayImages.length}
              </span>
              {currentImage?.isCover && (
                <span className="px-3 py-1 rounded-full bg-[#006241] text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  ★ Ảnh Bìa Chính
                </span>
              )}
            </div>

            {/* Fullscreen Zoom Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="absolute top-4 right-4 p-2.5 rounded-2xl bg-white/80 hover:bg-white text-[#1E3932] shadow-md backdrop-blur-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Phóng to ảnh"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Vendor Management Quick Actions on active image */}
            {canManageImages && typeof currentImage.id === 'number' && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {!currentImage.isCover && (
                  <button
                    type="button"
                    onClick={() => handleSetCover(currentImage.id as number)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#006241] text-[#006241] hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Đặt Bìa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => handleDeleteImage(currentImage.id as number, e)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                  title="Xóa ảnh này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Details & Specs Column (4 Cols on lg) */}
        <div className="lg:col-span-4 order-3 flex flex-col">
          <div className="p-6 rounded-[28px] bg-[#FBF8F0] border border-[#E6E2D8] flex flex-col justify-between h-full space-y-4 shadow-2xs">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-xs font-black uppercase tracking-wider">
                  {sportName}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F2F0EB] text-[#1E3932] font-mono text-xs font-bold">
                  {typeName}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#1E3932] tracking-tight mt-2 truncate">
                {yard.yardName}
              </h3>
            </div>

            {/* Authentic Info Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E2D8]/70">
                <span className="text-[#6F7E72] font-bold">Thể Loại Môn:</span>
                <span className="font-black text-[#006241] uppercase font-mono">{sportName}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E2D8]/70">
                <span className="text-[#6F7E72] font-bold">Loại Quy Cách Sân:</span>
                <span className="font-extrabold text-[#1E3932] font-mono">{typeName}</span>
              </div>

              {yard.vendor?.vendorName && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E2D8]/70">
                  <span className="text-[#6F7E72] font-bold">Thuộc Cụm Sân:</span>
                  <span className="font-extrabold text-[#1E3932] truncate max-w-[170px]">
                    {yard.vendor.vendorName}
                  </span>
                </div>
              )}

              {yard.vendor?.vendorAddress && (
                <div className="flex items-start justify-between p-3 rounded-2xl bg-white border border-[#E6E2D8]/70">
                  <span className="text-[#6F7E72] font-bold shrink-0">Địa Chỉ:</span>
                  <span className="font-semibold text-[#1E3932] text-right ml-2 line-clamp-2">
                    {yard.vendor.vendorAddress}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E2D8]/70">
                <span className="text-[#6F7E72] font-bold">Trạng Thái Sân:</span>
                <span
                  className={`font-black text-xs px-2.5 py-0.5 rounded-full ${yard.status === 'maintenance'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-[#006241]'
                    }`}
                >
                  {yard.status === 'maintenance' ? 'Đang Bảo Trì' : 'Sẵn Sàng Phục Vụ'}
                </span>
              </div>
            </div>

            {/* Unified Real Photo Notice Footer */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs">
              <span className="font-black text-[#006241] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Hình Ảnh Thực Tế Chụp Tại Sân</span>
              </span>
              <p className="text-[#1E3932] text-[11px] mt-0.5 leading-relaxed">
                Chủ sân cập nhật thực tế giúp người chơi quan sát không gian trước khi đến sân.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handlePrevThumb}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src={currentImage.imageUrl}
            alt={currentImage.caption || yard.yardName}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />

          <button
            type="button"
            onClick={handleNextThumb}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>,
        document.body
      )}

      {/* Vendor Image Upload Modal */}
      {isUploadModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 sm:p-8 border border-[#E6E2D8] shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E2D8]">
              <div>
                <h3 className="text-lg font-black text-[#1E3932] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#006241]" />
                  <span>Tải Thêm Ảnh Thực Tế Cho Sân</span>
                </h3>
                <p className="text-xs text-[#6F7E72] mt-0.5">
                  Tải lên Google Drive folder <span className="font-bold text-[#006241] font-mono">images-yard</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFiles([]);
                  setFilePreviews([]);
                }}
                className="p-2 rounded-xl hover:bg-[#F2F0EB] text-[#6F7E72] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dropzone File Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-[#006241]/40 hover:border-[#006241] rounded-2xl bg-[#FBF8F0] text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                className="hidden"
              />
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-[#006241] mx-auto animate-spin mb-2" />
              ) : (
                <Upload className="w-10 h-10 text-[#006241] mx-auto group-hover:scale-110 transition-transform mb-2" />
              )}
              <p className="text-sm font-extrabold text-[#1E3932]">
                {isUploading ? 'Đang Tải Ảnh Lên Google Drive...' : 'Nhấp để chọn hình ảnh từ thiết bị'}
              </p>
              <p className="text-xs text-[#6F7E72] mt-1">
                Hỗ trợ chọn nhiều ảnh cùng lúc (.JPG, .PNG, .WEBP)
              </p>
            </div>

            {/* File Previews List */}
            {filePreviews.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#1E3932] block">
                  Đã chọn {filePreviews.length} ảnh (Nhấp vào ảnh để chọn làm Ảnh Bìa):
                </span>
                <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {filePreviews.map((previewUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setIsCoverSelection(idx)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isCoverSelection === idx
                        ? 'border-[#006241] ring-2 ring-[#006241]/30 scale-102'
                        : 'border-[#E6E2D8] hover:border-[#006241]/40'
                        }`}
                    >
                      <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                      {isCoverSelection === idx && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#006241] text-white text-[8px] font-black uppercase">
                          Ảnh Bìa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-[#1E3932]">
                Chú Thích / Mô Tả Góc Chụp (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: Sân nhìn từ góc khán đài, Góc ban đêm bật đèn..."
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E6E2D8] bg-[#FBF8F0] text-xs font-semibold focus:outline-none focus:border-[#006241]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFiles([]);
                  setFilePreviews([]);
                }}
                className="px-5 py-2.5 rounded-xl hover:bg-[#F2F0EB] text-[#6F7E72] text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isUploading || selectedFiles.length === 0}
                onClick={handleUploadSubmit}
                className="px-6 py-2.5 rounded-xl bg-[#006241] hover:bg-[#004f34] disabled:opacity-50 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải lên Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Xác Nhận Tải Lên ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
