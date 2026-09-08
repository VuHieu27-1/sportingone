import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Store, X, Save, RefreshCw, MapPin, Building, Home, Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminVendor, AdminUser } from '../../services/adminService';
import { addressService, ProvinceItem, WardItem } from '../../services/addressService';
import { TimePickerInput } from '../common/TimePickerInput';
import { CustomSelect } from '../common/CustomSelect';

/**
 * Normalizes Vietnamese string for accurate comparison.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

/**
 * Executes clean Administrative Name operation.
 */
function cleanAdministrativeName(name: string): string {
  if (!name) return '';
  return normalizeString(name)
    .replace(/^(thanh pho|tinh|phuong|xa|thi tran|tp\.|tp)\s+/gi, '')
    .replace(/\s+(thanh pho|tinh|phuong|xa|thi tran|tp\.|tp)$/gi, '')
    .replace(/^tp\s+/gi, '')
    .trim();
}

/**
 * Matches existing full address string to hierarchy (Province, Ward, Street).
 */
async function matchAddressToHierarchy(fullAddress: string, provinceList: ProvinceItem[]) {
  const defaultResult = {
    provinceCode: '' as number | '',
    wardCode: '' as number | '',
    street: fullAddress || '',
    wards: [] as WardItem[],
  };

  if (!fullAddress || !provinceList || provinceList.length === 0) {
    return defaultResult;
  }

  const rawParts = fullAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const cleanParts = rawParts.filter(
    (p) => !/^vi[eệ]t\s*nam$/i.test(p) && !/^vietnam$/i.test(p) && !/^\d{4,6}$/.test(p)
  );

  if (cleanParts.length === 0) {
    return defaultResult;
  }

  const indexedParts = cleanParts.map((text, index) => ({
    text,
    index,
    normClean: cleanAdministrativeName(text),
    normRaw: normalizeString(text),
    used: false,
  }));

  // Step 1: Match Province (right-to-left)
  let matchedProv: ProvinceItem | undefined;
  for (let i = indexedParts.length - 1; i >= 0; i--) {
    const part = indexedParts[i];
    for (const prov of provinceList) {
      const normProvClean = cleanAdministrativeName(prov.name);
      const normProvRaw = normalizeString(prov.name);
      if (
        (normProvClean && part.normClean === normProvClean) ||
        (normProvRaw && part.normRaw === normProvRaw)
      ) {
        matchedProv = prov;
        part.used = true;
        break;
      }
    }
    if (matchedProv) break;
  }

  if (!matchedProv) {
    for (let i = indexedParts.length - 1; i >= 0; i--) {
      const part = indexedParts[i];
      for (const prov of provinceList) {
        const normProvClean = cleanAdministrativeName(prov.name);
        if (
          normProvClean.length >= 3 &&
          (part.normClean.includes(normProvClean) || normProvClean.includes(part.normClean))
        ) {
          matchedProv = prov;
          part.used = true;
          break;
        }
      }
      if (matchedProv) break;
    }
  }

  if (!matchedProv) {
    return {
      ...defaultResult,
      street: cleanParts.join(', '),
    };
  }

  // Step 2: Match Ward directly under Province
  let wardList: WardItem[] = [];
  let matchedWard: WardItem | undefined;

  try {
    wardList = await addressService.getWards(matchedProv.code);
  } catch {
    wardList = [];
  }

  if (wardList.length > 0) {
    for (let i = indexedParts.length - 1; i >= 0; i--) {
      const part = indexedParts[i];
      if (part.used) continue;

      for (const ward of wardList) {
        const normWardClean = cleanAdministrativeName(ward.name);
        const normWardRaw = normalizeString(ward.name);
        if (
          (normWardClean && part.normClean === normWardClean) ||
          (normWardRaw && part.normRaw === normWardRaw)
        ) {
          matchedWard = ward;
          part.used = true;
          break;
        }
      }
      if (matchedWard) break;
    }

    if (!matchedWard) {
      for (let i = indexedParts.length - 1; i >= 0; i--) {
        const part = indexedParts[i];
        if (part.used) continue;

        for (const ward of wardList) {
          const normWardClean = cleanAdministrativeName(ward.name);
          if (
            normWardClean.length >= 3 &&
            (part.normClean.includes(normWardClean) || normWardClean.includes(part.normClean))
          ) {
            matchedWard = ward;
            part.used = true;
            break;
          }
        }
        if (matchedWard) break;
      }
    }
  }

  // Step 3: Any unused parts belong to street address
  const unusedStreetParts = indexedParts.filter((p) => !p.used).map((p) => p.text);
  const street = unusedStreetParts.length > 0 ? unusedStreetParts.join(', ') : '';

  return {
    provinceCode: matchedProv.code,
    wardCode: matchedWard ? matchedWard.code : ('' as number | ''),
    street,
    wards: wardList,
  };
}

interface AddressSelectOption {
  code: number;
  name: string;
}

interface AddressSearchableSelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  value: number | '';
  options: AddressSelectOption[];
  onChange: (code: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const AddressSearchableSelect: React.FC<AddressSearchableSelectProps> = ({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onChange,
  disabled = false,
  isLoading = false,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.code === Number(value));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 240) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-semibold text-[#6F7E72] mb-1 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </label>

      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={handleToggle}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? 'bg-gray-100 border-[#E6E2D8] text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#006241] text-[#1E3932] ring-2 ring-[#006241]/10'
            : 'bg-white border-[#E6E2D8] text-[#1E3932] hover:border-[#006241]'
        }`}
      >
        <span className="truncate">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006241]" />
              <span>Đang tải...</span>
            </span>
          ) : selectedOption ? (
            selectedOption.name
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#6F7E72] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#006241]' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 z-50 bg-white border border-[#E6E2D8] rounded-2xl shadow-xl overflow-hidden flex flex-col ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <div className="p-2 bg-[#FBF8F0] border-b border-[#E6E2D8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-[#E6E2D8] text-xs text-[#1E3932] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#006241]"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400 italic">Không tìm thấy</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.code === Number(value);
                return (
                  <button
                    type="button"
                    key={opt.code}
                    onClick={() => {
                      onChange(opt.code);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#006241] text-white font-bold'
                        : 'text-[#1E3932] font-medium hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AdminVendorModalProps {
  isOpen: boolean;
  editingVendor: AdminVendor | null;
  users: AdminUser[];
  vendorFormData: {
    vendorName: string;
    vendorAddress: string;
    vendorPhone: string;
    openTime?: string;
    closeTime?: string;
    status: 'active' | 'pending' | 'reject';
    userId?: number;
  };
  setVendorFormData: React.Dispatch<
    React.SetStateAction<{
      vendorName: string;
      vendorAddress: string;
      vendorPhone: string;
      openTime?: string;
      closeTime?: string;
      status: 'active' | 'pending' | 'reject';
      userId?: number;
    }>
  >;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const AdminVendorModal: React.FC<AdminVendorModalProps> = ({
  isOpen,
  editingVendor,
  users,
  vendorFormData,
  setVendorFormData,
  isSubmitting,
  onClose,
  onSave,
}) => {
  // Administrative address selection state
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>('');
  const [selectedWardCode, setSelectedWardCode] = useState<number | ''>('');
  const [streetAddress, setStreetAddress] = useState('');

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  // Load provinces on modal open & parse existing vendorAddress
  useEffect(() => {
    if (!isOpen) return;

    const initAddressData = async () => {
      setIsLoadingProvinces(true);
      try {
        const provs = await addressService.getProvinces();
        setProvinces(provs);

        const currentAddr = vendorFormData.vendorAddress || editingVendor?.vendorAddress || '';
        if (currentAddr && provs.length > 0) {
          const matched = await matchAddressToHierarchy(currentAddr, provs);
          if (matched.provinceCode) {
            setSelectedProvinceCode(matched.provinceCode);
            setWards(matched.wards);
            setSelectedWardCode(matched.wardCode);
          }
          setStreetAddress(matched.street || '');
        } else {
          setSelectedProvinceCode('');
          setSelectedWardCode('');
          setStreetAddress('');
          setWards([]);
        }
      } catch {
        toast.error('Không thể tải danh sách Tỉnh/Thành phố.');
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    initAddressData();
  }, [isOpen, editingVendor]);

  // Handle Province selection
  const handleProvinceSelect = async (code: number) => {
    setSelectedProvinceCode(code);
    setSelectedWardCode('');
    setWards([]);

    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(code);
      setWards(data);
    } catch {
      toast.error('Không thể tải danh sách Phường/Xã.');
    } finally {
      setIsLoadingWards(false);
    }
  };

  // Handle Ward selection
  const handleWardSelect = (code: number) => {
    setSelectedWardCode(code);
  };

  // Compute full concatenated address string whenever controls change
  useEffect(() => {
    if (!isOpen) return;

    const provinceObj = provinces.find((p) => p.code === Number(selectedProvinceCode));
    const wardObj = wards.find((w) => w.code === Number(selectedWardCode));

    const parts = [streetAddress.trim(), wardObj?.name, provinceObj?.name].filter(
      Boolean
    );

    if (parts.length > 0) {
      const full = parts.join(', ');
      setVendorFormData((prev) => ({ ...prev, vendorAddress: full }));
    }
  }, [streetAddress, selectedProvinceCode, selectedWardCode, provinces, wards, isOpen, setVendorFormData]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base">
              {editingVendor ? `Cập Nhật Cơ Sở Vendor: VD-${editingVendor.id}` : 'Tạo Cơ Sở Vendor Mới'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#6F7E72] hover:text-white cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={onSave} className="flex-1 flex flex-col min-h-0 overflow-hidden text-left">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {/* Vendor Name */}
            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Tên Cơ Sở Vendor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                tabIndex={1}
                value={vendorFormData.vendorName}
                onChange={(e) => setVendorFormData({ ...vendorFormData, vendorName: e.target.value })}
                placeholder="Ví dụ: Sân Cầu Lông Tân Bình"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            {/* Owner Account Select */}
            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">Chủ Cơ Sở Vendor (Tài Khoản Owner)</label>
              <CustomSelect
                options={[
                  { value: 0, label: '-- Chọn Tài Khoản Chủ --' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: `${u.username} (${u.email}) - ID: ${u.id}`,
                  })),
                ]}
                value={vendorFormData.userId || 0}
                onChange={(val) => setVendorFormData({ ...vendorFormData, userId: Number(val) })}
                buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
              />
            </div>

            {/* Vendor Phone */}
            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Số Điện Thoại Hotline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                tabIndex={3}
                value={vendorFormData.vendorPhone}
                onChange={(e) => setVendorFormData({ ...vendorFormData, vendorPhone: e.target.value })}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            {/* Opening Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <TimePickerInput
                  label="Giờ Mở Cửa"
                  value={vendorFormData.openTime || '06:00'}
                  onChange={(val) => setVendorFormData({ ...vendorFormData, openTime: val })}
                  buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
                />
              </div>
              <div>
                <TimePickerInput
                  label="Giờ Đóng Cửa"
                  value={vendorFormData.closeTime || '23:00'}
                  onChange={(val) => setVendorFormData({ ...vendorFormData, closeTime: val })}
                  buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
                />
              </div>
            </div>

            {/* Hierarchical Administrative Address Selection */}
            <div className="space-y-3 pt-2 border-t border-dashed border-[#E6E2D8]">
              <label className="block text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#006241]" />
                <span>Địa chỉ cụm sân (Chọn Tỉnh Thành / Phường Xã từ Hệ Thống)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AddressSearchableSelect
                  label="Tỉnh / Thành phố"
                  placeholder="-- Chọn Tỉnh / Thành phố --"
                  searchPlaceholder="Gõ để tìm Tỉnh/Thành phố..."
                  value={selectedProvinceCode}
                  options={provinces}
                  onChange={handleProvinceSelect}
                  isLoading={isLoadingProvinces}
                  icon={<Building className="w-3.5 h-3.5 text-[#006241]" />}
                />

                <AddressSearchableSelect
                  label="Phường / Xã"
                  placeholder={!selectedProvinceCode ? '-- Chọn Tỉnh trước --' : '-- Chọn Phường / Xã --'}
                  searchPlaceholder="Gõ để tìm Phường/Xã..."
                  value={selectedWardCode}
                  options={wards}
                  onChange={handleWardSelect}
                  disabled={!selectedProvinceCode}
                  isLoading={isLoadingWards}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6F7E72] mb-1 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-[#006241]" />
                  <span>Số nhà, Tên đường (Địa chỉ cụ thể)</span>
                </label>
                <input
                  type="text"
                  tabIndex={4}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Đường Cộng Hòa"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>
            </div>

            {/* Approval Status */}
            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">Trạng Thái Phê Duyệt</label>
              <CustomSelect
                options={[
                  { value: 'active', label: 'Đã Duyệt (Active)' },
                  { value: 'pending', label: 'Chờ Duyệt (Pending)' },
                  { value: 'reject', label: 'Từ Chối (Rejected)' },
                ]}
                value={vendorFormData.status}
                onChange={(val) => setVendorFormData({ ...vendorFormData, status: val as any })}
                buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-4 bg-[#FBF8F0] border-t border-[#E6E2D8] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-bold text-xs cursor-pointer transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu Vendor</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
