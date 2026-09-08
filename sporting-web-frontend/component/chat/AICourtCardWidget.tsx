import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, MapPin, Clock, ArrowUpRight } from 'lucide-react';
import { getSportImageUrl } from '../../utils/sportImageUtils';

export interface AICourtCardData {
  id: number;
  name: string;
  vendor: string;
  address: string;
  hours: string;
  price: string;
  sport?: string;
  image?: string;
}

export interface AICourtCardWidgetProps {
  court?: AICourtCardData;
  data?: AICourtCardData;
  onNavigateAction?: () => void;
  onBookClick?: (url: string) => void;
}

export const AICourtCardWidget: React.FC<AICourtCardWidgetProps> = ({
  court,
  data,
  onNavigateAction,
  onBookClick,
}) => {
  const navigate = useNavigate();
  const c = court || data;

  if (!c) return null;

  const sportName = c.sport || 'Thể thao';
  const displayImage = c.image || getSportImageUrl(sportName);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = `/yard/${c.id}?action=booking`;
    if (onBookClick) {
      onBookClick(targetUrl);
    } else {
      navigate(targetUrl);
      onNavigateAction?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="my-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group max-w-sm w-full"
    >
      {/* Top Banner Image Container */}
      <div className="relative h-36 w-full overflow-hidden bg-slate-800">
        <img
          src={displayImage}
          alt={c.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getSportImageUrl(sportName);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Sport Category Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider shadow-xs border border-white/10">
          <Tag className="w-3 h-3 text-lime-400" />
          <span>{sportName}</span>
        </div>

        {/* Court Name Overlay */}
        <div className="absolute bottom-2 left-3 right-3">
          <h4 className="text-base font-extrabold text-white tracking-tight drop-shadow-md line-clamp-1">
            {c.name}
          </h4>
        </div>
      </div>

      {/* Body Details */}
      <div className="p-3.5 space-y-2 text-xs">
        {/* Vendor */}
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            Vendor
          </span>
          <span className="font-semibold truncate">{c.vendor}</span>
        </div>

        {/* Address */}
        <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] leading-snug">
          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{c.address}</span>
        </div>

        {/* Hours */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Giờ mở cửa: {c.hours}</span>
        </div>

        {/* Bottom Price & Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Giá thuê sân</div>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {c.price}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Đặt sân ngay</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
