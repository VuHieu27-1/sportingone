import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, ChevronDown, Check, Zap } from 'lucide-react';
import { Button } from '../common/Button';
import { ASSETS } from '../../asset/constants';
import { timeService, TimeData } from '../../services/timeService';
import { addressService, ProvinceItem } from '../../services/addressService';
import { geolocationService } from '../../services/geolocationService';
import { vendorService } from '../../services/vendorService';

interface HeroSectionProps {
  onOpenBooking: (params?: { sport?: string; location?: string }) => void;
  onOpenRegister: () => void;
}

const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/thành phố|tỉnh|tp\.|tp/gi, '')
    .trim();
};

const findMatchingProvince = (gpsCity: string, provinceList: ProvinceItem[]): ProvinceItem | undefined => {
  if (!gpsCity || provinceList.length === 0) return undefined;
  const normGps = normalizeName(gpsCity);

  let match = provinceList.find((p) => p.name.toLowerCase() === gpsCity.toLowerCase());
  if (match) return match;
  match = provinceList.find((p) => normalizeName(p.name) === normGps);
  if (match) return match;

  match = provinceList.find(
    (p) =>
      normGps.includes(normalizeName(p.name)) ||
      normalizeName(p.name).includes(normGps),
  );
  return match;
};

const getSportIcon = (sName: string): string => {
  const lower = sName.toLowerCase();
  if (lower.includes('bóng đá') || lower.includes('football')) return '⚽';
  if (lower.includes('cầu lông') || lower.includes('badminton')) return '🏸';
  if (lower.includes('bóng bàn') || lower.includes('table tennis')) return '🏓';
  if (lower.includes('tennis')) return '🎾';
  if (lower.includes('pickleball')) return '🏓';
  if (lower.includes('bóng rổ') || lower.includes('basketball')) return '🏀';
  if (lower.includes('bóng chuyền') || lower.includes('volleyball')) return '🏐';
  return '⚡';
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenBooking,
}) => {
  const [sport, setSport] = useState('Bóng đá');
  const [sportsList, setSportsList] = useState<string[]>([
    'Bóng đá',
    'Cầu lông',
    'Bóng bàn',
    'Tennis',
    'Pickleball',
    'Bóng rổ',
  ]);
  const [location, setLocation] = useState<string>('');
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(true);
  const [serverTime, setServerTime] = useState<TimeData | null>(null);
  const [timeMode, setTimeMode] = useState<'today' | 'tomorrow' | 'weekend' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  const [provinceSearchTerm, setProvinceSearchTerm] = useState('');

  const sportContainerRef = useRef<HTMLDivElement>(null);
  const provinceContainerRef = useRef<HTMLDivElement>(null);
  const timeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /**
     * Handles event processing for handleClickOutside.
     */
    const handleClickOutside = (e: MouseEvent) => {
      if (sportContainerRef.current && !sportContainerRef.current.contains(e.target as Node)) {
        setIsSportDropdownOpen(false);
      }
      if (provinceContainerRef.current && !provinceContainerRef.current.contains(e.target as Node)) {
        setIsProvinceDropdownOpen(false);
      }
      if (timeContainerRef.current && !timeContainerRef.current.contains(e.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    vendorService
      .getSportTypes()
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const fetchedNames = res.data.map((s) => s.sportName).filter(Boolean);
          const unique = Array.from(
            new Set([...fetchedNames, 'Bóng đá', 'Cầu lông', 'Bóng bàn', 'Tennis', 'Pickleball', 'Bóng rổ'])
          );
          setSportsList(unique);
        }
      })
      .catch(() => { });

    timeService.getCurrentTime().then((data) => {
      if (isMounted) {
        setServerTime(data);
        setSelectedDate(data.date);
      }
    });

    /**
     * Executes init Location Data operation.
     */
    const initLocationData = async () => {
      setIsLoadingProvinces(true);
      try {
        const [fetchedProvinces, gpsData] = await Promise.all([
          addressService.getProvinces(),
          geolocationService.getDeviceLocation(),
        ]);

        if (!isMounted) return;

        if (fetchedProvinces && fetchedProvinces.length > 0) {
          setProvinces(fetchedProvinces);

          if (gpsData && gpsData.city) {
            const matched = findMatchingProvince(gpsData.city, fetchedProvinces);
            if (matched) {
              setLocation(matched.name);
            } else {
              setLocation(gpsData.city);
            }
          } else {
            const defaultMatch =
              fetchedProvinces.find((p) => p.name.includes('Hồ Chí Minh')) || fetchedProvinces[0];
            setLocation(defaultMatch ? defaultMatch.name : 'Thành phố Hồ Chí Minh');
          }
        }
      } catch (err) {
        console.warn('[HeroSection] Lỗi tải dữ liệu tỉnh thành hoặc GPS:', err);
        if (isMounted) {
          setLocation('Thành phố Hồ Chí Minh');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
        }
      }
    };

    initLocationData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProvinces = provinces.filter((prov) => {
    if (!provinceSearchTerm.trim()) return true;
    const normSearch = normalizeName(provinceSearchTerm);
    const normProv = normalizeName(prov.name);
    return normProv.includes(normSearch) || prov.name.toLowerCase().includes(provinceSearchTerm.toLowerCase());
  });

  const getTimeLabel = (): string => {
    if (timeMode === 'today') return `Hôm nay ${serverTime ? `(${serverTime.formattedDate})` : ''}`;
    if (timeMode === 'tomorrow') return 'Ngày mai';
    if (timeMode === 'weekend') return 'Cuối tuần này';
    if (timeMode === 'custom') return selectedDate ? `Ngày ${selectedDate}` : 'Ngày tùy chọn';
    return 'Hôm nay';
  };

  return (
    <section className="relative min-h-[600px] sm:min-h-[680px] w-full flex flex-col justify-between bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={ASSETS.STADIUM_HERO_BG}
          alt="Stadium Banner"
          className="w-full h-full object-cover object-center opacity-40 scale-105 transform animate-pulse duration-[10000ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#11241D] via-[#11241D]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#11241D]/90 via-transparent to-[#11241D]/90" />
      </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 flex-1 flex flex-col justify-center items-center text-center space-y-6 sm:space-y-8">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-xl animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          <span>[ SYSTEM OPERATIONAL: READY FOR MATCH ]</span>
        </div>

        <div className="space-y-4 max-w-4xl">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md flex flex-col items-center gap-2 sm:gap-3">
            <span className="block leading-tight">NỀN TẢNG KẾT NỐI &amp; ĐẶT SÂN</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#059669] pb-1.5 leading-tight block">
              THỂ THAO TOÀN DIỆN
            </span>
          </h1>
          <p className="text-xs sm:text-base lg:text-lg font-medium text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Đặt sân 30s • AI Camera Highlight HD • Tìm đối &amp; Ghép đội tự động • Tối ưu 100% công suất cho Chủ sân
          </p>
        </div>

                <div className="relative z-30 w-full max-w-4xl bg-[#FBF8F0] p-2.5 sm:p-4 rounded-[32px] sm:rounded-full shadow-2xl border border-white/30 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-3">
                        <div
              ref={sportContainerRef}
              className="relative w-full md:w-[28%]"
            >
              <div
                onClick={() => {
                  setIsSportDropdownOpen(!isSportDropdownOpen);
                  setIsProvinceDropdownOpen(false);
                  setIsTimeDropdownOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-[#F2F0EB] hover:bg-white hover:shadow-sm border border-[#6F7E72]/15 transition-all cursor-pointer select-none"
              >
                <span className="text-emerald-700 font-extrabold text-base shrink-0">
                  {getSportIcon(sport)}
                </span>
                <div className="text-left w-full min-w-0">
                  <label className="block text-[9px] sm:text-[10px] uppercase font-extrabold text-[#6F7E72] tracking-wider whitespace-nowrap cursor-pointer">
                    Môn thể thao
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs sm:text-sm text-[#1E3932] truncate block">
                      {sport}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6F7E72] transition-transform ${isSportDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

                            {isSportDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#E6E2D8] rounded-2xl shadow-2xl z-[100] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-left">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
                    Chọn môn thể thao
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                    {sportsList.map((sName) => {
                      const isSelected = sport === sName;
                      return (
                        <div
                          key={sName}
                          onClick={() => {
                            setSport(sName);
                            setIsSportDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                              ? 'bg-[#006241] text-white shadow-xs'
                              : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm">{getSportIcon(sName)}</span>
                            <span>{sName}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

                        <div
              ref={provinceContainerRef}
              className="relative w-full md:w-[28%]"
            >
              <div
                onClick={() => {
                  if (!isLoadingProvinces) {
                    setIsProvinceDropdownOpen(!isProvinceDropdownOpen);
                    setIsSportDropdownOpen(false);
                    setIsTimeDropdownOpen(false);
                  }
                }}
                className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-[#F2F0EB] hover:bg-white hover:shadow-sm border border-[#6F7E72]/15 transition-all cursor-pointer select-none"
              >
                <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-[#006241] flex-shrink-0" />
                <div className="text-left w-full min-w-0">
                  <label className="block text-[9px] sm:text-[10px] uppercase font-extrabold text-[#6F7E72] tracking-wider whitespace-nowrap cursor-pointer">
                    Khu vực
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs sm:text-sm text-[#1E3932] truncate block">
                      {isLoadingProvinces
                        ? 'Đang xác định GPS...'
                        : location || 'Chọn Tỉnh / Thành phố'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6F7E72] transition-transform ${isProvinceDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

                            {isProvinceDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white border border-[#E6E2D8] rounded-2xl shadow-2xl z-[100] p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150 text-left">
                                    <div className="relative">
                    <Search className="w-4 h-4 text-[#6F7E72] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      tabIndex={1}
                      value={provinceSearchTerm}
                      onChange={(e) => setProvinceSearchTerm(e.target.value)}
                      placeholder="Gõ để tìm nhanh Tỉnh/Thành phố..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-bold text-[#1E3932] placeholder-[#6F7E72] focus:outline-none focus:ring-2 focus:ring-[#006241]"
                    />
                    {provinceSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setProvinceSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6F7E72] hover:text-[#1E3932] font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredProvinces.length > 0 ? (
                      filteredProvinces.map((prov) => {
                        const isSelected = location === prov.name;
                        return (
                          <div
                            key={prov.code}
                            onClick={() => {
                              setLocation(prov.name);
                              try {
                                localStorage.setItem('sporting_user_selected_location', prov.name);
                              } catch (e) { }
                              setIsProvinceDropdownOpen(false);
                              setProvinceSearchTerm('');
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                                ? 'bg-[#006241] text-white shadow-xs'
                                : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                              }`}
                          >
                            <span className="truncate">{prov.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-[#6F7E72] font-bold">
                        Không tìm thấy Tỉnh/Thành phố "{provinceSearchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

                        <div
              ref={timeContainerRef}
              className="relative w-full md:w-[32%]"
            >
              <div
                onClick={() => {
                  setIsTimeDropdownOpen(!isTimeDropdownOpen);
                  setIsSportDropdownOpen(false);
                  setIsProvinceDropdownOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-[#F2F0EB] hover:bg-white hover:shadow-sm border border-[#6F7E72]/15 transition-all cursor-pointer select-none"
              >
                <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-[#006241] flex-shrink-0" />
                <div className="text-left w-full min-w-0">
                  <label className="block text-[9px] sm:text-[10px] uppercase font-extrabold text-[#6F7E72] tracking-wider whitespace-nowrap cursor-pointer">
                    Thời gian
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs sm:text-sm text-[#1E3932] truncate block">
                      {getTimeLabel()}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6F7E72] transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

                            {isTimeDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#E6E2D8] rounded-2xl shadow-2xl z-[100] p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150 text-left">
                  <div className="px-2 py-1 text-[10px] font-extrabold text-[#6F7E72] uppercase tracking-wider">
                    Chọn thời gian đặt sân
                  </div>

                  <div className="space-y-1">
                                        <div
                      onClick={() => {
                        setTimeMode('today');
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${timeMode === 'today'
                          ? 'bg-[#006241] text-white shadow-xs'
                          : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span>Hôm nay {serverTime ? `(${serverTime.formattedDate})` : ''}</span>
                      </div>
                      {timeMode === 'today' && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </div>

                                        <div
                      onClick={() => {
                        setTimeMode('tomorrow');
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${timeMode === 'tomorrow'
                          ? 'bg-[#006241] text-white shadow-xs'
                          : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🌅</span>
                        <span>Ngày mai</span>
                      </div>
                      {timeMode === 'tomorrow' && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </div>

                                        <div
                      onClick={() => {
                        setTimeMode('weekend');
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${timeMode === 'weekend'
                          ? 'bg-[#006241] text-white shadow-xs'
                          : 'text-[#1E3932] hover:bg-[#F2F0EB]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🏆</span>
                        <span>Cuối tuần này</span>
                      </div>
                      {timeMode === 'weekend' && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </div>

                                        <div className="pt-2 border-t border-[#E6E2D8] space-y-2">
                      <div className="text-[10px] font-bold text-[#6F7E72] px-1">
                        📅 Hoặc chọn ngày cụ thể:
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          tabIndex={1}
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setTimeMode('custom');
                          }}
                          className="flex-1 bg-[#F2F0EB] border border-[#E6E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1E3932] focus:outline-none focus:ring-2 focus:ring-[#006241] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTimeMode('custom');
                            setIsTimeDropdownOpen(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#006241] text-white font-bold text-xs hover:bg-[#006241]/90 transition-all cursor-pointer"
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

                        <div className="w-full md:w-[20%] flex-shrink-0">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  if (location) {
                    try {
                      localStorage.setItem('sporting_user_selected_location', location);
                    } catch (e) { }
                  }
                  onOpenBooking({ sport, location });
                }}
                className="w-full py-3.5 px-4 shadow-xl shadow-[#006241]/25 hover:scale-[1.02] whitespace-nowrap font-extrabold text-xs sm:text-sm tracking-wide justify-center"
              >
                <Search className="w-4 h-4 flex-shrink-0" />
                <span>TÌM SÂN NGAY</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs font-semibold text-[#FBF8F0]/80">
          <span className="flex items-center gap-1.5"><span className="text-[#3FB950]">✓</span> Đặt sân tức thì 30 giây</span>
          <span className="flex items-center gap-1.5"><span className="text-[#3FB950]">✓</span> Không mất phí giữ chỗ</span>
          <span className="flex items-center gap-1.5"><span className="text-[#3FB950]">✓</span> AI Video Highlight HD</span>
          <span className="flex items-center gap-1.5"><span className="text-[#3FB950]">✓</span> Hoàn tiền 100% nếu hủy sớm</span>
        </div>
      </div>
    </section>
  );
};
