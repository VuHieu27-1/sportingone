import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  Building2,
  CheckCircle2,
  CornerDownRight,
  ThumbsUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rateService } from '../../services/rateService';
import { RateItem, RatingStats } from '../../types/rate';
import { formatDateVietnamese } from '../../utils/dateUtils';
import { BackendYardItem } from '../../services/vendorService';

interface VendorReviewsTabProps {
  vendorId: number | string;
  vendorName: string;
  yards: BackendYardItem[];
}

export const VendorReviewsTab: React.FC<VendorReviewsTabProps> = ({
  vendorId,
  vendorName,
  yards,
}) => {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYardFilter, setSelectedYardFilter] = useState<number | 'ALL'>('ALL');
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'ALL'>('ALL');

  const loadVendorRates = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const res = await rateService.getRatesByVendor(vendorId);
      if (res.success && res.data) {
        setRates(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch {
      toast.error('Lỗi khi tải đánh giá của cụm sân.');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadVendorRates();
  }, [loadVendorRates]);

  const filteredRates = rates.filter((r) => {
    if (selectedYardFilter !== 'ALL' && Number(r.yard?.id) !== selectedYardFilter) {
      return false;
    }
    if (selectedStarFilter !== 'ALL' && r.rating !== selectedStarFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      {/* 1. Aggregate Statistics Overview */}
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[32px] p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Big Score Box */}
          <div className="lg:col-span-4 text-center lg:text-left lg:border-r border-[#E6E2D8] lg:pr-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>UY TÍN CƠ SỞ ĐƯỢC XÁC THỰC</span>
            </div>

            <div className="flex items-baseline justify-center lg:justify-start gap-2">
              <span className="text-5xl sm:text-6xl font-black text-[#006241] font-mono tracking-tight">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '5.0'}
              </span>
              <span className="text-xl text-[#6F7E72] font-mono font-bold">/ 5.0</span>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(stats.averageRating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-[#6F7E72] font-medium">
              Tổng hợp từ <strong>{stats.totalReviews}</strong> lượt đánh giá của tất cả sân thuộc <strong>{vendorName}</strong>
            </p>
          </div>

          {/* Progress Bars Breakdown */}
          <div className="lg:col-span-8 space-y-2.5">
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = stats.ratingBreakdown[starNum as 1 | 2 | 3 | 4 | 5] || 0;
              const percent = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
              return (
                <div key={starNum} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-[#1E3932]">
                    <span>{starNum}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-3 rounded-full bg-[#E6E2D8] overflow-hidden">
                    <div
                      className="h-full bg-[#006241] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="w-16 text-right font-mono text-[11px] text-[#6F7E72] shrink-0">
                    <span>{count} ({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Filters & Review Feed */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#006241]" />
            <h3 className="text-lg font-black text-[#1E3932] tracking-tight">
              Danh Sách Đánh Giá Khách Hàng ({filteredRates.length})
            </h3>
          </div>

          {/* Multi filters (By Yard & By Star) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Yard Selector */}
            <select
              value={selectedYardFilter}
              onChange={(e) =>
                setSelectedYardFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#E6E2D8] text-xs font-bold text-[#1E3932] focus:outline-none focus:border-[#006241]"
            >
              <option value="ALL">Tất cả sân ({yards.length} sân)</option>
              {yards.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.yardName}
                </option>
              ))}
            </select>

            {/* Star Filters */}
            <div className="flex items-center gap-1 bg-[#FBF8F0] p-1 rounded-full border border-[#E6E2D8]">
              {(['ALL', 5, 4, 3, 2, 1] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStarFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    selectedStarFilter === s
                      ? 'bg-[#006241] text-white'
                      : 'text-[#6F7E72] hover:text-[#1E3932]'
                  }`}
                >
                  {s === 'ALL' ? 'Tất cả' : `${s}★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#006241] animate-spin mx-auto" />
            <p className="text-xs text-[#6F7E72] font-semibold">Đang tải đánh giá của nhà cung cấp...</p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border border-[#E6E2D8] space-y-2">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-base font-extrabold text-[#1E3932]">Chưa có đánh giá nào</h4>
            <p className="text-xs text-[#6F7E72]">Cơ sở này chưa nhận được đánh giá theo bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRates.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-[#E6E2D8] rounded-[28px] p-5 shadow-xs space-y-3 transition-all hover:border-[#006241]/30 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Yard Name & Rating */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2F0EB] text-[#006241] text-[10px] font-mono font-bold">
                        <Building2 className="w-3 h-3" />
                        <span>{rev.yard?.yardName || 'Sân thể thao'}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#1E3932] mt-1">
                        {rev.user?.username || 'Khách hàng Sporting'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-0.5 bg-[#FBF8F0] px-2.5 py-1 rounded-full border border-[#E6E2D8]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= (rev.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#1E3932] leading-relaxed">
                    {rev.comment || 'Khách hàng không để lại nhận xét chi tiết.'}
                  </p>

                  {Array.isArray(rev.images) && rev.images.length > 0 && (
                    <div className="flex gap-2 pt-1 overflow-x-auto">
                      {rev.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Feedback"
                          className="w-14 h-14 rounded-xl object-cover border border-[#E6E2D8]"
                        />
                      ))}
                    </div>
                  )}

                  {/* Replies if any (Recursive) */}
                  {Array.isArray(rev.replies) && rev.replies.length > 0 && (
                    <div className="pl-3 border-l-2 border-[#006241]/30 space-y-2 pt-1">
                      {(() => {
                        const renderVendorReply = (
                          reply: RateItem,
                          depth: number = 1
                        ) => (
                          <div key={reply.id} className="space-y-1.5">
                            <div className="text-[11px] text-[#6F7E72] bg-[#FBF8F0] p-2.5 rounded-xl border border-[#E6E2D8]/60">
                              <span className="font-bold text-[#006241] mr-1">
                                {reply.user?.username || 'Khách hàng / Chủ sân'}:
                              </span>
                              <span>{reply.comment}</span>
                            </div>

                            {Array.isArray(reply.replies) &&
                              reply.replies.length > 0 && (
                                <div className="pl-3 border-l-2 border-emerald-500/30 space-y-1.5 mt-1">
                                  {reply.replies.map((sub) =>
                                    renderVendorReply(sub, depth + 1)
                                  )}
                                </div>
                              )}
                          </div>
                        );

                        return rev.replies.map((reply) =>
                          renderVendorReply(reply, 1)
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F2F0EB] flex items-center justify-between text-[11px] text-[#6F7E72] font-mono">
                  <span>{formatDateVietnamese(rev.createdAt)}</span>
                  {rev.booking && (
                    <span className="text-[#006241] font-bold">✓ Đã đặt sân</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
