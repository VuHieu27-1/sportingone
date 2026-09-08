import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { BackendYardItem, BackendVendor } from '../../services/vendorService';
import { getSportImageUrl } from '../../utils/sportImageUtils';

interface YardVendorTabProps {
  yard: BackendYardItem;
  vendorName: string;
  vendorAddress: string;
  vendorPhone: string;
  openTime?: string;
  closeTime?: string;
  vendorYards: BackendYardItem[];
}

export const YardVendorTab: React.FC<YardVendorTabProps> = ({
  yard,
  vendorName,
  vendorAddress,
  vendorPhone,
  openTime = '06:00',
  closeTime = '23:00',
  vendorYards = [],
}) => {
  const navigate = useNavigate();
  const vendorId = yard.vendor?.id;

  const otherYards = vendorYards.filter((y) => Number(y.id) !== Number(yard.id));

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${vendorName} ${vendorAddress}`
  )}`;

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Vendor Complex Main Card */}
      <div className="bg-[#FBF8F0] p-6 sm:p-8 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E2D8]/60">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#006241] flex items-center justify-center text-white shadow-md border border-emerald-400/30 shrink-0">
              <Building2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[#006241] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3 text-[#006241]" />
                <span>CỤM SÂN XÁC THỰC</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3932]">
                {vendorName}
              </h3>
              <p className="text-xs text-[#6F7E72] mt-0.5">
                Cơ sở quản lý trực tiếp sân thi đấu này
              </p>
            </div>
          </div>

          {vendorId && (
            <button
              type="button"
              onClick={() => navigate(`/vendor/${vendorId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006241] hover:bg-emerald-700 text-white font-mono text-xs font-extrabold transition-all cursor-pointer shadow-md shrink-0 uppercase tracking-wider"
            >
              <span>Xem Toàn Bộ Cụm Sân</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-1">
            <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold">
              Địa Chỉ Cơ Sở
            </span>
            <div className="text-xs sm:text-sm font-extrabold text-[#1E3932] flex items-start gap-2 pt-1">
              <MapPin className="w-4 h-4 text-[#006241] shrink-0 mt-0.5" />
              <span>{vendorAddress || 'Chưa cập nhật địa chỉ'}</span>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006241] hover:underline pt-2"
            >
              <span>Xem trên Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-1">
            <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold">
              Hotline Đặt Sân / Hỗ Trợ
            </span>
            <div className="text-xs sm:text-sm font-extrabold text-[#1E3932] flex items-center gap-2 pt-1 font-mono">
              <Phone className="w-4 h-4 text-[#006241] shrink-0" />
              <span>{vendorPhone || 'Chưa cập nhật số điện thoại'}</span>
            </div>
            {vendorPhone && (
              <a
                href={`tel:${vendorPhone}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006241] hover:underline pt-2 font-mono"
              >
                <span>Gọi trực tiếp hotline</span>
              </a>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-1">
            <span className="text-[11px] font-mono text-[#6F7E72] uppercase font-bold">
              Giờ Mở - Đóng Cửa
            </span>
            <div className="text-xs sm:text-sm font-extrabold text-[#1E3932] flex items-center gap-2 pt-1 font-mono">
              <Clock className="w-4 h-4 text-[#006241] shrink-0" />
              <span>
                {openTime} - {closeTime}
              </span>
            </div>
            <span className="text-[11px] text-[#6F7E72] block pt-2">
              Hoạt động tất cả các ngày trong tuần (kể cả lễ)
            </span>
          </div>
        </div>
      </div>

      {/* Other Courts in Same Complex */}
      {otherYards.length > 0 && (
        <div className="bg-[#FBF8F0] p-6 sm:p-8 rounded-[28px] border border-[#E6E2D8] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
                <Layers className="w-3.5 h-3.5" />
                <span>CÙNG CƠ SỞ</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3932]">
                Các Sân Khác Thuộc Cụm Sân {vendorName}
              </h3>
            </div>
            <span className="text-xs font-bold text-[#6F7E72] font-mono">
              {otherYards.length} sân thi đấu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherYards.map((otherYard) => {
              const otherSport = otherYard.sportType?.sportName || 'Thể thao';
              const otherType = otherYard.typeYard?.typeName || 'Sân tiêu chuẩn';
              const otherPrice = otherYard.price
                ? `${Number(otherYard.price).toLocaleString('vi-VN')}đ/h`
                : 'Liên hệ';
              const coverImgObj = Array.isArray(otherYard.images)
                ? otherYard.images.find((img) => img.isCover) || otherYard.images[0]
                : null;
              const imgUrl =
                coverImgObj?.imageUrl ||
                (otherYard as any).imageUrl ||
                getSportImageUrl(otherSport);

              return (
                <div
                  key={otherYard.id}
                  onClick={() => navigate(`/yard/${otherYard.id}`)}
                  className="p-4 rounded-2xl bg-white border border-[#E6E2D8] hover:border-[#006241] transition-all cursor-pointer group flex items-center gap-3.5 shadow-2xs hover:shadow-md"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F2F0EB] shrink-0">
                    <img
                      src={imgUrl}
                      alt={otherYard.yardName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-[#006241] uppercase">
                        {otherSport} • {otherType}
                      </span>
                      {otherYard.status === 'maintenance' && (
                        <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                          Bảo Trì
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-[#1E3932] truncate group-hover:text-[#006241] transition-colors">
                      {otherYard.yardName}
                    </h4>
                    <span className="text-xs font-black text-[#006241] font-mono">
                      {otherPrice}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F2F0EB] group-hover:bg-[#006241] text-[#1E3932] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
