import React from 'react';
import { Layers, ArrowUpRight, ArrowDownRight, Check, Trophy } from 'lucide-react';
import { SportRevenueItem } from './types';

interface SportRevenueBreakdownProps {
  sports: SportRevenueItem[];
  selectedSportId: string;
  onSelectSport: (sportId: string) => void;
  totalRevenue: number;
}

export const SportRevenueBreakdown: React.FC<SportRevenueBreakdownProps> = ({
  sports,
  selectedSportId,
  onSelectSport,
  totalRevenue,
}) => {
  return (
    <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F2F0EB]">
          <div>
            <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#006241]" />
              <span>Doanh Thu Theo Bộ Môn</span>
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
              Phân bổ cơ cấu đóng góp doanh thu theo từng môn thể thao.
            </p>
          </div>

          {selectedSportId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectSport('all')}
              className="text-xs font-bold text-[#006241] hover:underline cursor-pointer"
            >
              Bỏ lọc bộ môn
            </button>
          )}
        </div>

        {/* List of sports horizontal bars */}
        <div className="space-y-4 pt-3">
          {sports.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6F7E72]">
              Chưa có dữ liệu doanh thu bộ môn trong khoảng thời gian này.
            </div>
          ) : (
            sports.map((item, idx) => {
              const isSelected = String(selectedSportId) === String(item.id);
              const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : item.percentage;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSport(isSelected ? 'all' : String(item.id))}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 border-[#006241] shadow-sm'
                      : 'bg-[#FBF8F0]/60 border-[#E6E2D8]/60 hover:bg-[#F2F0EB]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-[#1E3932]">
                        {item.name}
                      </span>
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-bold">
                          <Trophy className="w-2.5 h-2.5" /> Top 1
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#1E3932]">
                        {item.revenue.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="font-mono font-extrabold text-[#006241] text-[11px]">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#E6E2D8]/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, 2)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>

                  {/* Sub metrics */}
                  <div className="flex items-center justify-between text-[11px] text-[#6F7E72] mt-2 pt-1 border-t border-[#E6E2D8]/40">
                    <span>
                      {item.ordersCount} đơn · {item.bookedHours.toFixed(1)}h đặt
                    </span>
                    <span>
                      Độ lấp đầy: <strong className="text-[#1E3932]">{item.occupancyRate.toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="text-[11px] text-[#6F7E72] font-mono pt-3 border-t border-[#F2F0EB] text-center">
        ✦ Bấm vào từng bộ môn để lọc toàn bộ bảng phân tích
      </div>
    </div>
  );
};
