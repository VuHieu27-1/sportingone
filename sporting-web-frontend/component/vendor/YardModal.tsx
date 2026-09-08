import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  X,
  Plus,
  Save,
  RefreshCw,
  Dumbbell,
  Tag,
  Check,
  Loader2,
  Camera,
  Upload,
  Trash2,
  Star,
  Eye,
  ExternalLink,
  Info,
  Store,
  Layers,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomSelect } from '../common/CustomSelect';
import { vendorService, BackendYardItem, getSportImageUrl } from '../../services/vendorService';
import { adminService } from '../../services/adminService';
import { imagesYardService, BackendYardImage } from '../../services/imagesYardService';

export type YardModalTab = 'info' | 'images' | 'preview';

interface YardModalProps {
  isOpen: boolean;
  vendorId: number;
  vendorsList?: Array<{ id: number; vendorName: string }>;
  editingYard: BackendYardItem | null;
  sportTypes: Array<{ id: number; sportName: string }>;
  yardTypes: Array<{ id: number; typeName: string }>;
  initialTab?: YardModalTab;
  onClose: () => void;
  onSuccess: () => void;
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

export const YardModal: React.FC<YardModalProps> = ({
  isOpen,
  vendorId,
  vendorsList = [],
  editingYard,
  sportTypes: initialSportTypes,
  yardTypes: initialYardTypes,
  initialTab = 'info',
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<YardModalTab>(initialTab);

  const [formData, setFormData] = useState<{
    yardName: string;
    quantity: number | string;
    targetVendorId: number;
    sportTypeId: number;
    typeYardId: number;
    price: number | string;
    peakHourPrice: number | string;
    status: string;
  }>({
    yardName: '',
    quantity: 1,
    targetVendorId: vendorId,
    sportTypeId: 0,
    typeYardId: 0,
    price: 100000,
    peakHourPrice: 150000,
    status: 'available',
  });

  const [localSportTypes, setLocalSportTypes] = useState(initialSportTypes);
  const [localYardTypes, setLocalYardTypes] = useState(initialYardTypes);

  const [isCreatingSport, setIsCreatingSport] = useState(false);
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yard Images Management State (Tab 2) & Preview State (Tab 3)
  const [yardImages, setYardImages] = useState<BackendYardImage[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data ONLY when modal is opened or target yard changes
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(editingYard ? initialTab : 'info');
    setSelectedPreviewIndex(0);
    setLocalSportTypes(initialSportTypes);
    setLocalYardTypes(initialYardTypes);

    if (editingYard) {
      setFormData({
        yardName: editingYard.yardName || '',
        quantity: 1,
        targetVendorId: editingYard.vendor?.id || vendorId,
        sportTypeId: editingYard.sportType?.id || (initialSportTypes[0]?.id || 0),
        typeYardId: editingYard.typeYard?.id || (initialYardTypes[0]?.id || 0),
        price: Number(editingYard.price) || 100000,
        peakHourPrice: Number((editingYard as any).peakHourPrice) || 150000,
        status: editingYard.status ? String(editingYard.status).toLowerCase().trim() : 'available',
      });

      setIsLoadingImages(true);
      imagesYardService
        .getYardImages(editingYard.id)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setYardImages(res.data);
          } else {
            setYardImages([]);
          }
        })
        .catch(() => setYardImages([]))
        .finally(() => setIsLoadingImages(false));
    } else {
      setFormData({
        yardName: '',
        quantity: 1,
        targetVendorId: vendorId,
        sportTypeId: initialSportTypes[0]?.id || 0,
        typeYardId: initialYardTypes[0]?.id || 0,
        price: 100000,
        peakHourPrice: 150000,
        status: 'available',
      });
      setYardImages([]);
    }
  }, [isOpen, editingYard?.id, vendorId, initialTab]);

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

  // Process list of File objects to upload
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
        toast.success(`Đã tải lên ${successCount} ảnh lên!`);
        await loadYardImages();
      } else {
        toast.error('Không thể tải ảnh lên máy chủ');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh lên Google Drive');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle File Input Change
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFileList(e.target.files);
    }
  };

  // Handle Drag and Drop
  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFileList(e.dataTransfer.files);
    }
  };

  // Handle Setting an image as Cover
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

  // Handle Delete image
  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi sân?')) return;
    try {
      const res = await imagesYardService.deleteYardImage(imageId);
      if (res.success) {
        toast.success('Đã xóa ảnh thành công');
        loadYardImages();
      } else {
        toast.error(res.message || 'Không thể xóa ảnh');
      }
    } catch {
      toast.error('Lỗi khi xóa ảnh');
    }
  };

  // Quick Create Sport Type
  const handleCreateSportType = async (name: string) => {
    setIsCreatingSport(true);
    try {
      const res = await adminService.createSportType(name);
      if (res.success && res.data) {
        toast.success(`Đã thêm môn thể thao "${name}"`);
        const newSport = res.data;
        setLocalSportTypes((prev) => [...prev, newSport]);
        setFormData((prev) => ({ ...prev, sportTypeId: newSport.id }));
      } else {
        toast.error(res.message || 'Không thể thêm môn thể thao');
      }
    } catch {
      toast.error('Lỗi khi thêm môn thể thao');
    } finally {
      setIsCreatingSport(false);
    }
  };

  // Quick Create Yard Type
  const handleCreateYardType = async (name: string) => {
    setIsCreatingType(true);
    try {
      const res = await adminService.createTypeYard(name);
      if (res.success && res.data) {
        toast.success(`Đã thêm loại sân "${name}"`);
        const newType = res.data;
        setLocalYardTypes((prev) => [...prev, newType]);
        setFormData((prev) => ({ ...prev, typeYardId: newType.id }));
      } else {
        toast.error(res.message || 'Không thể thêm loại sân');
      }
    } catch {
      toast.error('Lỗi khi thêm loại sân');
    } finally {
      setIsCreatingType(false);
    }
  };

  // Submit Save/Update Yard Info
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.yardName.trim()) {
      toast.error('Vui lòng nhập tên sân con');
      return;
    }
    if (!formData.sportTypeId) {
      toast.error('Vui lòng chọn môn thể thao');
      return;
    }
    if (!formData.typeYardId) {
      toast.error('Vui lòng chọn loại sân');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingYard) {
        const payload: any = {
          yardName: formData.yardName.trim(),
          vendorId: formData.targetVendorId,
          sportTypeId: formData.sportTypeId,
          typeYardId: formData.typeYardId,
          price: Number(formData.price),
          status: formData.status,
        };
        const res = await vendorService.updateYard(editingYard.id, payload);
        if (res.success) {
          toast.success('Cập nhật sân con thành công!');
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Không thể cập nhật sân con');
        }
      } else {
        const qty = Math.max(1, Number(formData.quantity) || 1);
        const baseName = formData.yardName.trim();
        let createdCount = 0;
        let lastErrorMsg = '';

        if (qty === 1) {
          const payload = {
            yardName: baseName,
            vendorId: formData.targetVendorId,
            sportTypeId: formData.sportTypeId,
            typeYardId: formData.typeYardId,
            price: Number(formData.price) || 0,
            status: formData.status || 'available',
          };
          const res = await vendorService.createYard(payload);
          if (res.success) {
            createdCount++;
          } else {
            lastErrorMsg = res.message || '';
          }
        } else {
          // Clean baseName if it already ends with numbers
          const cleanBase = baseName.replace(/\s*\d+$/, '');
          const createPromises = [];

          for (let i = 1; i <= qty; i++) {
            const yardName = `${cleanBase} ${i}`;
            const payload = {
              yardName,
              vendorId: formData.targetVendorId,
              sportTypeId: formData.sportTypeId,
              typeYardId: formData.typeYardId,
              price: Number(formData.price) || 0,
              status: formData.status || 'available',
            };
            createPromises.push(vendorService.createYard(payload));
          }

          const results = await Promise.all(createPromises);
          results.forEach((res) => {
            if (res.success) {
              createdCount++;
            } else if (!lastErrorMsg && res.message) {
              lastErrorMsg = res.message;
            }
          });
        }

        if (createdCount > 0) {
          toast.success(
            createdCount === 1
              ? 'Tạo mới sân con thành công!'
              : `Đã tạo thành công hàng loạt ${createdCount} sân con mới!`
          );
          onSuccess();
          onClose();
        } else {
          toast.error(lastErrorMsg || 'Không thể tạo mới sân con');
        }
      }
    } catch (err: any) {
      toast.error(`Lỗi lưu dữ liệu: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentSport = localSportTypes.find((s) => s.id === Number(formData.sportTypeId));
  const currentType = localYardTypes.find((t) => t.id === Number(formData.typeYardId));
  const currentVendor = vendorsList.find((v) => v.id === Number(formData.targetVendorId));

  const fallbackSportImage = getSportImageUrl(currentSport?.sportName || formData.yardName);
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
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white rounded-[32px] w-[95vw] max-w-[1340px] border border-[#E6E2D8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Title & Tab Navigation */}
        <div className="px-6 py-4.5 bg-[#1E3932] text-[#FBF8F0] border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                  {editingYard ? `MÃ SÂN: YARD-${editingYard.id}` : 'THÊM MỚI SÂN CON'}
                </span>
                {editingYard && (
                  <span
                    className={`text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full whitespace-nowrap ${formData.status === 'available'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      }`}
                  >
                    {formData.status === 'available' ? 'SẴN SÀNG' : 'BẢO TRÌ'}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight mt-0.5 truncate" title={formData.yardName}>
                {editingYard ? `Hồ Sơ: ${formData.yardName || 'Sân con'}` : 'Tạo Sân Con Mới'}
              </h2>
            </div>
          </div>

          {/* Close & Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch md:self-auto justify-between md:justify-end overflow-hidden">
            {editingYard && (
              <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/10 backdrop-blur-xs overflow-x-auto max-w-[calc(100vw-5.5rem)] md:max-w-none scrollbar-none shrink gap-1">
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
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Active Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5">
          {/* TAB 1: BASIC INFO & PRICING */}
          {activeTab === 'info' && (
            <form id="yard-form" onSubmit={handleSubmit} className="space-y-5">
              {/* SECTION 1: VENDOR & GENERAL INFO */}
              <div className="p-5 rounded-2xl bg-[#FBF8F0]/80 border border-[#E6E2D8] space-y-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E6E2D8]">
                  <Building2 className="w-4 h-4 text-[#006241]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1E3932]">
                    Thông Tin Cơ Bản Sân Con
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Vendor */}
                  {vendorsList.length > 1 && (
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-extrabold text-[#1E3932] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#006241]" />
                        <span>Thuộc Cụm Sân Chủ Quản</span>
                      </label>
                      <CustomSelect
                        options={vendorsList.map((v) => ({
                          value: v.id,
                          label: `${v.vendorName} (ID: ${v.id})`,
                        }))}
                        value={formData.targetVendorId}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, targetVendorId: Number(val) }))
                        }
                        buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5 shadow-xs"
                      />
                    </div>
                  )}

                  {/* Yard Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#1E3932]">
                      Tên Sân Con <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Sân bóng chuyền 3"
                      value={formData.yardName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, yardName: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#1E3932]">Trạng Thái Hoạt Động</label>
                    <CustomSelect
                      options={[
                        { value: 'available', label: '🟢 Sẵn sàng nhận khách (Available)' },
                        { value: 'maintenance', label: '🔴 Tạm đóng bảo trì (Maintenance)' },
                      ]}
                      value={formData.status}
                      onChange={(val) => setFormData((prev) => ({ ...prev, status: String(val) }))}
                      className="w-full"
                      buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SPORT TYPE & YARD SPEC */}
              <div className="p-5 rounded-2xl bg-[#FBF8F0]/80 border border-[#E6E2D8] space-y-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E6E2D8]">
                  <Dumbbell className="w-4 h-4 text-[#006241]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1E3932]">
                    Môn Thể Thao & Quy Cách
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sport Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[#1E3932] flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-[#006241]" />
                      <span>Môn Thể Thao</span> <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      options={[
                        { value: 0, label: '-- Chọn môn thể thao --' },
                        ...localSportTypes.map((s) => ({
                          value: s.id,
                          label: s.sportName,
                        })),
                      ]}
                      value={formData.sportTypeId}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, sportTypeId: Number(val) }))
                      }
                      buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5 shadow-xs"
                    />
                    <QuickAddRow
                      placeholder="Nhập tên môn thể thao mới..."
                      isCreating={isCreatingSport}
                      onCreate={handleCreateSportType}
                    />
                  </div>

                  {/* Yard Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[#1E3932] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#006241]" />
                      <span>Loại Quy Cách Sân</span> <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      options={[
                        { value: 0, label: '-- Chọn loại sân --' },
                        ...localYardTypes.map((t) => ({
                          value: t.id,
                          label: t.typeName,
                        })),
                      ]}
                      value={formData.typeYardId}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, typeYardId: Number(val) }))
                      }
                      buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5 shadow-xs"
                    />
                    <QuickAddRow
                      placeholder="Nhập loại sân mới (VD: Sân 7 người)..."
                      isCreating={isCreatingType}
                      onCreate={handleCreateYardType}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PRICING & BULK CREATION */}
              <div className="p-5 rounded-2xl bg-[#FBF8F0]/80 border border-[#E6E2D8] space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D8]">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#006241]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1E3932]">
                      Giá Thuê & Thiết Lập Tạo Hàng Loạt
                    </h3>
                  </div>
                  <span className="text-[11px] font-black text-[#006241] font-mono bg-[#006241]/10 px-3 py-1 rounded-full">
                    {Number(formData.price || 0).toLocaleString('vi-VN')} VNĐ / giờ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Price */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[#1E3932]">
                      Giá Thuê Tiêu Chuẩn (VNĐ / giờ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      placeholder="100000"
                      value={formData.price}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setFormData((prev) => ({ ...prev, price: '' }));
                          return;
                        }
                        const num = Number(raw);
                        if (!isNaN(num)) {
                          setFormData((prev) => ({ ...prev, price: Math.max(0, num) }));
                        }
                      }}
                      onBlur={() => {
                        if (formData.price === '' || isNaN(Number(formData.price))) {
                          setFormData((prev) => ({ ...prev, price: 100000 }));
                        }
                      }}
                      className={inputCls}
                    />
                  </div>

                  {/* Quantity for bulk creating */}
                  {!editingYard && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-extrabold text-[#1E3932]">
                        Số Lượng Sân Cần Tạo Hàng Loạt
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        placeholder="1"
                        value={formData.quantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setFormData((prev) => ({ ...prev, quantity: '' }));
                            return;
                          }
                          const num = parseInt(raw, 10);
                          if (!isNaN(num)) {
                            setFormData((prev) => ({ ...prev, quantity: Math.max(1, Math.min(20, num)) }));
                          }
                        }}
                        onBlur={() => {
                          if (formData.quantity === '' || Number(formData.quantity) < 1) {
                            setFormData((prev) => ({ ...prev, quantity: 1 }));
                          }
                        }}
                        className={inputCls}
                      />
                      <p className="text-[10px] text-[#6F7E72] font-semibold mt-1">
                        💡 Tự động tạo dãy sân: {formData.yardName ? `${formData.yardName} 1, ${formData.yardName} 2...` : 'Sân 1, Sân 2...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REAL PHOTOS & COVER MANAGER */}
          {activeTab === 'images' && editingYard && (
            <div className="space-y-6">
              {/* Top Dropzone with HTML5 Drag & Drop Support */}
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
                className={`p-8 border-2 border-dashed rounded-[24px] text-center transition-all group ${isUploadingImages
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {yardImages.map((img) => (
                      <div
                        key={img.id}
                        className={`relative rounded-2xl overflow-hidden border-2 bg-white shadow-xs group transition-all ${img.isCover
                            ? 'border-[#006241] ring-3 ring-[#006241]/20'
                            : 'border-[#E6E2D8] hover:border-[#006241]/50'
                          }`}
                      >
                        <div className="h-32 w-full overflow-hidden bg-[#F2F0EB]">
                          <img
                            src={img.imageUrl}
                            alt={img.caption || 'Ảnh sân'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Top Badges */}
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
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-[#006241] text-[#006241] hover:text-white text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
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
              {/* Preview Banner Box */}
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
                      alt={currentPreviewImg?.caption || formData.yardName}
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
                      <h3 className="text-xl sm:text-2xl font-black text-[#1E3932] tracking-tight mt-2.5 truncate" title={formData.yardName}>
                        {formData.yardName || 'Tên Sân'}
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

                      {(editingYard.vendor?.vendorAddress || (editingYard as any).vendorAddress) && (
                        <div className="flex items-start justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                          <span className="text-[#6F7E72] font-bold shrink-0">Địa Chỉ:</span>
                          <span className="font-semibold text-[#1E3932] text-right ml-3 line-clamp-2">
                            {editingYard.vendor?.vendorAddress || (editingYard as any).vendorAddress}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Trạng Thái Sân:</span>
                        <span
                          className={`font-black text-xs px-3 py-1 rounded-full whitespace-nowrap ${formData.status === 'available'
                              ? 'bg-emerald-100 text-[#006241]'
                              : 'bg-rose-100 text-rose-700'
                            }`}
                        >
                          {formData.status === 'available' ? 'Sẵn Sàng Phục Vụ' : 'Đang Bảo Trì'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                        <span className="text-[#6F7E72] font-bold">Giá Thuê Thường:</span>
                        <span className="font-black font-mono text-sm text-[#006241]">
                          {Number(formData.price || 100000).toLocaleString('vi-VN')} VNĐ/h
                        </span>
                      </div>

                      {formData.peakHourPrice && (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E6E2D8]/70">
                          <span className="text-[#6F7E72] font-bold">Giá Giờ Cao Điểm:</span>
                          <span className="font-black font-mono text-sm text-amber-700">
                            {Number(formData.peakHourPrice).toLocaleString('vi-VN')} VNĐ/h
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
        <div className="p-5 sm:p-6 bg-[#FBF8F0] border-t border-[#E6E2D8] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full border border-[#E6E2D8] bg-white hover:bg-[#F2F0EB] text-[#6F7E72] hover:text-[#1E3932] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Đóng
          </button>

          {activeTab === 'info' && (
            <button
              type="submit"
              form="yard-form"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] disabled:opacity-50 text-white text-xs font-extrabold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingYard ? 'Lưu Thay Đổi' : 'Xác Nhận Tạo Sân'}</span>
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
