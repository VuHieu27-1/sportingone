import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Navigation, Loader2, Search, ChevronDown, Check } from 'lucide-react';
import { addressService, ProvinceItem, WardItem } from '../../services/addressService';
import { geolocationService } from '../../services/geolocationService';

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
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#6F7E72]/25 text-xs font-semibold text-[#1E3932] flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer text-left shadow-sm ${
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
        <div className="absolute top-full left-0 right-0 w-full mt-1.5 bg-white border border-[#6F7E72]/25 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6F7E72] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F2F0EB] text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-1 focus:ring-[#006241]"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
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
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
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

export interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress?: string;
  onLocationSaved: (newAddress: string, lat?: number, lng?: number) => void;
}

const cleanVietnamese = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/thành phố|tỉnh|quận|huyện|thị xã|phường|xã|thị trấn|tp\.|tp|đường/gi, '')
    .trim();
};

const cleanVietnameseRaw = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .replace(/thành phố|tỉnh|quận|huyện|thị xã|phường|xã|thị trấn|tp\.|tp|đường/gi, '')
    .trim();
};

export const EditLocationModal: React.FC<EditLocationModalProps> = ({
  isOpen,
  onClose,
  currentAddress = '',
  onLocationSaved,
}) => {
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [wards, setWards] = useState<WardItem[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>('');
  const [selectedWardCode, setSelectedWardCode] = useState<number | ''>('');
  const [streetAddress, setStreetAddress] = useState<string>('');

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedCoords, setCapturedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Load provinces on open and auto-parse currentAddress if available
  useEffect(() => {
    if (isOpen) {
      setCapturedCoords(null);
      setIsLoadingProvinces(true);
      addressService
        .getProvinces()
        .then(async (data) => {
          setProvinces(data);

          if (currentAddress && currentAddress.trim() !== '') {
            const fullAddr = currentAddress;
            const parts = fullAddr.split(',').map((p) => p.trim());
            if (parts.length > 0) {
              setStreetAddress(parts[0]);
            }

            // Match province
            const matchProv = data.find(
              (p) =>
                cleanVietnameseRaw(fullAddr).includes(cleanVietnameseRaw(p.name)) ||
                cleanVietnamese(fullAddr).includes(cleanVietnamese(p.name))
            );

            if (matchProv) {
              setSelectedProvinceCode(matchProv.code);
              setIsLoadingWards(true);
              const wrds = await addressService.getWards(matchProv.code);
              setWards(wrds);
              setIsLoadingWards(false);

              // Match ward
              let matchWrd = wrds.find(
                (w) =>
                  cleanVietnameseRaw(fullAddr).includes(cleanVietnameseRaw(w.name)) ||
                  cleanVietnamese(fullAddr).includes(cleanVietnamese(w.name))
              );

              if (!matchWrd && wrds.length > 0) {
                matchWrd = wrds.find((w) => {
                  const wClean = cleanVietnamese(w.name);
                  return wClean && cleanVietnamese(fullAddr).includes(wClean);
                });
              }

              if (matchWrd) {
                setSelectedWardCode(matchWrd.code);
              }
            }
          }
        })
        .finally(() => {
          setIsLoadingProvinces(false);
          setIsLoadingWards(false);
        });
    }
  }, [isOpen, currentAddress]);

  const handleProvinceSelect = useCallback(async (code: number) => {
    setCapturedCoords(null);
    setSelectedProvinceCode(code);
    setSelectedWardCode('');
    setWards([]);

    setIsLoadingWards(true);
    try {
      const data = await addressService.getWards(code);
      setWards(data);
    } finally {
      setIsLoadingWards(false);
    }
  }, []);

  const handleWardSelect = useCallback((code: number) => {
    setCapturedCoords(null);
    setSelectedWardCode(code);
  }, []);

  const handleFetchGpsLocation = async () => {
    setIsGpsLoading(true);
    try {
      const gpsData = await geolocationService.getDeviceLocation();
      if (gpsData) {
        setCapturedCoords({ lat: gpsData.lat, lng: gpsData.lng });

        const fullAddr = gpsData.fullAddress || '';
        const cityCandidate = gpsData.city || '';
        const wardCandidate = gpsData.ward || '';

        // Extract street address / house number
        if (gpsData.road) {
          setStreetAddress(gpsData.road);
        } else if (fullAddr) {
          const parts = fullAddr.split(',').map((p) => p.trim());
          if (parts.length > 0) {
            setStreetAddress(parts[0]);
          }
        }

        // Ensure province list is ready
        let provList = provinces;
        if (provList.length === 0) {
          provList = await addressService.getProvinces();
          setProvinces(provList);
        }

        // 1. Smart match Province / City
        const matchProv = provList.find(
          (p) =>
            (cityCandidate &&
              (cleanVietnameseRaw(cityCandidate).includes(cleanVietnameseRaw(p.name)) ||
                cleanVietnameseRaw(p.name).includes(cleanVietnameseRaw(cityCandidate)))) ||
            (fullAddr && cleanVietnameseRaw(fullAddr).includes(cleanVietnameseRaw(p.name))) ||
            (fullAddr && cleanVietnamese(fullAddr).includes(cleanVietnamese(p.name)))
        );

        if (matchProv) {
          setSelectedProvinceCode(matchProv.code);
          setIsLoadingWards(true);
          const wrds = await addressService.getWards(matchProv.code);
          setWards(wrds);
          setIsLoadingWards(false);

          // 2. Smart match Ward directly
          let matchWrd = wrds.find(
            (w) =>
              (wardCandidate &&
                (cleanVietnameseRaw(wardCandidate).includes(cleanVietnameseRaw(w.name)) ||
                  cleanVietnameseRaw(w.name).includes(cleanVietnameseRaw(wardCandidate)))) ||
              (fullAddr && cleanVietnameseRaw(fullAddr).includes(cleanVietnameseRaw(w.name))) ||
              (fullAddr && cleanVietnamese(fullAddr).includes(cleanVietnamese(w.name)))
          );

          if (!matchWrd && wrds.length > 0) {
            matchWrd = wrds.find((w) => {
              const wClean = cleanVietnamese(w.name);
              return wClean && cleanVietnamese(fullAddr).includes(wClean);
            });
          }

          if (matchWrd) {
            setSelectedWardCode(matchWrd.code);
          }
        }
      }
    } catch (err) {
      console.warn('[EditLocationModal] Lỗi định vị GPS:', err);
    } finally {
      setIsGpsLoading(false);
      setIsLoadingWards(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProv = provinces.find((p) => p.code === Number(selectedProvinceCode));
    const selectedWrd = wards.find((w) => w.code === Number(selectedWardCode));

    const parts: string[] = [];
    if (streetAddress.trim()) parts.push(streetAddress.trim());
    if (selectedWrd) parts.push(selectedWrd.name);
    if (selectedProv) parts.push(selectedProv.name);

    const fullAddress = parts.length > 0 ? parts.join(', ') : currentAddress;

    if (fullAddress) {
      setIsSubmitting(true);
      let finalLat = capturedCoords?.lat;
      let finalLng = capturedCoords?.lng;

      // If no GPS coords captured yet, geocode the full address
      if (finalLat === undefined || finalLng === undefined) {
        try {
          const geoRes = await addressService.geocode(fullAddress);
          if (geoRes && !isNaN(geoRes.lat) && !isNaN(geoRes.lng)) {
            finalLat = geoRes.lat;
            finalLng = geoRes.lng;
          }
        } catch (geoErr) {
          console.warn('[EditLocationModal] Geocoding fallback notice:', geoErr);
        }
      }

      try {
        localStorage.setItem('sporting_gps_full_address', fullAddress);
        if (selectedProv) {
          localStorage.setItem('sporting_user_selected_location', selectedProv.name);
        } else {
          localStorage.setItem('sporting_user_selected_location', fullAddress);
        }
        if (finalLat !== undefined && finalLng !== undefined) {
          localStorage.setItem('sporting_user_lat', String(finalLat));
          localStorage.setItem('sporting_user_lng', String(finalLng));
        }
      } catch {
        // Safe ignore
      }

      setIsSubmitting(false);
      onLocationSaved(fullAddress, finalLat, finalLng);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FBF8F0] border border-[#6F7E72]/20 w-full max-w-lg max-h-[90vh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 text-[#1E3932]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-[#1E3932] text-[#FBF8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006241] flex items-center justify-center text-[#FBF8F0]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Chỉnh Sửa Vị Trí Của Bạn</h3>
              <p className="text-[11px] text-[#FBF8F0]/70">Dữ liệu hành chính chuẩn 2 cấp sau sáp nhập 2025</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FBF8F0] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 text-left overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#1E3932] pb-1 border-b border-[#6F7E72]/15">
              <span className="text-[#6F7E72]">Địa chỉ hành chính</span>
              <button
                type="button"
                onClick={handleFetchGpsLocation}
                disabled={isGpsLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#006241]/10 hover:bg-[#006241] text-[#006241] hover:text-[#FBF8F0] border border-[#006241]/30 text-xs font-extrabold transition-all duration-200 cursor-pointer disabled:opacity-50"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                label="Phường / Xã"
                placeholder="-- Chọn Phường/Xã --"
                searchPlaceholder="Tìm Phường/Xã..."
                value={selectedWardCode}
                options={wards}
                onChange={handleWardSelect}
                disabled={!selectedProvinceCode}
                isLoading={isLoadingWards}
              />

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#6F7E72] mb-1">
                  Số nhà, Tên đường
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => {
                    setCapturedCoords(null);
                    setStreetAddress(e.target.value);
                  }}
                  placeholder="Ví dụ: 35 Hoàng Văn Thụ"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#6F7E72]/25 text-xs text-[#1E3932] font-semibold focus:outline-none focus:ring-2 focus:ring-[#006241] shadow-sm"
                />
              </div>
            </div>

            {/* Current Address Preview */}
            <div className="p-3 rounded-2xl bg-[#F2F0EB] border border-[#6F7E72]/15 text-xs space-y-1">
              <span className="text-[11px] font-bold text-[#6F7E72] block">Vị trí hiện tại:</span>
              <div className="font-semibold text-[#1E3932] truncate">
                {currentAddress || 'Chưa cập nhật'}
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="px-6 py-4 bg-[#FBF8F0] border-t border-[#6F7E72]/15 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-white border border-[#6F7E72]/20 text-[#1E3932] hover:bg-[#F2F0EB] font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-[#FBF8F0] font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Đang Lưu...' : 'Áp Dụng Vị Trí'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
