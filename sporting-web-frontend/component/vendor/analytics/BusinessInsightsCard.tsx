import React from 'react';
import {
  Sparkles,
  Flame,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { BusinessInsight } from './types';

interface BusinessInsightsCardProps {
  insights: BusinessInsight[];
}

export const BusinessInsightsCard: React.FC<BusinessInsightsCardProps> = ({ insights }) => {
  const getInsightIcon = (type: BusinessInsight['type']) => {
    switch (type) {
      case 'peak':
        return <Flame className="w-5 h-5 text-amber-600" />;
      case 'opportunity':
        return <Lightbulb className="w-5 h-5 text-sky-600" />;
      case 'growth':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#006241]" />;
    }
  };

  const getInsightBg = (type: BusinessInsight['type']) => {
    switch (type) {
      case 'peak':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'opportunity':
        return 'bg-sky-500/10 border-sky-500/20';
      case 'growth':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'bg-rose-500/10 border-rose-500/20';
      default:
        return 'bg-[#006241]/10 border-[#006241]/20';
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#E6E2D8] p-6 shadow-sm font-['Plus_Jakarta_Sans',sans-serif] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#006241]/10 text-[#006241] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base font-extrabold text-[#1E3932]">
              Phân Tích & Gợi Ý Kinh Doanh Thực Tế (Business Insights)
            </h3>
          </div>
          <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
            Các phát hiện tự động từ dữ liệu đặt sân giúp chủ quản lý tối ưu hóa công suất và giá bán.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border ${getInsightBg(
              item.type
            )} flex flex-col justify-between space-y-3 transition-all hover:scale-[1.01]`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-white shadow-xs">
                  {getInsightIcon(item.type)}
                </span>
                <h4 className="text-xs font-black text-[#1E3932]">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
                {item.description}
              </p>
            </div>

            {item.actionText && (
              <div className="pt-2 border-t border-[#E6E2D8]/60 flex items-center justify-between text-[11px] font-bold text-[#006241]">
                <span>{item.actionText}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
