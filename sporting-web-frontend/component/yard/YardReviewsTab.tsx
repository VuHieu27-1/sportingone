import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  Sparkles,
  X,
  Edit3,
  Trash2,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Filter,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../../types/auth';
import { rateService } from '../../services/rateService';
import { RateItem, RatingStats } from '../../types/rate';
import { formatDateVietnamese } from '../../utils/dateUtils';
import { BackendYardItem } from '../../services/vendorService';

interface YardReviewsTabProps {
  yard: BackendYardItem;
  currentUser: AuthUser | null;
  onReviewsUpdated?: () => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường / Đạt chuẩn',
  4: 'Hài lòng / Sân tốt',
  5: 'Cực kỳ hài lòng / Tuyệt vời!',
};

export const YardReviewsTab: React.FC<YardReviewsTabProps> = ({
  yard,
  currentUser,
  onReviewsUpdated,
}) => {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'ALL'>('ALL');

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

  // Edit / Reply State
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>('');
  const [replyTarget, setReplyTarget] = useState<{
    targetRateId: number;
    rootReviewId: number;
    targetUsername: string;
  } | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isReplying, setIsReplying] = useState<boolean>(false);

  const loadRates = useCallback(async () => {
    if (!yard?.id) return;
    setIsLoading(true);
    try {
      const res = await rateService.getRatesByYard(yard.id);
      if (res.success && res.data) {
        setRates(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch {
      toast.error('Lỗi khi tải danh sách đánh giá sân.');
    } finally {
      setIsLoading(false);
    }
  }, [yard?.id]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      toast.error('Tối đa đính kèm 4 hình ảnh!');
      return;
    }

    const fileList: File[] = Array.from(files);
    setIsUploadingImages(true);
    try {
      const res = await rateService.uploadRateImages(fileList);
      if (res.success && res.data?.urls) {
        setImages((prev) => [...prev, ...res.data!.urls]);
        toast.success(`Đã tải lên ${res.data.urls.length} ảnh lên thành công!`);
      } else {
        toast.error(res.message || 'Không thể tải ảnh lên.');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá sân!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rateService.createRate({
        yardId: Number(yard.id),
        userId: Number(currentUser.id),
        rating,
        comment: comment.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      });

      if (res.success) {
        toast.success('Cảm ơn bạn đã gửi đánh giá chất lượng sân!');
        setComment('');
        setImages([]);
        setRating(5);
        await loadRates();
        if (onReviewsUpdated) onReviewsUpdated();
      } else {
        toast.error(res.message || 'Không thể gửi đánh giá.');
      }
    } catch {
      toast.error('Lỗi kết nối khi gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async (reviewId: number) => {
    try {
      const res = await rateService.updateRate(reviewId, {
        rating: editRating,
        comment: editComment.trim() || undefined,
      });

      if (res.success) {
        toast.success('Cập nhật đánh giá thành công!');
        setEditingReviewId(null);
        await loadRates();
        if (onReviewsUpdated) onReviewsUpdated();
      } else {
        toast.error(res.message || 'Không thể cập nhật đánh giá.');
      }
    } catch {
      toast.error('Lỗi khi cập nhật đánh giá.');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này không?')) return;

    try {
      const res = await rateService.deleteRate(reviewId);
      if (res.success) {
        toast.success('Đã xóa đánh giá thành công.');
        await loadRates();
        if (onReviewsUpdated) onReviewsUpdated();
      } else {
        toast.error(res.message || 'Không thể xóa đánh giá.');
      }
    } catch {
      toast.error('Lỗi khi xóa đánh giá.');
    }
  };

  const handleSendReply = async (parentRateId: number) => {
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để phản hồi đánh giá!');
      return;
    }
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi!');
      return;
    }

    setIsReplying(true);
    try {
      const res = await rateService.replyRate(parentRateId, {
        userId: Number(currentUser.id),
        comment: replyText.trim(),
      });

      if (res.success) {
        toast.success('Phản hồi thành công!');
        setReplyText('');
        setReplyTarget(null);
        await loadRates();
      } else {
        toast.error(res.message || 'Không thể gửi phản hồi.');
      }
    } catch {
      toast.error('Lỗi khi gửi phản hồi.');
    } finally {
      setIsReplying(false);
    }
  };

  // Liked Reviews Tracker (Session-based to prevent duplicate spam)
  const likedStorageKey = useMemo(
    () => `sporting_liked_rates_${currentUser?.id || 'guest'}`,
    [currentUser?.id]
  );
  const [likedReviewIds, setLikedReviewIds] = useState<Set<number>>(() => {
    try {
      const raw = sessionStorage.getItem(`sporting_liked_rates_${currentUser?.id || 'guest'}`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set<number>();
  });

  const updateLikesInRateTree = (
    nodes: RateItem[],
    targetId: number,
    delta: number,
    serverCount?: number
  ): RateItem[] => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        const newCount =
          typeof serverCount === 'number'
            ? serverCount
            : Math.max(0, (node.likesCount || 0) + delta);
        return {
          ...node,
          likesCount: newCount,
        };
      }
      if (Array.isArray(node.replies) && node.replies.length > 0) {
        return {
          ...node,
          replies: updateLikesInRateTree(node.replies, targetId, delta, serverCount),
        };
      }
      return node;
    });
  };

  const handleLikeReview = async (reviewId: number) => {
    const isCurrentlyLiked = likedReviewIds.has(reviewId);
    const action = isCurrentlyLiked ? 'unlike' : 'like';
    const delta = isCurrentlyLiked ? -1 : 1;

    // 1. Optimistically update UI instantly for both root review and any nested replies
    setRates((prev) => updateLikesInRateTree(prev, reviewId, delta));
    setLikedReviewIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      try {
        sessionStorage.setItem(likedStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    // 2. Call backend API
    try {
      const res = await rateService.likeRate(reviewId, action);
      if (res.success && res.data && typeof res.data.likesCount === 'number') {
        const serverLikes = res.data.likesCount;
        setRates((prev) => updateLikesInRateTree(prev, reviewId, 0, serverLikes));
      }
    } catch {
      // Rollback on failure
      setRates((prev) => updateLikesInRateTree(prev, reviewId, -delta));
      setLikedReviewIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(reviewId);
        else next.delete(reviewId);
        try {
          sessionStorage.setItem(likedStorageKey, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      toast.error('Lỗi khi cập nhật trạng thái hữu ích.');
    }
  };

  const filteredRates = rates.filter((r) => {
    if (selectedStarFilter === 'ALL') return true;
    return r.rating === selectedStarFilter;
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1E3932]">
      {/* 1. Rating Overview & Breakdown Card */}
      <div className="bg-[#FBF8F0] border border-[#E6E2D8] rounded-[32px] p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Big Score Box */}
          <div className="lg:col-span-4 text-center lg:text-left lg:border-r border-[#E6E2D8] lg:pr-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006241]/10 text-[#006241] text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Đánh Giá Được Xác Thực</span>
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
                  className={`w-5 h-5 ${s <= Math.round(stats.averageRating || 5)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                    }`}
                />
              ))}
            </div>

            <p className="text-xs text-[#6F7E72] font-medium">
              Tổng cộng <strong>{stats.totalReviews}</strong> lượt đánh giá từ người chơi thực tế
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

      {/* 2. Write Review Form (Redesigned with Commercial & Trust Layout) */}
      <div className="bg-white border border-[#E6E2D8] rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header with Commercial / Trust Elements */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F0EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-[#1E3932] tracking-tight">
                Chia Sẻ Trải Nghiệm Của Bạn
              </h3>
            </div>
            <p className="text-xs text-[#6F7E72] mt-1">
              Đánh giá thực tế giúp cộng đồng chọn sân chuẩn xác và giúp chủ sân cải thiện dịch vụ.
            </p>
          </div>

          {currentUser ? (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8]/80">
              <div className="w-8 h-8 rounded-full bg-[#006241] text-white font-black text-xs flex items-center justify-center">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#1E3932] block leading-tight">
                  {currentUser.username}
                </span>
                <span className="text-[10px] text-[#006241] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Khách hàng xác thực
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 font-semibold">
              ⚠️ Vui lòng đăng nhập để gửi đánh giá
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitReview} className="space-y-5">
          {/* Interactive Star Picker - Highlighted Hero Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FBF8F0] to-[#F5F2EB] border border-[#E6E2D8] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#1E3932] block">
                Mức độ hài lòng của bạn
              </span>
              <span className="text-[11px] text-[#6F7E72] mt-0.5 block">
                Hãy chấm điểm trải nghiệm tổng quan tại sân
              </span>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              <div
                className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-2xl border border-[#E6E2D8] shadow-2xs"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setRating(star)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-amber-50 transition-all cursor-pointer focus:outline-none"
                    aria-label={`${star} sao`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors duration-150 ${star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-gray-300'
                        }`}
                    />
                  </button>
                ))}
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#006241] text-white text-xs font-bold font-mono tracking-tight shadow-xs min-w-[170px] text-center">
                {STAR_LABELS[hoverRating || rating]}
              </div>
            </div>
          </div>

          {/* Detailed Comment Box with Integrated Quick Tags */}
          <div className="rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] p-4 sm:p-5 space-y-3.5 focus-within:border-[#006241] focus-within:ring-2 focus-within:ring-[#006241]/20 transition-all">
            {/* Header of the comment box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#1E3932]">
                Nội dung nhận xét chi tiết
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6F7E72]">
                <span className="font-semibold text-amber-700">⚡ Gợi ý nhanh:</span>
                <span className="italic">(Bấm để tự động điền)</span>
              </div>
            </div>

            {/* Quick Experience Tags (Inside the comment block) */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '🌱 Mặt sân êm ái',
                '💡 Ánh sáng chuẩn',
                '🚗 Bãi đỗ xe thuận tiện',
                '⚡ Check-in nhanh gọn',
                '🥤 Dịch vụ chu đáo',
                '👥 Nhân viên nhiệt tình',
                '💰 Giá cả hợp lý',
              ].map((tag) => {
                const isSelected = comment.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setComment((prev) => {
                        if (prev.includes(tag)) {
                          return prev
                            .replace(tag, '')
                            .replace(/\s*•\s*/g, ' • ')
                            .replace(/^(\s*•\s*)+|(\s*•\s*)+$/g, '')
                            .trim();
                        }
                        return prev ? `${prev} • ${tag}` : tag;
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${isSelected
                      ? 'bg-[#006241] text-white border-[#006241] shadow-2xs'
                      : 'bg-white hover:bg-[#E6E2D8] text-[#1E3932] border-[#E6E2D8]'
                      }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Text Area */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ nhận xét thực tế về mặt sân, ánh sáng, phòng thay đồ, nhân viên, v.v..."
              rows={3}
              maxLength={600}
              className="w-full p-3.5 rounded-xl bg-white border border-[#E6E2D8] text-sm text-[#1E3932] placeholder:text-[#6F7E72]/60 focus:outline-none focus:border-[#006241] transition-all resize-none"
            />

            <div className="flex justify-between items-center text-[10px] text-[#6F7E72] font-mono pt-0.5">
              <span>Đánh giá khách quan giúp xây dựng cộng đồng thể thao văn minh</span>
              <span>{comment.length}/600 ký tự</span>
            </div>
          </div>

          {/* Inline Media Gallery & Upload Tile */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-[#1E3932]">
              Hình ảnh thực tế từ sân ({images.length}/4):
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {/* Image Preview Thumbnails */}
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-2xl overflow-hidden border border-[#E6E2D8] shadow-xs"
                >
                  <img
                    src={img}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                    title="Xóa ảnh này"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Upload Tile Button */}
              {images.length < 4 && (
                <label
                  className={`w-20 h-20 rounded-2xl border-2 border-dashed border-[#006241]/40 hover:border-[#006241] hover:bg-[#006241]/5 flex flex-col items-center justify-center gap-1 text-[#006241] transition-all cursor-pointer ${isUploadingImages ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                  {isUploadingImages ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {isUploadingImages ? 'Đang tải...' : 'Tải ảnh lên'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingImages || images.length >= 4}
                    onChange={handleUploadFiles}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#F2F0EB] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#6F7E72] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#006241]" />
              <span>Đánh giá của bạn tuân thủ chính sách cộng đồng Sporting ONE</span>
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !currentUser}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-black tracking-wide transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi đánh giá...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>GỬI ĐÁNH GIÁ NGAY</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Star Filter Tabs & Reviews Stream */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#006241]" />
            <h3 className="text-lg font-black text-[#1E3932] tracking-tight">
              Tất Cả Đánh Giá ({filteredRates.length})
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#FBF8F0] p-1.5 rounded-full border border-[#E6E2D8]">
            {(['ALL', 5, 4, 3, 2, 1] as const).map((star) => {
              const isSelected = selectedStarFilter === star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStarFilter(star)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${isSelected
                    ? 'bg-[#006241] text-white shadow-xs'
                    : 'text-[#6F7E72] hover:text-[#1E3932]'
                    }`}
                >
                  {star === 'ALL' ? 'Tất cả' : `${star} Sao`}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#006241] animate-spin mx-auto" />
            <p className="text-xs text-[#6F7E72] font-semibold">Đang tải đánh giá của sân...</p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[32px] border border-[#E6E2D8] space-y-2">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-base font-extrabold text-[#1E3932]">Chưa có đánh giá nào phù hợp</h4>
            <p className="text-xs text-[#6F7E72]">Hãy trở thành người đầu tiên trải nghiệm và chia sẻ nhận xét nhé!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRates.map((rev) => {
              const isMyRev = currentUser?.id && Number(currentUser.id) === Number(rev.user?.id);
              const isCurrentlyEditing = editingReviewId === rev.id;

              return (
                <div
                  key={rev.id}
                  className="bg-white border border-[#E6E2D8] rounded-[28px] p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-[#006241]/30"
                >
                  {/* Reviewer Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#006241]/10 text-[#006241] font-black text-sm flex items-center justify-center border border-[#006241]/20">
                        {rev.user?.username ? rev.user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-[#1E3932]">
                            {rev.user?.username || 'Khách hàng Sporting'}
                          </h4>
                          {rev.booking && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006241] text-[10px] font-black border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã đặt sân thành công</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#6F7E72] font-mono">
                          {formatDateVietnamese(rev.createdAt, { includeWeekday: true })}
                        </span>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 bg-[#FBF8F0] px-3 py-1 rounded-full border border-[#E6E2D8]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= (rev.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Comment Body / Editing form */}
                  {isCurrentlyEditing ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditRating(s)}
                            className="p-1 text-amber-400 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${s <= editRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                }`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E6E2D8] text-xs text-[#1E3932] focus:outline-none focus:border-[#006241]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-4 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-700 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateReview(rev.id)}
                          className="px-4 py-1.5 rounded-full bg-[#006241] text-xs font-bold text-white cursor-pointer"
                        >
                          Lưu Thay Đổi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E3932] leading-relaxed">
                      {rev.comment || 'Khách hàng không để lại nhận xét chi tiết.'}
                    </p>
                  )}

                  {/* Images Carousel / Preview */}
                  {Array.isArray(rev.images) && rev.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {rev.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative w-20 h-20 rounded-2xl overflow-hidden border border-[#E6E2D8] block hover:scale-105 transition-transform"
                        >
                          <img src={img} alt="Review feedback" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Nested Replies Stream */}
                  {Array.isArray(rev.replies) && rev.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-[#006241]/30 space-y-3">
                      {(() => {
                        const renderReplyNode = (
                          reply: RateItem,
                          rootRevId: number,
                          depth: number = 1
                        ) => {
                          const isMyReply =
                            currentUser?.id &&
                            Number(reply.user?.id) === Number(currentUser.id);
                          const isDirectChild = depth === 1;

                          return (
                            <div key={reply.id} className="space-y-2">
                              <div
                                className={`p-3.5 rounded-2xl border space-y-2 ${isDirectChild
                                  ? 'bg-[#FBF8F0] border-[#E6E2D8]'
                                  : 'bg-white border-[#E6E2D8] shadow-2xs'
                                  }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-[#006241] flex items-center gap-1.5">
                                    <CornerDownRight className="w-3.5 h-3.5 text-[#006241]" />
                                    <span>
                                      {reply.user?.username || 'Khách hàng Sporting'}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-[#6F7E72] font-mono">
                                    {formatDateVietnamese(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-[#1E3932] pl-5 leading-relaxed">
                                  {reply.comment}
                                </p>

                                {/* Action buttons for this reply */}
                                <div className="pl-5 pt-1.5 flex items-center gap-2 border-t border-[#E6E2D8]/60 text-xs flex-wrap">
                                  {(() => {
                                    const isReplyLiked = likedReviewIds.has(reply.id);
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleLikeReview(reply.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
                                          isReplyLiked
                                            ? 'bg-emerald-50 text-[#006241] border-emerald-300 shadow-2xs'
                                            : 'bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] border-transparent'
                                        }`}
                                        title={isReplyLiked ? 'Bỏ đánh dấu hữu ích' : 'Bình luận này hữu ích'}
                                      >
                                        <ThumbsUp
                                          className={`w-3.5 h-3.5 transition-transform ${
                                            isReplyLiked
                                              ? 'fill-[#006241] text-[#006241] scale-110'
                                              : 'text-[#006241]'
                                          }`}
                                        />
                                        <span>Hữu ích ({reply.likesCount || 0})</span>
                                      </button>
                                    );
                                  })()}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (replyTarget?.targetRateId === reply.id) {
                                        setReplyTarget(null);
                                        setReplyText('');
                                      } else {
                                        setReplyTarget({
                                          targetRateId: reply.id,
                                          rootReviewId: rootRevId,
                                          targetUsername: reply.user?.username || 'người dùng',
                                        });
                                        const mention = reply.user?.username
                                          ? `@${reply.user.username} `
                                          : '';
                                        setReplyText(mention);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-bold transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-[#006241]" />
                                    <span>Phản hồi</span>
                                  </button>

                                  {isMyReply && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReview(reply.id)}
                                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold ml-auto cursor-pointer text-xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Xóa</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Recursively render sub-replies of this comment if any! */}
                              {Array.isArray(reply.replies) &&
                                reply.replies.length > 0 && (
                                  <div className="pl-4 sm:pl-6 border-l-2 border-emerald-500/30 space-y-2 mt-2">
                                    {reply.replies.map((subReply) =>
                                      renderReplyNode(
                                        subReply,
                                        rootRevId,
                                        depth + 1
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        };

                        return rev.replies.map((reply) =>
                          renderReplyNode(reply, rev.id, 1)
                        );
                      })()}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#F2F0EB] flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const isRevLiked = likedReviewIds.has(rev.id);
                        return (
                          <button
                            type="button"
                            onClick={() => handleLikeReview(rev.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
                              isRevLiked
                                ? 'bg-emerald-50 text-[#006241] border-emerald-300 shadow-2xs'
                                : 'bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] border-transparent'
                            }`}
                            title={isRevLiked ? 'Bỏ đánh dấu hữu ích' : 'Đánh giá này hữu ích'}
                          >
                            <ThumbsUp
                              className={`w-3.5 h-3.5 transition-transform ${
                                isRevLiked
                                  ? 'fill-[#006241] text-[#006241] scale-110'
                                  : 'text-[#006241]'
                              }`}
                            />
                            <span>Hữu ích ({rev.likesCount || 0})</span>
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => {
                          if (replyTarget?.targetRateId === rev.id) {
                            setReplyTarget(null);
                            setReplyText('');
                          } else {
                            setReplyTarget({
                              targetRateId: rev.id,
                              rootReviewId: rev.id,
                              targetUsername: rev.user?.username || 'khách hàng',
                            });
                            setReplyText('');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-bold transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#006241]" />
                        <span>Phản hồi</span>
                      </button>
                    </div>

                    {isMyRev && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReviewId(rev.id);
                            setEditRating(rev.rating || 5);
                            setEditComment(rev.comment || '');
                          }}
                          className="inline-flex items-center gap-1 text-[#6F7E72] hover:text-[#1E3932] font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Reply Form */}
                  {replyTarget?.rootReviewId === rev.id && (
                    <div className="pt-2 flex flex-col gap-1.5">
                      {replyTarget.targetRateId !== rev.id && (
                        <div className="text-[11px] font-bold text-[#006241] flex items-center justify-between">
                          <span>
                            Đang trả lời @{replyTarget.targetUsername} (Mã comment #{replyTarget.targetRateId})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTarget(null);
                              setReplyText('');
                            }}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            ✕ Hủy
                          </button>
                        </div>
                      )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!isReplying && replyText.trim()) {
                            handleSendReply(replyTarget.targetRateId);
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (!isReplying && replyText.trim()) {
                                handleSendReply(replyTarget.targetRateId);
                              }
                            }
                          }}
                          placeholder={`Viết câu trả lời cho @${replyTarget.targetUsername}... (Nhấn Enter để gửi)`}
                          className="flex-1 px-4 py-2 rounded-xl bg-[#FBF8F0] border border-[#E6E2D8] text-xs text-[#1E3932] focus:outline-none focus:border-[#006241]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={isReplying || !replyText.trim()}
                          className="px-5 py-2 rounded-xl bg-[#006241] text-white text-xs font-bold hover:bg-[#1E3932] transition-colors cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
                        >
                          {isReplying ? 'Đang gửi...' : 'Gửi'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
