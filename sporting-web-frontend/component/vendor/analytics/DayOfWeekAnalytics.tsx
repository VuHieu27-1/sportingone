import React from 'react';
import { Calendar, Clock, Sun, Sunset, Moon, Sparkles, Trophy } from 'lucide-react';
import { DayOfWeekStat, TimeOfDayStat } from './types';

interface DayOfWeekAnalyticsProps {
  dayStats: DayOfWeekStat[];
  timeOfDayStats: TimeOfDayStat[];
}

export const DayOfWeekAnalytics: React.FC<DayOfWeekAnalyticsProps> = ({
  dayStats,
  timeOfDayStats,
}) => {
  const maxDayRev = Math.max(...dayStats.map((d) => d.revenue), 100000);
  const peakDay = dayStats.find((d) => d.isPeakDay) || dayStats[0];
  const totalRev = dayStats.reduce((acc, curr) => acc + curr.revenue, 0);
  const avgDayRev = totalRev / Math.max(dayStats.length, 1);

  const getSlotIcon = (key: string) => {
    switch (key) {
      case 'morning':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'afternoon':
        return <Sun className="w-4 h-4 text-orange-500" />;
      case 'evening':
        return <Sunset className="w-4 h-4 text-purple-600" />;
      case 'night':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-[#006241]" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Box 1: Day of week breakdown */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
          <div>
            <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#006241]" />
              <span>Doanh Thu Theo Ngày Trong Tuần</span>
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
              Phát hiện ngày cao điểm có sức hút và doanh thu tốt nhất.
            </p>
          </div>

          {peakDay && peakDay.revenue > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-extrabold">
              <Trophy className="w-3 h-3 text-amber-600" />
              Cao nhất: {peakDay.dayName}
            </span>
          )}
        </div>

        {/* Day Bars */}
        <div className="space-y-2.5 pt-1">
          {dayStats.map((d) => {
            const pct = maxDayRev > 0 ? (d.revenue / maxDayRev) * 100 : 0;
            return (
              <div key={d.dayName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${d.isPeakDay && d.revenue > 0 ? 'text-[#006241]' : 'text-[#1E3932]'}`}>
                    {d.dayName}
                    {d.isPeakDay && d.revenue > 0 && (
                      <span className="text-[10px] text-amber-600 ml-1.5 font-extrabold">★ Peak</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#6F7E72] text-[11px]">{d.ordersCount} đơn</span>
                    <strong className="text-[#1E3932]">{d.revenue.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>

                <div className="w-full bg-[#F2F0EB] h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.isPeakDay && d.revenue > 0
                        ? 'bg-[#006241]'
                        : d.revenue > 0
                        ? 'bg-emerald-600/80'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between text-xs text-[#6F7E72] pt-3 border-t border-[#F2F0EB]">
          <span>
            Doanh thu TB / ngày:{' '}
            <strong className="text-[#1E3932] font-mono">
              {Math.round(avgDayRev).toLocaleString('vi-VN')}đ
            </strong>
          </span>
          {peakDay && peakDay.revenue > 0 && (
            <span>
              Công suất đỉnh ({peakDay.dayShort}):{' '}
              <strong className="text-[#006241] font-mono">
                {peakDay.occupancyRate.toFixed(1)}%
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Box 2: Time of Day Distribution */}
      <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
          <div>
            <h3 className="text-base font-extrabold text-[#1E3932] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#006241]" />
              <span>Phân Bổ Doanh Thu Theo Buổi</span>
            </h3>
            <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
              Tỷ trọng doanh thu theo từng khung giờ trong ngày.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {timeOfDayStats.map((slot) => {
            return (
              <div
                key={slot.slotKey}
                className="p-4 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-white shadow-xs">
                      {getSlotIcon(slot.slotKey)}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-[#1E3932]">
                        {slot.label}
                      </div>
                      <div className="text-[10px] text-[#6F7E72] font-mono">
                        {slot.timeRange}
                      </div>
                    </div>
                  </div>

                  <span className="text-sm font-black font-mono text-[#006241]">
                    {slot.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E6E2D8]/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#6F7E72]">
                    {slot.ordersCount} đơn
                  </span>
                  <span className="font-mono font-bold text-[#1E3932]">
                    {slot.revenue.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-[#6F7E72] pt-3 border-t border-[#F2F0EB] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Khung giờ Buổi Tối (17:00 - 22:00) thường đóng góp tỷ trọng cao nhất trong mô hình sân thể thao.
          </span>
        </div>
      </div>
    </div>
  );
};
