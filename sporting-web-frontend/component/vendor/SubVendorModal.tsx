import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Store, X, Plus, Save, RefreshCw, ShieldAlert, MapPin, Building, Home, Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorService, BackendVendor } from '../../services/vendorService';
import { addressService, ProvinceItem, WardItem } from '../../services/addressService';
import { userProfileService } from '../../services/userProfileService';
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
 * Executes match Address To Hierarchy operation.
 */
async function matchAddressToHierarchy(
  fullAddress: string,
  provinceList: ProvinceItem[]
) {
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
    (p) =>
      !/^vi[eệ]t\s*nam$/i.test(p) &&
      !/^vietnam$/i.test(p) &&
      !/^\d{4,6}$/.test(p)
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

  // Step 3: Any unused parts belong to the street address
  const unusedStreetParts = indexedParts
    .filter((p) => !p.used)
    .map((p) => p.text);

  const street = unusedStreetParts.length > 0 ? unusedStreetParts.join(', ') : '';

  return {
    provinceCode: matchedProv.code,
    wardCode: matchedWard ? matchedWard.code : ('' as number | ''),
    street,
    wards: wardList,
  };
}

interface SubVendorModalProps {
  isOpen: boolean;
  editingVendor: BackendVendor | null;
  onClose: () => void;
  onSuccess: () => void;
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
    /**
     * Handles event processing for handleClickOutside.
     */
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
        title={selectedOption ? selectedOption.name : placeholder}
        className={`w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer text-left ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-[#006241]/40'
          }`}
      >
        <span className="truncate pr-1">
          {isLoading
            ? 'Đang tải...'
            : selectedOption
              ? selectedOption.name
              : placeholder}
        </span>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-[#006241] animate-spin shrink-0 ml-1" />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-[#6F7E72] shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && !disabled && (
        <div className={`absolute ${openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-0 min-w-full w-max max-w-[360px] bg-white border border-[#E6E2D8] rounded-2xl shadow-2xl z-[100] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F2F0EB] text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-1 focus:ring-[#006241]"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.code === Number(value);
                return (
                  <div
                    key={opt.code}
                    onClick={() => {
                      onChange(opt.code);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${isSelected
                      ? 'bg-[#006241] text-white'
                      : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                      }`}
                  >
                    <span className="whitespace-normal break-words leading-tight pr-2">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                  </div>
                );
              })
            ) : (
              <div className="p-2 text-center text-xs text-[#6F7E72]">Không tìm thấy</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SubVendorModal: React.FC<SubVendorModalProps> = ({
  isOpen,
  editingVendor,
  onClose,
  onSuccess,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>('');
  const [selectedWardCode, setSelectedWardCode] = useState<number | ''>('');

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProvinces = useCallback(async () => {
    setIsLoadingProvinces(true);
    try {
      const data = await addressService.getProvinces();
      setProvinces(data);
    } catch {
      toast.error('Không thể tải danh sách Tỉnh/Thành phố từ API.');
    } finally {
      setIsLoadingProvinces(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editingVendor) {
        setVendorName(editingVendor.vendorName || '');
        setVendorPhone(editingVendor.vendorPhone || '');
        setOpenTime(editingVendor.openTime || '06:00');
        setCloseTime(editingVendor.closeTime || '23:00');

        const loadAndFillEditVendor = async () => {
          setIsLoadingProvinces(true);
          try {
            const provinceList = await addressService.getProvinces();
            setProvinces(provinceList);
            if (editingVendor.vendorAddress && editingVendor.vendorAddress.trim()) {
              const matched = await matchAddressToHierarchy(editingVendor.vendorAddress, provinceList);
              if (matched.provinceCode) {
                setSelectedProvinceCode(matched.provinceCode);
                setWards(matched.wards);
                setSelectedWardCode(matched.wardCode);
              }
              setStreetAddress(matched.street || '');
            } else {
              setStreetAddress('');
              setSelectedProvinceCode('');
              setSelectedWardCode('');
              setWards([]);
            }
          } catch {
            toast.error('Không thể tải danh sách Tỉnh/Thành phố từ API.');
          } finally {
            setIsLoadingProvinces(false);
          }
        };

        loadAndFillEditVendor();
      } else {
        setVendorName('');
        setVendorPhone('');
        setStreetAddress('');
        setOpenTime('06:00');
        setCloseTime('23:00');
        setSelectedProvinceCode('');
        setSelectedWardCode('');
        setWards([]);

        /**
         * Executes auto Fill From Profile operation.
         */
        const autoFillFromProfile = async () => {
          setIsLoadingProvinces(true);
          try {
            const [provinceList, profileRes] = await Promise.all([
              addressService.getProvinces(),
              userProfileService.fetchProfileFromApi(),
            ]);
            setProvinces(provinceList);

            if (profileRes.success && profileRes.data) {
              const profile = profileRes.data;

              if (profile.phone) {
                setVendorPhone(profile.phone);
              }

              if (profile.address && profile.address.trim()) {
                const matched = await matchAddressToHierarchy(profile.address, provinceList);

                if (matched.provinceCode) {
                  setSelectedProvinceCode(matched.provinceCode);
                  setWards(matched.wards);
                  setSelectedWardCode(matched.wardCode);
                }
                setStreetAddress(matched.street || '');
              }
            }
          } catch {
            try {
              const data = await addressService.getProvinces();
              setProvinces(data);
            } catch {
              toast.error('Không thể tải danh sách Tỉnh/Thành phố từ API.');
            }
          } finally {
            setIsLoadingProvinces(false);
          }
        };

        autoFillFromProfile();
        return;
      }
    }
  }, [isOpen, editingVendor, loadProvinces]);

  /**
   * Handles event processing for handleProvinceSelect.
   */
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

  /**
   * Handles event processing for handleWardSelect.
   */
  const handleWardSelect = (code: number) => {
    setSelectedWardCode(code);
  };

  if (!isOpen) return null;

  const provinceObj = provinces.find((p) => p.code === Number(selectedProvinceCode));
  const wardObj = wards.find((w) => w.code === Number(selectedWardCode));

  const addressParts = [
    streetAddress.trim(),
    wardObj?.name,
    provinceObj?.name,
  ].filter(Boolean);

  const fullAddress =
    addressParts.length > 0
      ? addressParts.join(', ')
      : editingVendor?.vendorAddress || streetAddress.trim();

  /**
   * Handles event processing for handleSubmit.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorName.trim()) {
      toast.error('Vui lòng nhập tên cơ sở / Cụm sân.');
      return;
    }
    if (!vendorPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên hệ Vendor.');
      return;
    }
    if (!fullAddress.trim()) {
      toast.error('Vui lòng chọn hoặc nhập đầy đủ địa chỉ cơ sở.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVendor) {
        const res = await vendorService.updateVendor(editingVendor.id, {
          vendorName: vendorName.trim(),
          vendorAddress: fullAddress.trim(),
          vendorPhone: vendorPhone.trim(),
          openTime,
          closeTime,
        });

        if (res.success) {
          toast.success('Cập nhật thông tin Cụm sân thành công!');
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Không thể cập nhật Cụm sân.');
        }
      } else {
        const res = await vendorService.registerVendor({
          vendorName: vendorName.trim(),
          vendorAddress: fullAddress.trim(),
          vendorPhone: vendorPhone.trim(),
          openTime,
          closeTime,
        });

        if (res.success) {
          toast.success('Gửi đơn đăng ký cụm sân thành công! Vui lòng chờ Admin phê duyệt.');
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || 'Đăng ký Cụm sân thất bại.');
        }
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base">
              {editingVendor ? 'Chỉnh Sửa Thông Tin Cụm Sân' : 'Đăng Ký Trở Thành Cụm Sân (Vendor)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#A3B1A8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 text-left overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Tên Cơ Sở / Cụm Sân <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                tabIndex={1}
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Ví dụ: Cụm Sân Thể Thao Sporting Center Đà Nẵng"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-sm text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E3932] mb-1">
                Số Điện Thoại Liên Hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                tabIndex={2}
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="Ví dụ: 0987654321"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-sm text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <TimePickerInput
                  label="Giờ Mở Cửa"
                  required
                  value={openTime}
                  onChange={(val) => setOpenTime(val)}
                  buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
                />
              </div>
              <div>
                <TimePickerInput
                  label="Giờ Đóng Cửa"
                  required
                  value={closeTime}
                  onChange={(val) => setCloseTime(val)}
                  buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1 border-t border-dashed border-[#E6E2D8]">
              <label className="block text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#006241]" />
                <span>Địa chỉ cơ sở (Chọn Tỉnh Thành / Phường Xã từ Hệ Thống)</span>
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
                  tabIndex={5}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Ví dụ: 24 Lê Trung Đình hoặc Số 102 Đường 3/2"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                />
              </div>

              {fullAddress && (
                <div className="p-3 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-[11px] text-[#1E3932] font-semibold">
                  <span className="text-[#6F7E72] font-mono">Địa chỉ đầy đủ sẽ lưu: </span>
                  <span className="text-[#006241] font-bold">{fullAddress}</span>
                </div>
              )}
            </div>

            {!editingVendor && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 font-semibold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Sau khi gửi đơn đăng ký, thông tin sẽ được duyệt trong vòng 24h. Chỉ Vendor có trạng thái <strong>Active</strong> mới được phép kinh doanh trên hệ thống.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E6E2D8] bg-[#FBF8F0] flex-shrink-0">
            <button
              type="button"
              tabIndex={6}
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] hover:bg-[#E6E2D8] font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              tabIndex={7}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : editingVendor ? (
                <Save className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{editingVendor ? 'Cập Nhật Cụm Sân' : 'Gửi Đăng Ký'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
