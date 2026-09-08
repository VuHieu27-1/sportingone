import React, { useState, useMemo } from 'react';
import { Flame, Sparkles, Lightbulb, Clock, TrendingUp, Calendar, Layers, Ticket } from 'lucide-react';
import { HeatmapCell } from './types';

interface HotHoursHeatmapProps {
  matrix: HeatmapCell[];
  peakHourText: string;
  peakHourOccupancy: number;
  peakRevenue: number;
  lowDemandText: string;
  lowDemandOccupancy: number;
}

export const HotHoursHeatmap: React.FC<HotHoursHeatmapProps> = ({
  matrix,
  peakHourText,
  peakHourOccupancy,
  peakRevenue,
  lowDemandText,
  lowDemandOccupancy,
}) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [viewMode, setViewMode] = useState<'bookings' | 'occupancy'>('bookings');

  const DAYS = [
    { id: 1, name: 'Thứ 2' },
    { id: 2, name: 'Thứ 3' },
    { id: 3, name: 'Thứ 4' },
    { id: 4, name: 'Thứ 5' },
    { id: 5, name: 'Thứ 6' },
    { id: 6, name: 'Thứ 7' },
    { id: 7, name: 'Chủ Nhật' },
  ];

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 -> 22:00

  const maxBookings = useMemo(
    () => Math.max(...matrix.map((c) => c.bookingsCount), 1),
    [matrix]
  );

  const getCellColor = (cell: HeatmapCell) => {
    if (viewMode === 'bookings') {
      if (cell.bookingsCount === 0) return 'bg-[#F2F0EB] text-slate-400 hover:bg-[#E6E2D8]';
      const ratio = cell.bookingsCount / maxBookings;
      if (ratio <= 0.25) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      if (ratio <= 0.5) return 'bg-emerald-300 text-emerald-950 hover:bg-emerald-400';
      if (ratio <= 0.75) return 'bg-emerald-500 text-white hover:bg-emerald-600';
      return 'bg-[#006241] text-white hover:bg-[#004f34] shadow-xs';
    } else {
      const occ = cell.occupancyRate;
      if (occ === 0) return 'bg-[#F2F0EB] text-slate-400 hover:bg-[#E6E2D8]';
      if (occ <= 25) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      if (occ <= 50) return 'bg-emerald-300 text-emerald-950 hover:bg-emerald-400';
      if (occ <= 75) return 'bg-emerald-500 text-white hover:bg-emerald-600';
      return 'bg-[#006241] text-white hover:bg-[#004f34] shadow-xs';
    }
  };

  const getCell = (dayId: number, hour: number): HeatmapCell => {
    const found = matrix.find((c) => c.dayIndex === dayId && c.hour === hour);
    if (found) return found;
    return {
      dayIndex: dayId,
      dayName: DAYS.find((d) => d.id === dayId)?.name || '',
      hour,
      hourLabel: `${hour < 10 ? '0' : ''}${hour}:00`,
      occupancyRate: 0,
      bookingsCount: 0,
      revenue: 0,
      level: 'low',
    };
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#F2F0EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-600" />
            </span>
            <h3 className="text-base font-extrabold text-[#1E3932]">
              Khung Giờ Hot & Bản Đồ Nhiệt (Heatmap)
            </h3>
          </div>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Mật độ và số lượt đặt sân theo từng khung giờ trong tuần. Giúp tối ưu hóa lịch đặt và giá dynamic pricing.
          </p>
        </div>

        {/* View Mode Switcher + Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Mode Selector */}
          <div className="flex items-center p-1 rounded-xl bg-[#F2F0EB] border border-[#E6E2D8] text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('bookings')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'bookings'
                  ? 'bg-white text-[#006241] shadow-xs font-black'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Số Lượt Đặt</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('occupancy')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'occupancy'
                  ? 'bg-white text-[#006241] shadow-xs font-black'
                  : 'text-[#6F7E72] hover:text-[#1E3932]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>% Lấp Đầy</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
            <span className="text-[#6F7E72]">Trống:</span>
            <span className="w-4 h-4 rounded-md bg-[#F2F0EB] border border-[#E6E2D8]" title={viewMode === 'bookings' ? '0 đơn' : '0%'} />
            <span className="w-4 h-4 rounded-md bg-emerald-100" title={viewMode === 'bookings' ? '1-2 đơn' : '1-25%'} />
            <span className="w-4 h-4 rounded-md bg-emerald-300" title={viewMode === 'bookings' ? '3-5 đơn' : '26-50%'} />
            <span className="w-4 h-4 rounded-md bg-emerald-500" title={viewMode === 'bookings' ? '6-9 đơn' : '51-75%'} />
            <span className="w-4 h-4 rounded-md bg-[#006241]" title={viewMode === 'bookings' ? '10+ đơn' : '76-100%'} />
            <span className="text-[#006241] font-bold">Kín Sân 🔥</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto relative pb-2">
        <div className="min-w-[650px] space-y-1.5">
          {/* Header Row: Hours */}
          <div className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 text-center font-mono text-[10px] text-[#6F7E72] font-bold pb-1">
            <div className="text-left font-sans text-xs">Thứ / Giờ</div>
            {HOURS.map((h) => (
              <div key={h}>{h}h</div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day) => (
            <div
              key={day.id}
              className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 items-center"
            >
              <div className="text-xs font-bold text-[#1E3932] truncate">
                {day.name}
              </div>

              {HOURS.map((h) => {
                const cell = getCell(day.id, h);
                const isHovered =
                  hoveredCell?.dayIndex === cell.dayIndex &&
                  hoveredCell?.hour === cell.hour;

                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-7 rounded-md flex items-center justify-center font-mono text-[10px] font-extrabold cursor-pointer transition-colors duration-100 relative ${getCellColor(
                      cell
                    )} ${isHovered ? 'ring-2 ring-[#1E3932] z-10 brightness-110 shadow-sm' : ''}`}
                  >
                    {viewMode === 'bookings' ? (
                      cell.bookingsCount > 0 ? (
                        <span className="flex items-center justify-center gap-0.5">
                          {cell.bookingsCount >= maxBookings * 0.8 && cell.bookingsCount >= 3 ? (
                            <Flame className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                          ) : null}
                          <span>{cell.bookingsCount}</span>
                        </span>
                      ) : null
                    ) : (
                      cell.occupancyRate >= 75 ? (
                        <Flame className="w-3 h-3 text-amber-300" />
                      ) : cell.occupancyRate > 0 ? (
                        <span>{cell.occupancyRate.toFixed(0)}</span>
                      ) : null
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Permanent Stable Info Bar */}
        <div className="mt-3 min-h-[46px] p-3 rounded-2xl bg-[#1E3932] text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm transition-all">
          {hoveredCell ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 font-mono">
                  {hoveredCell.dayName} · {hoveredCell.hourLabel} - {hoveredCell.hour + 1}:00
                </span>
                <span className="text-white/60">|</span>
                <span>
                  Số lượt đặt:{' '}
                  <strong className="text-white font-mono font-bold">
                    {hoveredCell.bookingsCount} lượt
                  </strong>
                </span>
                <span className="text-white/60">|</span>
                <span>
                  Độ lấp đầy:{' '}
                  <strong className="text-amber-300 font-mono font-bold">
                    {hoveredCell.occupancyRate.toFixed(1)}%
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-4 text-white/80">
                <span>
                  Doanh thu:{' '}
                  <strong className="text-emerald-300 font-mono">
                    {hoveredCell.revenue.toLocaleString('vi-VN')}đ
                  </strong>
                </span>
                {hoveredCell.occupancyRate >= 70 || (maxBookings > 0 && hoveredCell.bookingsCount >= maxBookings * 0.8) ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold">
                    🔥 KHUNG GIỜ CAO ĐIỂM
                  </span>
                ) : hoveredCell.bookingsCount === 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 text-[10px] font-bold">
                    🔵 KHUNG GIỜ TRỐNG
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    🟢 ỔN ĐỊNH
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-white/70 text-xs">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Di chuột vào bất kỳ ô giờ nào ở bảng trên để xem chi tiết số lượt đặt, doanh thu và độ lấp đầy.</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400/80 font-semibold">
                ✦ Bản đồ nhiệt 7 ngày × 17 khung giờ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Actionable Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F2F0EB]">
        {/* Peak Hours Card */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                🔥 Khung Giờ Cao Điểm ({peakHourText})
              </h4>
            </div>
            <span className="font-mono text-xs font-extrabold text-amber-900 bg-white/70 px-2 py-0.5 rounded-full">
              {peakHourOccupancy.toFixed(1)}% Lấp đầy
            </span>
          </div>
          <p className="text-xs text-amber-950 font-medium">
            Nhu cầu khách đặt sân cực lớn vào khung giờ này (Doanh thu ghi nhận:{' '}
            <strong className="font-mono">{peakRevenue.toLocaleString('vi-VN')}đ</strong>).
          </p>
          <div className="text-[11px] text-amber-900 font-bold bg-white/80 p-2 rounded-xl flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Đề xuất: Cân nhắc áp dụng bảng giá giờ vàng (+5% đến 10%) để tối ưu lợi nhuận.</span>
          </div>
        </div>

        {/* Low Demand Card */}
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-sky-950">
                💡 Cơ Hội Tăng Doanh Thu ({lowDemandText})
              </h4>
            </div>
            <span className="font-mono text-xs font-extrabold text-sky-900 bg-white/70 px-2 py-0.5 rounded-full">
              {lowDemandOccupancy.toFixed(1)}% Lấp đầy
            </span>
          </div>
          <p className="text-xs text-sky-950 font-medium">
            Tỷ lệ lấp đầy sân còn thấp. Đang có nhiều khung giờ trống trong ngày chưa được khai thác.
          </p>
          <div className="text-[11px] text-sky-900 font-bold bg-white/80 p-2 rounded-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Đề xuất: Triển khai gói &quot;Early Bird&quot; giảm 15-20% hoặc combo đặt sân cố định.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
