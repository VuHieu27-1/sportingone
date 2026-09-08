import React from 'react';
import { MetricItem } from '../../types/common';

export const MetricsBannerSection: React.FC = () => {
  const metrics: MetricItem[] = [
    {
      id: 'm1',
      value: '12.8K+',
      label: 'NGƯỜI CHƠI HOẠT ĐỘNG',
      sublabel: 'Thành viên kết nối hàng tháng',
    },
    {
      id: 'm2',
      value: '450+',
      label: 'CỤM SÂN ĐỐI TÁC',
      sublabel: 'Phủ rộng tại các thành phố lớn',
    },
    {
      id: 'm3',
      value: '99.9%',
      label: 'HỆ THỐNG HOẠT ĐỘNG',
      sublabel: 'Thời gian vận hành liên tục',
    },
  ];

  return (
    <section id="metrics" className="py-16 bg-[#F2F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 rounded-3xl bg-[#FBF8F0] border border-[#6F7E72]/20 shadow-lg text-center">
          {metrics.map((item) => (
            <div key={item.id} className="space-y-2 border-b md:border-b-0 md:border-r last:border-0 border-[#6F7E72]/20 pb-6 md:pb-0">
              <span className="block text-4xl sm:text-5xl font-extrabold text-[#006241] font-mono tracking-tight">
                {item.value}
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-[#1E3932] tracking-wider uppercase font-mono">
                {item.label}
              </h4>
              <p className="text-xs text-[#6F7E72]">{item.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
