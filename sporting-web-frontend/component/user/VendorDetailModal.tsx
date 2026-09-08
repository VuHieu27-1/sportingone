import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Phone, Star, Shield, Clock, ArrowUpRight } from 'lucide-react';
import { VendorDisplayItem } from '../../services/vendorService';
import { formatTimeAMPM } from '../../utils/dateUtils';

interface VendorDetailModalProps {
  vendor: VendorDisplayItem | null;
  onClose: () => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor, onClose }) => {
  const navigate = useNavigate();
  if (!vendor) return null;

  const fallbackImg =
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80';

  /**
   * Handles event processing for handleBookNow.
   */
  const handleBookNow = () => {
    onClose();
    navigate(`/vendor/${vendor.id}`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết ${vendor.name}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-[#FBF8F0] rounded-[32px] overflow-hidden shadow-2xl z-10 border border-[#E6E2D8] flex flex-col max-h-[90vh]">
        <div className="relative h-48 sm:h-56 shrink-0 bg-[#F2F0EB]">
          <img
            src={vendor.avatar || vendor.imageUrl || fallbackImg}
            alt={vendor.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImg;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E3932]/90 via-[#1E3932]/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-[#FBF8F0]/80 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-[#1E3932] shadow-md transition-all cursor-pointer border border-[#E6E2D8]"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-[#006241] text-[#FBF8F0] font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm">
                {vendor.sportType || 'THỂ THAO'}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#FBF8F0] leading-tight">
                {vendor.name}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FBF8F0]/90 backdrop-blur-md border border-white/20 shadow-sm">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black text-[#1E3932]">
                {vendor.rating > 0 ? vendor.rating.toFixed(1) : (vendor.totalReviews === 0 ? '0.0' : '5.0')}
              </span>
              <span className="text-[10px] text-[#6F7E72] font-semibold">
                ({vendor.totalReviews !== undefined && vendor.totalReviews > 0 ? vendor.totalReviews : (vendor.totalReviews === 0 ? '0' : 'Mới')})
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-[#1E3932]">
          <div className="flex flex-wrap gap-2">
            {vendor.badgeTag && vendor.badgeTag !== 'Đã xác thực' && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#006241]/10 border border-[#006241]/20 text-[#006241] font-mono text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>{vendor.badgeTag.replace(/Cách 0(\.0+)? km/gi, 'Cách dưới 1 km')}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] font-mono text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-[#006241]" />
              <span>{formatTimeAMPM(vendor.openTime || '06:00')} - {formatTimeAMPM(vendor.closeTime || '23:00')}</span>
            </div>
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F2F0EB] border border-[#E6E2D8] text-[#1E3932] font-mono text-xs font-bold hover:bg-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#006241]" />
                <span>{vendor.phone}</span>
              </a>
            )}
          </div>

                    <div className="flex items-start gap-3 p-4 bg-[#F2F0EB] rounded-2xl border border-[#E6E2D8]">
            <MapPin className="w-4 h-4 text-[#006241] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block mb-0.5">
                ĐỊA CHỈ THƯƠNG HIỆU
              </span>
              <span className="text-xs font-bold text-[#1E3932] leading-relaxed block">
                {vendor.address}
              </span>
            </div>
          </div>

                    {vendor.facilities && vendor.facilities.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block">
                QUY MÔ HẠ TẦNG
              </span>
              <div className="flex flex-wrap gap-2">
                {vendor.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#006241]" />
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          )}

                    <div className="p-5 bg-white rounded-2xl border border-[#E6E2D8] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#6F7E72] uppercase tracking-wider block mb-1">
                KHỦNG GIÁ THAM KHẢO
              </span>
              <span className="text-lg font-extrabold text-[#006241]">
                {vendor.priceRange}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#6F7E72] bg-[#F2F0EB] px-3 py-1 rounded-full border border-[#E6E2D8]">
              Trực tiếp từ Vendor
            </span>
          </div>
        </div>

                <div className="p-5 border-t border-[#E6E2D8] bg-[#F2F0EB] shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-[#E6E2D8] bg-white hover:bg-[#F2F0EB] text-[#1E3932] font-mono text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
          >
            Đóng
          </button>
          <button
            onClick={handleBookNow}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider"
          >
            <span>Truy Cập Sân</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

