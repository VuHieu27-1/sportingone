import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit2,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Save,
  X,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  Loader2,
  Navigation,
  Plus,
  Trash2,
  Star,
  AlertCircle,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import toast from 'react-hot-toast';
import { UserProfileDetails, UserAddress, userProfileService, accountAvatarCache } from '../../services/userProfileService';
import { userAddressService } from '../../services/userAddressService';
import { addressService, ProvinceItem, WardItem } from '../../services/addressService';
import { geolocationService } from '../../services/geolocationService';

interface ProfileInfoTabProps {
  profile: UserProfileDetails | null;
  onProfileUpdated: () => void;
  onAvatarClick?: () => void;
}

interface SelectOption {
  code: number;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  value: number | '';
  options: SelectOption[];
  onChange: (code: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onChange,
  disabled = false,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-bold text-[#6F7E72] mb-1">{label}</label>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(!isOpen)}
        title={selectedOption ? selectedOption.name : placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs font-semibold text-[#1E3932] flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer text-left shadow-sm ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-[#006241]'
        }`}
      >
        <span className="truncate pr-1">
          {isLoading ? 'Đang tải...' : selectedOption ? selectedOption.name : placeholder}
        </span>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-[#006241] animate-spin shrink-0 ml-1" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#6F7E72] shrink-0 ml-1 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 w-full mt-1.5 bg-white border border-[#E6E2D8] rounded-xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
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

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.code === Number(value);
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      onChange(opt.code);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#006241] text-[#FBF8F0]'
                        : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-center text-xs text-[#6F7E72]">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MatchedAddressResult {
  provinceCode: number | '';
  wardCode: number | '';
  street: string;
  wards: WardItem[];
}

const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const cleanAdministrativeName = (name: string) => {
  const norm = normalizeString(name);
  return norm
    .replace(/^(tinh|thanh pho|tp|phuong|xa|thi tran|tt)\s+/g, '')
    .trim();
};

async function matchAddressHierarchy(
  rawAddress: string,
  provinceList: ProvinceItem[]
): Promise<MatchedAddressResult> {
  const defaultResult: MatchedAddressResult = {
    provinceCode: '',
    wardCode: '',
    street: rawAddress,
    wards: [],
  };

  if (!rawAddress || !rawAddress.trim()) {
    return defaultResult;
  }

  const parts = rawAddress
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return defaultResult;

  const cleanParts = parts.filter((p) => {
    const n = normalizeString(p);
    return n !== 'viet nam' && n !== 'vietnam' && !/^\d{4,6}$/.test(n);
  });

  if (cleanParts.length === 0) return defaultResult;

  const indexedParts = cleanParts.map((p) => ({
    text: p,
    normClean: cleanAdministrativeName(p),
    normRaw: normalizeString(p),
    used: false,
  }));

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

export const ProfileInfoTab: React.FC<ProfileInfoTabProps> = ({
  profile,
  onProfileUpdated,
  onAvatarClick,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    gender: profile?.gender || 'Nam',
    dateOfBirth: profile?.dateOfBirth || '',
  });

  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
  }>({});

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>('');
  const [selectedWardCode, setSelectedWardCode] = useState<number | ''>('');
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(false);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const addresses: UserAddress[] = profile?.addresses || [];

  const handleFetchGpsLocation = async () => {
    setIsGpsLoading(true);
    try {
      const gpsData = await geolocationService.getDeviceLocation();
      if (!gpsData || (!gpsData.fullAddress && !gpsData.city)) {
        toast.error('Không thể lấy vị trí GPS hiện tại.');
        return;
      }

      let provinceList = provinces;
      if (provinceList.length === 0) {
        setIsLoadingProvinces(true);
        provinceList = await addressService.getProvinces();
        setProvinces(provinceList);
        setIsLoadingProvinces(false);
      }

      const addressToMatch =
        gpsData.fullAddress ||
        [gpsData.road, gpsData.ward, gpsData.city].filter(Boolean).join(', ');

      const matched = await matchAddressHierarchy(addressToMatch, provinceList);

      if (matched.provinceCode) {
        setSelectedProvinceCode(matched.provinceCode);
        setWards(matched.wards);
        setSelectedWardCode(matched.wardCode);

        const finalStreet = gpsData.road || matched.street || '';
        setStreetAddress(finalStreet);
      } else {
        setStreetAddress(gpsData.fullAddress || addressToMatch);
      }

      toast.success('Đã tự động điền vị trí từ GPS!');
    } catch (err) {
      console.error('[ProfileInfoTab] Lỗi GPS:', err);
      toast.error('Lỗi khi định vị GPS thiết bị.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  const handleOpenAddAddressModal = async () => {
    setEditingAddressId(null);
    setStreetAddress('');
    setSelectedProvinceCode('');
    setSelectedWardCode('');
    setWards([]);
    setIsDefaultCheckbox(addresses.length === 0);
    setIsAddressModalOpen(true);
    setIsLoadingProvinces(true);

    try {
      const provinceList = await addressService.getProvinces();
      setProvinces(provinceList);
    } catch {
      toast.error('Không thể tải dữ liệu địa chính.');
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const handleOpenEditAddressModal = async (addr: UserAddress) => {
    setEditingAddressId(addr.id);
    setIsDefaultCheckbox(addr.isDefault);
    setIsAddressModalOpen(true);
    setIsLoadingProvinces(true);

    try {
      const provinceList = await addressService.getProvinces();
      setProvinces(provinceList);

      const matched = await matchAddressHierarchy(addr.address || '', provinceList);

      setSelectedProvinceCode(matched.provinceCode);
      setWards(matched.wards);
      setSelectedWardCode(matched.wardCode);
      setStreetAddress(matched.street);
    } catch {
      toast.error('Không thể tải dữ liệu địa chính.');
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const handleProvinceSelect = async (code: number) => {
    setSelectedProvinceCode(code);
    setSelectedWardCode('');
    setWards([]);

    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(code);
      setWards(data);
    } catch {
      toast.error('Không thể tải danh sách Xã/Phường.');
    } finally {
      setIsLoadingWards(false);
    }
  };

  const handleWardSelect = (code: number) => {
    setSelectedWardCode(code);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    const provinceObj = provinces.find((p) => p.code === Number(selectedProvinceCode));
    const wardObj = wards.find((w) => w.code === Number(selectedWardCode));

    const addressParts = [
      streetAddress.trim(),
      wardObj?.name,
      provinceObj?.name,
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    if (!fullAddress || fullAddress.trim() === '') {
      toast.error('Vui lòng nhập hoặc chọn địa chỉ hợp lệ.');
      return;
    }

    setIsSavingAddress(true);
    try {
      if (editingAddressId) {
        const res = await userAddressService.updateAddress(editingAddressId, {
          address: fullAddress,
          isDefault: isDefaultCheckbox,
        });
        if (res.success) {
          toast.success('Cập nhật địa chỉ thành công!');
          setIsAddressModalOpen(false);
          onProfileUpdated();
        } else {
          toast.error(res.message || 'Cập nhật địa chỉ thất bại.');
        }
      } else {
        const res = await userAddressService.createAddress({
          address: fullAddress,
          isDefault: isDefaultCheckbox,
        });
        if (res.success) {
          toast.success('Thêm địa chỉ mới thành công!');
          setIsAddressModalOpen(false);
          onProfileUpdated();
        } else {
          toast.error(res.message || 'Thêm địa chỉ thất bại.');
        }
      }
    } catch {
      toast.error('Lỗi khi lưu địa chỉ.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      const res = await userAddressService.setDefaultAddress(id);
      if (res.success) {
        toast.success('Đã đặt làm địa chỉ mặc định!');
        onProfileUpdated();
      } else {
        toast.error(res.message || 'Không thể đặt địa chỉ mặc định.');
      }
    } catch {
      toast.error('Lỗi thiết lập địa chỉ mặc định.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    try {
      const res = await userAddressService.deleteAddress(id);
      if (res.success) {
        toast.success('Đã xóa địa chỉ thành công!');
        onProfileUpdated();
      } else {
        toast.error(res.message || 'Không thể xóa địa chỉ.');
      }
    } catch {
      toast.error('Lỗi khi xóa địa chỉ.');
    }
  };

  const handleEditProfileClick = () => {
    setFormData({
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
      gender: profile?.gender || 'Nam',
      dateOfBirth: profile?.dateOfBirth || '',
    });
    setProfileErrors({});
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { fullName?: string; phone?: string; dateOfBirth?: string } = {};

    const cleanFullName = (formData.fullName || '').trim();
    if (!cleanFullName) {
      newErrors.fullName = 'Họ và tên không được để trống!';
    } else if (cleanFullName.length < 2) {
      newErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự!';
    }

    const cleanPhone = (formData.phone || '').trim();
    if (!cleanPhone) {
      newErrors.phone = 'Số điện thoại không được để trống!';
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      newErrors.phone = 'Số điện thoại phải bao gồm đúng 10 chữ số (VD: 0912345678)!';
    }

    const currentYear = new Date().getFullYear();
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Vui lòng chọn ngày sinh!';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const birthYear = birthDate.getFullYear();
      const today = new Date();

      if (isNaN(birthYear) || birthDate > today || birthYear >= currentYear || birthYear < 1920) {
        newErrors.dateOfBirth = `Năm sinh không hợp lệ (phải từ năm 1920 đến ${currentYear - 1})!`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setProfileErrors(newErrors);
      const firstErrorMessage = Object.values(newErrors)[0];
      toast.error(firstErrorMessage);
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      const res = await userProfileService.saveProfile({
        fullName: cleanFullName,
        phone: cleanPhone,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
      });

      if (res.success) {
        toast.success('Cập nhật thông tin cá nhân thành công!');
        setIsEditingProfile(false);
        onProfileUpdated();
      } else {
        const errorMsg = res.message || 'Cập nhật thất bại.';
        toast.error(errorMsg);
        if (errorMsg.toLowerCase().includes('số điện thoại') || errorMsg.toLowerCase().includes('phone')) {
          setProfileErrors((prev) => ({ ...prev, phone: errorMsg }));
        } else if (errorMsg.toLowerCase().includes('sinh') || errorMsg.toLowerCase().includes('birthday')) {
          setProfileErrors((prev) => ({ ...prev, dateOfBirth: errorMsg }));
        }
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi lưu thông tin.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Banner Top */}
      {(() => {
        const bannerAvatar =
          profile?.avatar ||
          accountAvatarCache.getAvatar(profile?.username || '') ||
          accountAvatarCache.getAvatar(profile?.fullName || '');
        return (
          <div className="p-5 sm:p-8 rounded-[28px] bg-gradient-to-br from-[#1E3932] to-[#142622] text-[#FBF8F0] border border-[#006241]/30 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#006241]/20 rounded-full filter blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 relative z-10">
              <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto min-w-0 flex-1">
                {bannerAvatar ? (
                  <img
                    src={bannerAvatar}
                    alt={profile?.username || 'Avatar'}
                    onClick={onAvatarClick}
                    title="Bấm để xem ảnh phóng to toàn màn hình"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-[#FBF8F0]/20 shadow-lg shrink-0 cursor-pointer hover:scale-105 hover:border-emerald-400/50 transition-all"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#006241] border-4 border-[#FBF8F0]/20 flex items-center justify-center text-2xl sm:text-3xl font-black text-[#FBF8F0] shadow-lg shrink-0">
                    {(profile?.username || profile?.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg sm:text-2xl font-extrabold text-[#FBF8F0] truncate">
                      {profile?.username || profile?.fullName || 'Người Dùng'}
                    </h2>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 fill-emerald-400/20 shrink-0" />
                  </div>
                  <p className="text-xs text-[#A3B1A8] font-medium mt-0.5 truncate">
                    Tài khoản Thành viên Chính thức
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2.5">
                    {profile?.email && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] sm:text-xs text-[#FBF8F0] font-semibold max-w-full min-w-0">
                        <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{profile.email}</span>
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] sm:text-xs text-[#FBF8F0] font-semibold shrink-0">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleEditProfileClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-bold text-xs shadow-lg transition-all cursor-pointer border border-white/20 shrink-0"
              >
                <Edit2 className="w-4 h-4" />
                <span>Chỉnh Sửa Hồ Sơ</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Detailed Personal Information */}
      <div className="p-5 sm:p-7 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F2F0EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241]">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-[#1E3932] text-base">Thông Tin Cá Nhân Chi Tiết</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <span className="block text-[11px] font-semibold text-[#6F7E72] uppercase tracking-wider">Họ và tên</span>
            <span className="text-sm font-bold text-[#1E3932] mt-0.5 block break-words">{profile?.fullName || 'Chưa cập nhật'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[#6F7E72] uppercase tracking-wider">Email liên hệ</span>
            <span className="text-sm font-bold text-[#1E3932] mt-0.5 block break-all">{profile?.email || 'Chưa cập nhật'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[#6F7E72] uppercase tracking-wider">Số điện thoại</span>
            <span className="text-sm font-bold text-[#1E3932] font-mono mt-0.5 block">{profile?.phone || 'Chưa cập nhật'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[#6F7E72] uppercase tracking-wider">Giới tính</span>
            <span className="text-sm font-bold text-[#1E3932] mt-0.5 block">{profile?.gender || 'Chưa cập nhật'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[#6F7E72] uppercase tracking-wider">Ngày sinh</span>
            <span className="text-sm font-bold text-[#1E3932] mt-0.5 block">
              {profile?.dateOfBirth && !profile.dateOfBirth.startsWith('1899') && !profile.dateOfBirth.startsWith('0000')
                ? profile.dateOfBirth
                : 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Address Book (user_address entity) */}
      <div className="p-4 sm:p-7 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md hover:shadow-lg transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#F2F0EB]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#006241]/10 flex items-center justify-center text-[#006241] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-[#1E3932] text-sm sm:text-base truncate">Danh Sách Địa Chỉ Người Dùng</h3>
              <p className="text-xs text-[#6F7E72] font-medium truncate">
                Quản lý địa chỉ giao hàng / thi đấu ({addresses.length} địa chỉ)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddAddressModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm Địa Chỉ Mới</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="p-6 sm:p-8 text-center bg-[#F2F0EB]/50 rounded-2xl border border-dashed border-[#E6E2D8] space-y-2">
            <MapPin className="w-8 h-8 text-[#006241] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[#1E3932]">Bạn chưa có địa chỉ nào trong sổ địa chỉ.</p>
            <p className="text-[11px] text-[#6F7E72]">Nhấp vào "Thêm Địa Chỉ Mới" để tạo hoặc chọn tự động từ vị trí GPS.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                  addr.isDefault
                    ? 'bg-[#006241]/5 border-[#006241]/30 ring-1 ring-[#006241]/20'
                    : 'bg-[#F2F0EB]/60 border-[#E6E2D8] hover:border-[#006241]/30'
                }`}
              >
                <div className="space-y-1.5 min-w-0 w-full flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-[#006241] shrink-0 mt-0.5" />
                      <span className="text-xs font-extrabold text-[#1E3932] break-words break-all sm:break-normal min-w-0">
                        {addr.address}
                      </span>
                    </div>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#006241] text-white text-[10px] font-bold shrink-0">
                        <Star className="w-3 h-3 fill-white" />
                        Mặc định
                      </span>
                    )}
                  </div>
                  {addr.latitude && addr.longitude && (
                    <div className="text-[10px] text-[#6F7E72] font-mono pl-6 break-all">
                      Tọa độ GPS: {Number(addr.latitude).toFixed(6)}, {Number(addr.longitude).toFixed(6)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-[#E6E2D8]/60">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-[#006241]/10 border border-[#006241]/20 text-[#006241] text-xs font-bold transition-all cursor-pointer"
                    >
                      Đặt mặc định
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditAddressModal(addr)}
                    className="p-2 rounded-full bg-white hover:bg-gray-100 border border-[#E6E2D8] text-[#1E3932] text-xs font-bold transition-all cursor-pointer"
                    title="Chỉnh sửa địa chỉ"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-2 rounded-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold transition-all cursor-pointer"
                    title="Xóa địa chỉ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Personal Information Modal */}
      {isEditingProfile && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-xl rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Cập Nhật Thông Tin Cá Nhân</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-[#A3B1A8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-left max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Họ và tên đầy đủ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (profileErrors.fullName) setProfileErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-[#1E3932] font-semibold focus:outline-none transition-all ${
                    profileErrors.fullName
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                      : 'border-[#E6E2D8] focus:ring-2 focus:ring-[#006241]'
                  }`}
                />
                {profileErrors.fullName && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.fullName}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (profileErrors.phone) setProfileErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="0912345678"
                    className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-[#1E3932] font-semibold focus:outline-none transition-all ${
                      profileErrors.phone
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                        : 'border-[#E6E2D8] focus:ring-2 focus:ring-[#006241]'
                    }`}
                  />
                  {profileErrors.phone && (
                    <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{profileErrors.phone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3932] mb-1">Giới tính</label>
                  <CustomSelect
                    options={[
                      { value: 'Nam', label: 'Nam' },
                      { value: 'Nữ', label: 'Nữ' },
                      { value: 'Khác', label: 'Khác' },
                    ]}
                    value={formData.gender}
                    onChange={(val) => setFormData({ ...formData, gender: String(val) })}
                    buttonClassName="w-full bg-white border-[#E6E2D8] py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3932] mb-1">
                  Ngày sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min="1920-01-01"
                  max={`${new Date().getFullYear() - 1}-12-31`}
                  value={formData.dateOfBirth}
                  onChange={(e) => {
                    setFormData({ ...formData, dateOfBirth: e.target.value });
                    if (profileErrors.dateOfBirth) setProfileErrors((p) => ({ ...p, dateOfBirth: undefined }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-[#1E3932] font-semibold focus:outline-none transition-all ${
                    profileErrors.dateOfBirth
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
                      : 'border-[#E6E2D8] focus:ring-2 focus:ring-[#006241]'
                  }`}
                />
                {profileErrors.dateOfBirth && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{profileErrors.dateOfBirth}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] hover:bg-[#E6E2D8] font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit New Address Modal */}
      {isAddressModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBF8F0] border border-[#E6E2D8] w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">
                  {editingAddressId ? 'Chỉnh Sửa Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="text-[#A3B1A8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4 text-left max-h-[85vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold text-[#1E3932]">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-[#006241] shrink-0" />
                  <span className="truncate">Chọn Địa Chỉ Hành Chính (Tỉnh / Phường)</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchGpsLocation}
                  disabled={isGpsLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#006241]/10 hover:bg-[#006241] text-[#006241] hover:text-white border border-[#006241]/30 text-xs font-extrabold transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0"
                  title="Tự động lấy vị trí hiện tại qua GPS"
                >
                  {isGpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span>{isGpsLoading ? 'Đang định vị...' : 'Vị trí hiện tại (GPS)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelect
                  label="Tỉnh / Thành phố"
                  placeholder="-- Chọn Tỉnh/TP --"
                  searchPlaceholder="Tìm Tỉnh/TP..."
                  value={selectedProvinceCode}
                  options={provinces}
                  onChange={handleProvinceSelect}
                  isLoading={isLoadingProvinces}
                />

                <SearchableSelect
                  label="Xã / Phường"
                  placeholder="-- Chọn Xã/Phường --"
                  searchPlaceholder="Tìm Xã/Phường..."
                  value={selectedWardCode}
                  options={wards}
                  onChange={handleWardSelect}
                  disabled={!selectedProvinceCode}
                  isLoading={isLoadingWards}
                />

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6F7E72] mb-1">Số nhà, Tên đường</label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Ví dụ: Số 123, Đường Hùng Vương"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E6E2D8] text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefaultCheckbox}
                  onChange={(e) => setIsDefaultCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded text-[#006241] focus:ring-[#006241] cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-xs font-bold text-[#1E3932] cursor-pointer">
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E2D8]">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F2F0EB] text-[#1E3932] hover:bg-[#E6E2D8] font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingAddress ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingAddressId ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ'}</span>
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
