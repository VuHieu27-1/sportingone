import React from 'react';
import { Calendar, Camera, Building2, ShieldCheck, Star } from 'lucide-react';

export type YardTabId = 'schedule' | 'reviews' | 'specs' | 'vendor' | 'policies';

interface YardDetailTabsProps {
  activeTab: YardTabId;
  onTabChange: (tab: YardTabId) => void;
  reviewCount?: number;
}

export const YardDetailTabs: React.FC<YardDetailTabsProps> = ({
  activeTab,
  onTabChange,
  reviewCount,
}) => {
  const TABS: Array<{ id: YardTabId; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'schedule', label: 'Lịch Đặt & Giờ Trống', icon: Calendar },
    {
      id: 'reviews',
      label: reviewCount !== undefined ? `Đánh Giá & Nhận Xét (${reviewCount})` : 'Đánh Giá & Nhận Xét',
      icon: Star,
    },
    { id: 'specs', label: 'Hình Ảnh Thực Tế & Cơ Sở', icon: Camera },
    { id: 'vendor', label: 'Cụm Sân Chủ Quản', icon: Building2 },
    { id: 'policies', label: 'Chính Sách & Check-in', icon: ShieldCheck },
  ];

  return (
    <div className="bg-white border-b border-[#E6E2D8] sticky top-0 z-30 shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#006241] text-white shadow-sm'
                    : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
