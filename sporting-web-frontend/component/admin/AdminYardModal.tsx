import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  X,
  Save,
  RefreshCw,
  Dumbbell,
  Tag,
  Plus,
  Check,
  Loader2,
  Camera,
  Eye,
  Upload,
  Star,
  Trash2,
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminYard, AdminVendor, SportTypeItem, TypeYardItem, adminService } from '../../services/adminService';
import { imagesYardService, BackendYardImage } from '../../services/imagesYardService';
import { getSportImageUrl } from '../../utils/sportImageUtils';
import { CustomSelect } from '../common/CustomSelect';

interface YardFormData {
  yardName: string;
  price: number;
  pricePerHour: number;
  peakHourPrice: number;
  vendorId: number;
  sportTypeId: number;
  typeYardId: number;
  quantity: number;
}

interface AdminYardModalProps {
  isOpen: boolean;
  editingYard: AdminYard | null;
  vendors: AdminVendor[];
  sportTypes: SportTypeItem[];
  typeYards: TypeYardItem[];
  yardFormData: YardFormData;
  setYardFormData: React.Dispatch<React.SetStateAction<YardFormData>>;
  isSubmitting: boolean;
  initialTab?: 'info' | 'images' | 'preview';
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onImagesUpdated?: () => void;
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241] transition';

interface QuickAddRowProps {
  placeholder: string;
  isCreating: boolean;
  onCreate: (name: string) => Promise<void>;
}

const QuickAddRow: React.FC<QuickAddRowProps> = ({ placeholder, isCreating, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const handleAction = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim());
    setName('');
    setOpen(false);
  };

  return (
    <div className="mt-1.5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#006241] hover:text-[#006241]/70 transition cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Thêm mới
        </button>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleAction();
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#006241]/40 text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241] transition"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAction();
            }}
            disabled={isCreating || !name.trim()}
            className="w-7 h-7 rounded-full bg-[#006241] text-white flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer transition hover:bg-[#007a52]"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setName('');
            }}
            className="w-7 h-7 rounded-full bg-[#F2F0EB] text-[#6F7E72] flex items-center justify-center shrink-0 cursor-pointer transition hover:bg-[#E6E2D8]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const AdminYardModal: React.FC<AdminYardModalProps> = ({
  isOpen,
  editingYard,
  vendors,
  sportTypes: initialSportTypes,
  typeYards: initialTypeYards,
  yardFormData,
  setYardFormData,
  isSubmitting,
  initialTab = 'info',
  onClose,
  onSave,
  onImagesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'images' | 'preview'>('info');
  const [sportTypes, setSportTypes] = useState<SportTypeItem[]>(initialSportTypes);
  const [typeYards, setTypeYards] = useState<TypeYardItem[]>(initialTypeYards);
  const [creatingType, setCreatingType] = useState(false);

  // Images & Preview state
  const [yardImages, setYardImages] = useState<BackendYardImage[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSportTypes(initialSportTypes);
  }, [initialSportTypes]);

  useEffect(() => {
    setTypeYards(initialTypeYards);
  }, [initialTypeYards]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(editingYard ? initialTab : 'info');
      setSelectedPreviewIndex(0);
      if (editingYard?.id) {
        loadYardImages();
      } else {
        setYardImages([]);
      }
    }
  }, [isOpen, editingYard?.id, initialTab]);

  const loadYardImages = async () => {
    if (!editingYard?.id) return;
    setIsLoadingImages(true);
    try {
      const res = await imagesYardService.getYardImages(editingYard.id);
      if (res.success && Array.isArray(res.data)) {
        setYardImages(res.data);
      } else {
        setYardImages([]);
      }
    } catch {
      setYardImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const uploadFileList = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !editingYard?.id) return;

    setIsUploadingImages(true);
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const isCover = yardImages.length === 0 && i === 0;
        const res = await imagesYardService.uploadYardImage(file, editingYard.id, isCover);
        if (res.success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã tải lên ${successCount} ảnh lên`);
        await loadYardImages();
        if (onImagesUpdated) onImagesUpdated();
      } else {
        toast.error('Không thể tải ảnh lên máy chủ');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh lên Google Drive');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFileList(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadFileList(files);
  };

  const handleSetCover = async (imageId: number) => {
    const tid = toast.loading('Đang đặt ảnh làm ảnh bìa sân...');
    try {
      const res = await imagesYardService.updateYardImage(imageId, { isCover: true });
      if (res.success) {
        toast.success('Đã cập nhật ảnh bìa chính!', { id: tid });
        await loadYardImages();
        if (onImagesUpdated) onImagesUpdated();
      } else {
        toast.error(res.message || 'Không thể cập nhật ảnh bìa', { id: tid });
      }
    } catch {
      toast.error('Lỗi khi cập nhật ảnh bìa', { id: tid });
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi sân và Google Drive không?')) {
      return;
    }
    const tid = toast.loading('Đang xóa ảnh...');
    try {
      const res = await imagesYardService.deleteYardImage(imageId);
      if (res.success) {
        toast.success('Đã xóa ảnh thành công!', { id: tid });
        await loadYardImages();
        if (onImagesUpdated) onImagesUpdated();
      } else {
        toast.error(res.message || 'Không thể xóa ảnh', { id: tid });
      }
    } catch {
      toast.error('Lỗi khi xóa ảnh', { id: tid });
    }
  };

  const handleCreateSportType = async (name: string) => {
    setCreatingType(true);
    try {
      const res = await adminService.createSportType(name);
      if (res.success && res.data) {
        const newItem = res.data;
        setSportTypes((prev) => [...prev, newItem]);
        setYardFormData((prev) => ({ ...prev, sportTypeId: newItem.id }));
        toast.success(`Đã tạo môn thể thao: ${name}`);
      } else {
        toast.error(res.message || 'Tạo thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tạo loại thể thao.');
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateTypeYard = async (name: string) => {
    setCreatingType(true);
    try {
      const sportTypeId = yardFormData.sportTypeId || undefined;
      const res = await adminService.createTypeYard(name, sportTypeId);
      if (res.success && res.data) {
        const newItem = res.data;
        setTypeYards((prev) => [...prev, newItem]);
        setYardFormData((prev) => ({ ...prev, typeYardId: newItem.id }));
        toast.success(`Đã tạo loại hình sân: ${name}`);
      } else {
        toast.error(res.message || 'Tạo thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tạo loại hình sân.');
    } finally {
      setCreatingType(false);
    }
  };

  if (!isOpen) return null;

  const currentSport = sportTypes.find((s) => s.id === Number(yardFormData.sportTypeId));
  const currentType = typeYards.find((t) => t.id === Number(yardFormData.typeYardId));
  const currentVendor = vendors.find((v) => v.id === Number(yardFormData.vendorId));

  const fallbackSportImage = getSportImageUrl(currentSport?.sportName || yardFormData.yardName);
  const displayImages: Array<{ id: number | string; imageUrl: string; isCover: boolean; caption?: string | null }> =
    yardImages.length > 0
      ? yardImages
      : [
        {
          id: 'fallback',
          imageUrl: fallbackSportImage,
          isCover: true,
          caption: `Hình ảnh chuẩn môn ${currentSport?.sportName || 'thể thao'}`,
        },
      ];

  const currentPreviewImg = displayImages[selectedPreviewIndex] || displayImages[0];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-[#E6E2D8] w-[95vw] max-w-[1340px] rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header with Title & Tab Navigation */}
        <div className="px-6 py-4.5 bg-[#1E3932] text-[#FBF8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                  {editingYard ? `MÃ SÂN: YARD-${editingYard.id}` : 'THÊM MỚI SÂN'}
                </span>
                {editingYard && (
                  <span className="text-[11px] font-bold text-emerald-200/90 truncate max-w-[280px]">
                    {currentVendor?.vendorName ? `VD: ${currentVendor.vendorName}` : (editingYard.vendor?.vendorName ? `VD: ${editingYard.vendor.vendorName}` : '')}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight mt-0.5 truncate" title={yardFormData.yardName}>
                {editingYard ? `Hồ Sơ: ${yardFormData.yardName || 'Sân thể thao'}` : 'Tạo Sân Thể Thao Mới'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            {editingYard && (
              <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/10 backdrop-blur-xs flex-nowrap shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'info'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Thông Tin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'images'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>2. Quản Lý Ảnh ({yardImages.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'preview'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Xem Trước</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
          {/* TAB 1: BASIC INFO & PRICING */}
          {activeTab === 'info' && (
            <form id="admin-yard-form" onSubmit={onSave} className="space-y-5">
              {/* Row 1: Yard Name & Quantity/Vendor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Tên Sân Gốc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    tabIndex={1}
                    value={yardFormData.yardName}
                    onChange={(e) => setYardFormData({ ...yardFormData, yardName: e.target.value })}
                    placeholder="Ví dụ: Sân bóng bàn 1"
                    className={inputCls}
                  />
                </div>

                {/* Select Vendor */}
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Thuộc Cơ Sở Vendor <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    options={[
                      { value: 0, label: '-- Chọn Vendor Quản Lý --' },
                      ...vendors.map((v) => ({
                        value: v.id,
                        label: `VD-${v.id} – ${v.vendorName}`,
                      })),
                    ]}
                    value={yardFormData.vendorId}
                    onChange={(val) => setYardFormData({ ...yardFormData, vendorId: Number(val) })}
                    buttonClassName="w-full bg-white border-[#E6E2D8] py-2"
                  />
                </div>
              </div>

              {/* Yard Quantity (Only when creating new) */}
              {!editingYard && (
                <div className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8]">
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Số Lượng Sân Cần Tạo Hàng Loạt (Tự động đánh số 1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    tabIndex={2}
                    value={yardFormData.quantity ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const val = raw === '' ? '' : Math.max(1, Math.min(50, parseInt(raw, 10) || 1));
                      setYardFormData({
                        ...yardFormData,
                        quantity: val as any,
                      });
                    }}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-[#6F7E72] font-semibold mt-1.5">
                    💡 Hệ thống sẽ tự động tạo dãy sân từ: <span className="font-bold text-[#006241]">{yardFormData.yardName ? `${yardFormData.yardName} 1, ${yardFormData.yardName} 2...` : 'Sân 1, Sân 2...'}</span>
                  </p>
                </div>
              )}

              {/* Row 2: Sport Type & Yard Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Sport Type */}
                <div className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] flex flex-col justify-between">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-extrabold text-[#1E3932] mb-2">
                      <Dumbbell className="w-3.5 h-3.5 text-[#006241]" />
                      Loại Môn Thể Thao
                    </label>
                    <CustomSelect
                      options={[
                        { value: 0, label: '-- Chọn Môn Thể Thao --' },
                        ...sportTypes.map((st) => ({
                          value: st.id,
                          label: st.sportName,
                        })),
                      ]}
                      value={yardFormData.sportTypeId}
                      onChange={(val) => setYardFormData({ ...yardFormData, sportTypeId: Number(val) })}
                      buttonClassName="w-full bg-white border-[#E6E2D8] py-2"
                    />
                  </div>

                  <QuickAddRow
                    placeholder="Tên môn thể thao mới..."
                    isCreating={creatingType}
                    onCreate={handleCreateSportType}
                  />
                </div>

                {/* Select Yard Type */}
                <div className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] flex flex-col justify-between">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-extrabold text-[#1E3932] mb-2">
                      <Tag className="w-3.5 h-3.5 text-[#006241]" />
                      Loại Hình Sân
                    </label>
                    <CustomSelect
                      options={[
                        { value: 0, label: '-- Chọn Loại Hình Sân --' },
                        ...typeYards.map((ty) => ({
                          value: ty.id,
                          label: ty.typeName,
                        })),
                      ]}
                      value={yardFormData.typeYardId}
                      onChange={(val) => setYardFormData({ ...yardFormData, typeYardId: Number(val) })}
                      buttonClassName="w-full bg-white border-[#E6E2D8] py-2"
                    />
                  </div>

                  <QuickAddRow
                    placeholder="Tên loại hình sân mới..."
                    isCreating={creatingType}
                    onCreate={handleCreateTypeYard}
                  />
                </div>
              </div>

              {/* Row 3: Regular & Peak Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Giá Thuê Thường (/Giờ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step={5000}
                    min={0}
                    tabIndex={6}
                    value={yardFormData.pricePerHour ?? yardFormData.price ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const val = raw === '' ? '' : Number(raw);
                      setYardFormData({ ...yardFormData, price: val as any, pricePerHour: val as any });
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1.5">
                    Giá Giờ Cao Điểm (/Giờ)
                  </label>
                  <input
                    type="number"
                    required
                    step={5000}
                    min={0}
                    tabIndex={7}
                    value={yardFormData.peakHourPrice ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const val = raw === '' ? '' : Number(raw);
                      setYardFormData({ ...yardFormData, peakHourPrice: val as any });
                    }}
                    className={inputCls}
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REAL PHOTOS & COVER MANAGER */}
          {activeTab === 'images' && editingYard && (
            <div className="space-y-6">
              {/* Dropzone with HTML5 Drag & Drop */}
              <div
                onClick={() => !isUploadingImages && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isUploadingImages) setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isUploadingImages) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  if (!isUploadingImages) handleDropFiles(e);
                }}
                className={`p-6 sm:p-8 border-2 border-dashed rounded-[24px] text-center transition-all group ${isUploadingImages
                    ? 'border-[#006241] bg-emerald-50/70 cursor-wait'
                    : isDragging
                      ? 'border-[#006241] bg-emerald-50 scale-[1.01] ring-4 ring-[#006241]/20 cursor-pointer'
                      : 'border-[#006241]/40 hover:border-[#006241] bg-[#FBF8F0] hover:bg-emerald-50/40 cursor-pointer'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  disabled={isUploadingImages}
                  accept="image/*"
                  onChange={handleUploadFiles}
                  className="hidden"
                />
                {isUploadingImages ? (
                  <Loader2 className="w-10 h-10 mx-auto text-[#006241] animate-spin mb-2" />
                ) : (
                  <Upload
                    className={`w-10 h-10 mx-auto transition-transform mb-2 ${isDragging ? 'text-[#006241] scale-125 animate-bounce' : 'text-[#006241] group-hover:scale-110'
                      }`}
                  />
                )}
                <h4 className="text-sm font-black text-[#1E3932]">
                  {isUploadingImages
                    ? 'Đang Tải Ảnh Lên Google Drive...'
                    : isDragging
                      ? 'Thả Ảnh Vào Đây Để Tải Lên Ngay'
                      : 'Tải Thêm Ảnh Thực Tế Cho Sân'}
                </h4>
                <p className="text-xs text-[#6F7E72] mt-1">
                  {isUploadingImages ? (
                    'Vui lòng chờ trong giây lát trong khi ảnh đang được xử lý và lưu trữ...'
                  ) : (
                    <>
                      Chọn hoặc kéo thả nhiều ảnh (.JPG, .PNG, .WEBP) tải trực tiếp vào Google Drive folder{' '}
                      <span className="font-bold text-[#006241] font-mono">images-yard</span>
                    </>
                  )}
                </p>
              </div>

              {/* Photos Gallery Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1E3932] uppercase tracking-wider">
                    Danh Sách Ảnh Đã Tải Lên ({yardImages.length} ảnh):
                  </span>
                  <button
                    type="button"
                    onClick={loadYardImages}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#006241] hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingImages ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                </div>

                {isLoadingImages ? (
                  <div className="py-12 text-center text-[#6F7E72]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#006241]" />
                    <span className="text-xs font-bold block mt-2">Đang tải ảnh từ Google Drive...</span>
                  </div>
                ) : yardImages.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] text-center text-xs text-[#6F7E72] space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-[#6F7E72]/50" />
                    <p className="font-bold">Sân này chưa có ảnh thực tế nào được tải lên.</p>
                    <p className="text-[11px]">
                      Hãy tải ảnh lên để người chơi quan sát cơ sở vật chất và đặt sân nhiều hơn!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {yardImages.map((img) => (
                      <div
                        key={img.id}
                        className={`relative rounded-2xl overflow-hidden border-2 bg-white shadow-xs group transition-all ${img.isCover
                            ? 'border-[#006241] ring-3 ring-[#006241]/20'
                            : 'border-[#E6E2D8] hover:border-[#006241]/50'
                          }`}
                      >
                        <div className="h-28 w-full overflow-hidden bg-[#F2F0EB]">
                          <img
                            src={img.imageUrl}
                            alt={img.caption || 'Ảnh sân'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Cover Badge */}
                        {img.isCover && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#006241] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                            ★ Ảnh Bìa
                          </span>
                        )}

                        {/* Action Buttons Overlay */}
                        <div className="p-2 bg-white border-t border-[#E6E2D8] flex items-center justify-between gap-1">
                          {!img.isCover ? (
                            <button
                              type="button"
                              onClick={() => handleSetCover(img.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-[#006241] text-[#006241] hover:text-white text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              <span>Đặt Bìa</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-[#006241] px-1">
                              ✓ Ảnh Chính
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer ml-auto"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW AS USER (AUTHENTIC 3-COLUMN SPECS SIMULATION MATCHING IMAGE 2) */}
          {activeTab === 'preview' && editingYard && (
            <div className="space-y-5">
              {/* Preview Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1E3932] uppercase tracking-wider">
                    Mô Phỏng Trải Nghiệm Khách Hàng Khi Đặt Sân:
                  </h4>
                  <p className="text-xs text-[#6F7E72] mt-0.5">
                    Giao diện thực tế mà người chơi sẽ nhìn thấy khi duyệt và xem thông tin chi tiết của sân này.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/yard/${editingYard.id}`, '_blank')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-black shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <span>Mở Tab Mới</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Main Simulated Court Details (Spacious Image 2 design) */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E6E2D8] shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                {/* Left Column: Vertical Thumbnails Strip (2 Cols on lg) */}
                <div className="lg:col-span-2 flex lg:flex-col items-center gap-3 order-2 lg:order-1 overflow-x-auto lg:overflow-y-auto no-scrollbar max-h-[500px]">
                  {displayImages.map((img, idx) => {
                    const isSelected = idx === selectedPreviewIndex;
                    return (
                      <button
                        key={`${img.id}-${idx}`}
                        type="button"
                        onClick={() => setSelectedPreviewIndex(idx)}
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-full lg:h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 group ${isSelected
                            ? 'border-[#006241] ring-4 ring-[#006241]/20 shadow-md scale-102'
                            : 'border-[#E6E2D8] hover:border-[#006241]/50 opacity-75 hover:opacity-100'
                          }`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.caption || `Ảnh sân ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {img.isCover && (
                          <span className="absolute top-1 left-1 px-2 py-0.5 rounded-md bg-[#006241] text-white text-[9px] font-black uppercase shadow-xs">
                            Bìa
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Center Column: Main High-Resolution Preview (5 Cols on lg) */}
                <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col">
                  <div className="relative w-full h-[300px] sm:h-[380px] lg:h-[500px] rounded-[28px] overflow-hidden bg-[#1E3932]/5 border border-[#E6E2D8] group shadow-inner">
                    <img
                      src={currentPreviewImg?.imageUrl}
                      alt={currentPreviewImg?.caption || yardFormData.yardName}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-103"
                    />

                    {/* Top Badges Overlay */}
                    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold font-mono">
                        {selectedPreviewIndex + 1} / {displayImages.length}
                      </span>
                      {currentPreviewImg?.isCover && (
                        <span className="px-3.5 py-1 rounded-full bg-[#006241] text-white text-xs font-black uppercase tracking-wider shadow-sm">
                          ★ Ảnh Bìa Chính
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Court Specifications Details Panel (5 Cols on lg) */}
                <div className="lg:col-span-5 order-3 flex flex-col">
                  <div className="p-6 sm:p-7 rounded-[28px] bg-[#FBF8F0] border border-[#E6E2D8] flex flex-col justify-between h-full space-y-4 shadow-2xs">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3.5 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-xs font-black uppercase tracking-wider">
                          {currentSport?.sportName || 'Thể Thao'}
                        </span>
                        <span className="px-3.5 py-1 rounded-full bg-[#F2F0EB] text-[#1E3932] font-mono text-xs font-bold">
                          {currentType?.typeName || 'Sân Tiêu Chuẩn'}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#1E3932] tracking-tight mt-2.5 truncate" title={yardFormData.yardName}>
                        {yardFormData.yardName || 'Tên Sân'}
                      </h3>
                    </div>

                    {/* Authentic Info Rows */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Thể Loại Môn:</span>
                        <span className="font-black text-[#006241] uppercase font-mono">
                          {currentSport?.sportName || 'Thể Thao'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Loại Quy Cách Sân:</span>
                        <span className="font-extrabold text-[#1E3932] font-mono">
                          {currentType?.typeName || 'Sân Tiêu Chuẩn'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold shrink-0">Thuộc Cụm Sân:</span>
                        <span className="font-extrabold text-[#1E3932] truncate max-w-[280px] text-right ml-2">
                          {currentVendor?.vendorName || (editingYard.vendor?.vendorName ?? 'Cơ Sở Vendor')}
                        </span>
                      </div>

                      {(currentVendor?.vendorAddress || editingYard.vendor?.vendorAddress) && (
                        <div className="flex items-start justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                          <span className="text-[#6F7E72] font-bold shrink-0">Địa Chỉ:</span>
                          <span className="font-semibold text-[#1E3932] text-right ml-3 line-clamp-2">
                            {currentVendor?.vendorAddress || editingYard.vendor?.vendorAddress}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Trạng Thái Sân:</span>
                        <span
                          className={`font-black text-xs px-3 py-1 rounded-full whitespace-nowrap ${editingYard.status === 'maintenance'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-[#006241]'
                            }`}
                        >
                          {editingYard.status === 'maintenance' ? 'Đang Bảo Trì' : 'Sẵn Sàng Phục Vụ'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Giá Thuê Thường:</span>
                        <span className="font-black font-mono text-sm text-[#006241]">
                          {Number(yardFormData.pricePerHour || yardFormData.price || 100000).toLocaleString('vi-VN')} VNĐ/h
                        </span>
                      </div>

                      {yardFormData.peakHourPrice && (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                          <span className="text-[#6F7E72] font-bold">Giá Giờ Cao Điểm:</span>
                          <span className="font-black font-mono text-sm text-amber-700">
                            {Number(yardFormData.peakHourPrice).toLocaleString('vi-VN')} VNĐ/h
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Unified Real Photo Notice Footer */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs">
                      <div className="flex items-center gap-1.5 text-[#006241] font-extrabold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-[#006241] shrink-0" />
                        <span>Hình Ảnh Thực Tế Chụp Tại Sân</span>
                      </div>
                      <p className="text-[11px] text-[#6F7E72] leading-relaxed">
                        Chủ sân cập nhật thực tế giúp người chơi quan sát không gian trước khi đến sân.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#FBF8F0] border-t border-[#E6E2D8] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-[#F2F0EB] text-[#1E3932] border border-[#E6E2D8] font-bold text-xs cursor-pointer transition shadow-2xs"
          >
            Đóng
          </button>

          {activeTab === 'info' && (
            <button
              type="submit"
              form="admin-yard-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] disabled:opacity-60 text-[#FBF8F0] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Lưu Dữ Liệu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingYard ? 'Lưu Thay Đổi Sân' : 'Xác Nhận Tạo Sân'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

