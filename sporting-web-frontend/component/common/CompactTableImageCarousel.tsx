import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Camera, Eye, Plus, Image as ImageIcon, X } from 'lucide-react';

interface CompactTableImageCarouselProps {
  images?: (string | { url?: string; imageUrl?: string } | any)[];
  title?: string;
  onEditImages?: () => void;
  className?: string;
}

export const CompactTableImageCarousel: React.FC<CompactTableImageCarouselProps> = ({
  images = [],
  title = 'Ảnh thực tế',
  onEditImages,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Normalize image URLs into valid string array
  const validImages: string[] = (Array.isArray(images) ? images : [])
    .map((img) => {
      if (!img) return '';
      if (typeof img === 'string') return img.trim();
      return (img.url || img.imageUrl || img.src || '').trim();
    })
    .filter((url) => url.length > 0);

  const totalImages = validImages.length;
  const currentImage = totalImages > 0 ? validImages[currentIndex % totalImages] : '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImages === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImages === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalImages);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalImages > 0) {
      setIsLightboxOpen(true);
    } else if (onEditImages) {
      onEditImages();
    }
  };

  // If no images uploaded
  if (totalImages === 0) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={onEditImages}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F0EB] hover:bg-emerald-50 text-[#6F7E72] hover:text-[#006241] border border-[#E6E2D8] hover:border-emerald-200 text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs"
          title="Bấm để tải thêm ảnh thực tế"
        >
          <Camera className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>Chưa có ảnh</span>
          {onEditImages && <Plus className="w-3 h-3 text-[#006241] ml-0.5" />}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`relative inline-block group select-none ${className}`}>
        {/* Thumbnail Card Container */}
        <div
          onClick={handleImageClick}
          className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden border border-[#E6E2D8] shadow-xs group-hover:shadow-md transition-all duration-300 bg-[#1E3932] cursor-pointer"
          title={`${title} - Bấm để xem phóng to (${currentIndex + 1}/${totalImages})`}
        >
          {/* Main Thumbnail Image */}
          <img
            src={currentImage}
            alt={`${title} - ${currentIndex + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback placeholder on image load error
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80';
            }}
          />

          {/* Dark Overlay gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity" />

          {/* Left Arrow Button */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/50 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all duration-200 opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-xs hover:scale-110 z-10"
              title="Ảnh trước đó"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Right Arrow Button */}
          {totalImages > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/50 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all duration-200 opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-xs hover:scale-110 z-10"
              title="Ảnh tiếp theo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Counter Badge */}
          <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-emerald-300 font-mono text-[9px] font-extrabold tracking-tight leading-none z-10 border border-white/20">
            {currentIndex + 1}/{totalImages}
          </div>

          {/* Quick Expand Icon Indicator on Hover */}
          <div className="absolute top-1 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <span className="p-0.5 rounded bg-black/40 text-white backdrop-blur-xs block">
              <Eye className="w-3 h-3 text-emerald-300" />
            </span>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-white/10 text-white">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-extrabold font-mono uppercase tracking-wider">{title}</span>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                {currentIndex + 1} / {totalImages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onEditImages && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(false);
                    onEditImages();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Quản Lý Ảnh</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image Display */}
          <div
            className="relative flex items-center justify-center w-full max-w-5xl h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {totalImages > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-xs"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={validImages[currentIndex]}
              alt={`${title} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {totalImages > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-xs"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {totalImages > 1 && (
            <div
              className="absolute bottom-6 flex items-center gap-2 px-4 py-2 bg-black/60 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === currentIndex
                      ? 'border-emerald-400 scale-105 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
