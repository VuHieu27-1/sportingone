import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  CornerDownRight,
  Loader2,
  Building2,
  Image as ImageIcon,
  ThumbsUp,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser } from '../../types/auth';
import { rateService } from '../../services/rateService';
import { RateItem } from '../../types/rate';
import { formatDateVietnamese } from '../../utils/dateUtils';
import { formatBookingPlayTime } from '../yard/YardReviewsTab';

interface YardRatingModalProps {
  isOpen: boolean;
  yardId: number;
  yardName?: string;
  vendorName?: string;
  bookingId?: number;
  currentUser: AuthUser | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường / Đạt chuẩn',
  4: 'Hài lòng / Sân tốt',
  5: 'Cực kỳ hài lòng / Tuyệt vời!',
};

export const YardRatingModal: React.FC<YardRatingModalProps> = ({
  isOpen,
  yardId,
  yardName = 'Sân thể thao',
  vendorName = 'Cụm Sân Thể Thao',
  bookingId,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

  const [existingReviews, setExistingReviews] = useState<RateItem[]>([]);
  const [myReview, setMyReview] = useState<RateItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [replyTarget, setReplyTarget] = useState<{
    targetRateId: number;
    rootReviewId: number;
    targetUsername: string;
  } | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isReplying, setIsReplying] = useState<boolean>(false);

  const loadYardRates = useCallback(async () => {
    if (!yardId) return;
    setIsLoading(true);
    try {
      const res = await rateService.getRatesByYard(yardId);
      if (res.success && res.data) {
        setExistingReviews(res.data.data || []);

        // Find my review if logged in
        if (currentUser?.id) {
          const found = (res.data.data || []).find(
            (r) => Number(r.user?.id) === Number(currentUser.id)
          );
          if (found) {
            setMyReview(found);
            setRating(found.rating || 5);
            setComment(found.comment || '');
            setImages(Array.isArray(found.images) ? found.images : []);
          } else {
            setMyReview(null);
            setRating(5);
            setComment('');
            setImages([]);
          }
        }
      }
    } catch {
      toast.error('Lỗi khi tải thông tin đánh giá sân.');
    } finally {
      setIsLoading(false);
    }
  }, [yardId, currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      loadYardRates();
      setIsEditing(false);
      setReplyTarget(null);
    }
  }, [isOpen, loadYardRates]);

  if (!isOpen) return null;

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      toast.error('Tối đa 4 hình ảnh đính kèm!');
      return;
    }

    const fileList: File[] = Array.from(files);
    setIsUploadingImages(true);
    try {
      const res = await rateService.uploadRateImages(fileList);
      if (res.success && res.data?.urls) {
        setImages((prev) => [...prev, ...res.data!.urls]);
        toast.success(`Đã tải lên ${res.data.urls.length} ảnh thành công!`);
      } else {
        toast.error(res.message || 'Không thể tải ảnh .');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh .');
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá!');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Vui lòng chọn số sao đánh giá từ 1 đến 5!');
      return;
    }

    if (!comment.trim()) {
      toast.error('Vui lòng nhập nội dung nhận xét trước khi gửi đánh giá!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (myReview && isEditing) {
        // Update existing review
        const res = await rateService.updateRate(myReview.id, {
          rating,
          comment: comment.trim(),
          images: images.length > 0 ? images : undefined,
        });

        if (res.success) {
          toast.success('Cập nhật đánh giá thành công!');
          setIsEditing(false);
          await loadYardRates();
          if (onSuccess) onSuccess();
        } else {
          toast.error(res.message || 'Không thể cập nhật đánh giá.');
        }
      } else {
        // Create new review
        const res = await rateService.createRate({
          yardId,
          userId: Number(currentUser.id),
          rating,
          comment: comment.trim(),
          bookingId: bookingId ? Number(bookingId) : undefined,
          images: images.length > 0 ? images : undefined,
        });

        if (res.success) {
          toast.success('Gửi đánh giá sân thành công! Cảm ơn nhận xét của bạn.');
          await loadYardRates();
          if (onSuccess) onSuccess();
        } else {
          toast.error(res.message || 'Không thể gửi đánh giá.');
        }
      }
    } catch {
      toast.error('Lỗi khi lưu đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (rateId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;

    try {
      const res = await rateService.deleteRate(rateId);
      if (res.success) {
        toast.success('Đã xóa bình luận thành công.');
        if (myReview?.id === rateId) {
          setMyReview(null);
          setRating(5);
          setComment('');
          setImages([]);
          setIsEditing(false);
        }
        await loadYardRates();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Không thể xóa bình luận.');
      }
    } catch {
      toast.error('Lỗi khi xóa bình luận.');
    }
  };

  const handleDeleteMyReview = async () => {
    if (!myReview?.id) return;
    await handleDeleteReview(myReview.id);
  };

  const handleSendReply = async (parentRateId: number) => {
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để trả lời bình luận!');
      return;
    }
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung câu trả lời!');
      return;
    }

    setIsReplying(true);
    try {
      const res = await rateService.replyRate(parentRateId, {
        userId: Number(currentUser.id),
        comment: replyText.trim(),
      });

      if (res.success) {
        toast.success('Đã gửi phản hồi thành công!');
        setReplyText('');
        setReplyTarget(null);
        await loadYardRates();
      } else {
        toast.error(res.message || 'Không thể gửi phản hồi.');
      }
    } catch {
      toast.error('Lỗi khi gửi phản hồi.');
    } finally {
      setIsReplying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-[#FBF8F0] w-full max-w-2xl rounded-[32px] border border-[#E6E2D8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#1E3932] text-white p-6 relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>{vendorName}</span>
            </div>
            <h2 className="text-xl font-black text-[#FBF8F0] tracking-tight mt-0.5">
              Đánh Giá: {yardName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Form Create / Edit Section */}
          {myReview && !isEditing ? (
            <div className="p-5 rounded-2xl bg-white border border-[#006241]/30 ring-1 ring-[#006241]/20 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#006241]/10 text-[#006241] text-xs font-black">
                    ĐÁNH GIÁ CỦA BẠN
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= (myReview.rating || 5)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-xs font-bold text-[#1E3932] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMyReview}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#1E3932] leading-relaxed">
                {myReview.comment || 'Không có nhận xét chi tiết.'}
              </p>

              {Array.isArray(myReview.images) && myReview.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {myReview.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Review attachment"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E6E2D8]"
                    />
                  ))}
                </div>
              )}

              <div className="text-[11px] text-[#6F7E72] font-mono pt-1">
                Đăng lúc: {formatDateVietnamese(myReview.createdAt)}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E6E2D8] shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB]">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black text-[#1E3932] uppercase tracking-wider">
                    {isEditing ? 'Chỉnh sửa đánh giá của bạn' : 'Chia sẻ trải nghiệm sân'}
                  </span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-[#6F7E72] hover:text-[#1E3932] underline cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              {/* Star Selection Row */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FBF8F0] to-[#F5F2EB] border border-[#E6E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#1E3932] block">
                    Chất lượng sân thi đấu
                  </span>
                  <span className="text-[10px] text-[#6F7E72]">
                    Chấm điểm theo mức độ hài lòng của bạn
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-[#E6E2D8] shrink-0"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => setRating(star)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-50 transition-colors cursor-pointer focus:outline-none shrink-0"
                        aria-label={`${star} sao`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors duration-150 ${star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="w-[235px] h-[40px] shrink-0 px-3.5 rounded-full bg-[#006241] text-white text-xs font-bold font-mono tracking-tight shadow-xs text-center flex items-center justify-center whitespace-nowrap">
                    {STAR_LABELS[hoverRating || rating]}
                  </div>
                </div>
              </div>

              {/* Detailed Comment Box with Integrated Quick Tags */}
              <div className="rounded-2xl bg-[#FBF8F0] border border-[#E6E2D8] p-3.5 sm:p-4 space-y-3 focus-within:border-[#006241] focus-within:ring-2 focus-within:ring-[#006241]/20 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[#1E3932]">
                    Nhận xét thực tế:
                  </label>
                  <div className="flex items-center gap-1 text-[11px] text-[#6F7E72]">
                    <span className="font-semibold text-amber-700">⚡ Gợi ý:</span>
                    <span className="italic">(Bấm chọn)</span>
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
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${isSelected
                          ? 'bg-[#006241] text-white border-[#006241] shadow-2xs'
                          : 'bg-white hover:bg-[#E6E2D8] text-[#1E3932] border-[#E6E2D8]'
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Comment Textarea */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn khi chơi tại sân này để cộng đồng cùng tham khảo nhé..."
                  rows={3}
                  maxLength={500}
                  className="w-full p-3 rounded-xl bg-white border border-[#E6E2D8] text-sm text-[#1E3932] placeholder:text-[#6F7E72]/60 focus:outline-none focus:border-[#006241] transition-all resize-none"
                />
                <div className="text-right text-[10px] text-[#6F7E72] font-mono pt-0.5">
                  {comment.length}/500 ký tự
                </div>
              </div>

              {/* Inline Media Gallery & Upload Tile */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-[#1E3932]">
                  Hình ảnh thực tế ({images.length}/4):
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group w-16 h-16 rounded-xl overflow-hidden border border-[#E6E2D8]"
                    >
                      <img
                        src={img}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {images.length < 4 && (
                    <label
                      className={`w-16 h-16 rounded-xl border-2 border-dashed border-[#006241]/40 hover:border-[#006241] hover:bg-[#006241]/5 flex flex-col items-center justify-center gap-0.5 text-[#006241] transition-all cursor-pointer ${isUploadingImages ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                      {isUploadingImages ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      <span className="text-[9px] font-bold text-center leading-tight">
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

              {/* Submit Button & Trust Notice */}
              <div className="pt-3 border-t border-[#F2F0EB] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-[#6F7E72]">
                  🔒 Đánh giá được bảo vệ bởi Sporting ONE
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-[#006241] hover:bg-[#1E3932] text-white text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isEditing ? 'CẬP NHẬT ĐÁNH GIÁ' : 'GỬI ĐÁNH GIÁ NGAY'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* All Reviews & Replies Stream */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-[#1E3932] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#006241]" />
              <span>Đánh Giá Từ Cộng Đồng ({existingReviews.length})</span>
            </h3>

            {isLoading ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 text-[#006241] animate-spin mx-auto" />
                <span className="text-xs text-[#6F7E72] mt-2 block">Đang tải đánh giá...</span>
              </div>
            ) : existingReviews.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-[#E6E2D8] space-y-1">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-[#1E3932]">Chưa có đánh giá nào cho sân này</p>
                <p className="text-xs text-[#6F7E72]">Hãy là người đầu tiên trải nghiệm và để lại đánh giá nhé!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {existingReviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-white border border-[#E6E2D8] space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#006241]/10 text-[#006241] font-bold text-xs flex items-center justify-center border border-[#006241]/20">
                          {rev.user?.username ? rev.user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1E3932] flex items-center gap-1.5">
                            <span>{rev.user?.username || 'Khách hàng Sporting'}</span>
                            {rev.booking && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#006241] text-[9px] font-black border border-emerald-200">
                                ✓ Đã đặt sân
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6F7E72] font-mono">
                            {formatDateVietnamese(rev.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= (rev.rating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-[#1E3932] leading-relaxed">
                      {rev.comment || 'Khách hàng không để lại nhận xét văn bản.'}
                    </p>

                    {/* Booking Play Time */}
                    {rev.booking?.startTime && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-[#1E3932] bg-[#FBF8F0] border border-[#E6E2D8] px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-[#006241] shrink-0" />
                        <span className="font-bold">Đã chơi:</span>
                        <span className="font-mono text-[#6F7E72]">
                          {formatBookingPlayTime(rev.booking.startTime, rev.booking.endTime)}
                        </span>
                      </div>
                    )}

                    {Array.isArray(rev.images) && rev.images.length > 0 && (
                      <div className="flex gap-2 pt-1 overflow-x-auto">
                        {rev.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Attached"
                            className="w-14 h-14 rounded-lg object-cover border border-[#E6E2D8]"
                          />
                        ))}
                      </div>
                    )}

                    {/* Replies List */}
                    {Array.isArray(rev.replies) && rev.replies.length > 0 && (
                      <div className="mt-2.5 pl-3 border-l-2 border-[#006241]/30 space-y-2">
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
                              <div key={reply.id} className="space-y-1.5">
                                <div
                                  className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${isDirectChild
                                    ? 'bg-[#FBF8F0] border-[#E6E2D8]'
                                    : 'bg-white border-[#E6E2D8] shadow-2xs'
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-[#006241] flex items-center gap-1">
                                      <CornerDownRight className="w-3 h-3 text-[#006241]" />
                                      <span>
                                        {reply.user?.username ||
                                          'Chủ sân / Khách hàng'}
                                      </span>
                                    </span>
                                    <span className="text-[9px] text-[#6F7E72] font-mono">
                                      {formatDateVietnamese(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-[#1E3932] pl-4">
                                    {reply.comment}
                                  </p>

                                  {/* Child Reply Action Bar */}
                                  <div className="pl-4 pt-1.5 flex items-center gap-2 border-t border-[#E6E2D8]/60 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          replyTarget?.targetRateId === reply.id
                                        ) {
                                          setReplyTarget(null);
                                          setReplyText('');
                                        } else {
                                          setReplyTarget({
                                            targetRateId: reply.id,
                                            rootReviewId: rootRevId,
                                            targetUsername:
                                              reply.user?.username ||
                                              'người dùng',
                                          });
                                          const mention = reply.user?.username
                                            ? `@${reply.user.username} `
                                            : '';
                                          setReplyText(mention);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F0EB] hover:bg-[#E6E2D8] text-[#1E3932] font-bold transition-colors cursor-pointer text-xs"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-[#006241]" />
                                      <span>Phản hồi</span>
                                    </button>

                                    {isMyReply && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReview(reply.id)}
                                        className="text-rose-600 hover:text-rose-800 font-semibold ml-auto cursor-pointer text-xs"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Render sub-replies of this comment if any */}
                                {Array.isArray(reply.replies) &&
                                  reply.replies.length > 0 && (
                                    <div className="pl-3 sm:pl-4 border-l-2 border-emerald-500/30 space-y-1.5 mt-1.5">
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

                    {/* Reply Action Button */}
                    <div className="pt-1 flex items-center justify-between border-t border-[#F2F0EB]">
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
                        className="text-[11px] font-bold text-[#006241] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Trả lời</span>
                      </button>
                    </div>

                    {/* Inline Reply Form */}
                    {replyTarget?.rootReviewId === rev.id && (
                      <div className="pt-2 flex flex-col gap-1.5">
                        {replyTarget.targetRateId !== rev.id && (
                          <div className="text-[10px] font-bold text-[#006241] flex items-center justify-between">
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
                            placeholder={`Viết phản hồi cho @${replyTarget.targetUsername}... (Nhấn Enter để gửi)`}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-[#FBF8F0] border border-[#E6E2D8] text-xs text-[#1E3932] focus:outline-none focus:border-[#006241]"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={isReplying || !replyText.trim()}
                            className="px-3.5 py-1.5 rounded-xl bg-[#006241] text-white text-xs font-bold hover:bg-[#1E3932] transition-colors cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
                          >
                            {isReplying ? 'Đang gửi...' : 'Gửi'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F2F0EB] border-t border-[#E6E2D8] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-white hover:bg-gray-100 text-[#1E3932] border border-[#E6E2D8] text-xs font-extrabold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
