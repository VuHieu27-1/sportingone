import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Square,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  UploadCloud,
  Eye,
  Video,
  Play,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ChatAttachment } from '../../services/chatService';

export interface ChatInputBarProps {
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_SIZE_BYTES = 30 * 1024 * 1024;

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === 'Escape') {
        setPreviewIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : attachments.length - 1));
      } else if (e.key === 'ArrowRight') {
        setPreviewIndex((prev) => (prev !== null && prev < attachments.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, attachments.length]);

  // Convert File object to Base64 ChatAttachment
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (attachments.length + fileArray.length > MAX_FILES) {
      toast.error(`Chỉ được đính kèm tối đa ${MAX_FILES} tệp trong một lần gửi.`);
      return;
    }

    const currentTotal = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
    let prospectiveTotal = currentTotal;

    const newAttachments: ChatAttachment[] = [];

    for (const file of fileArray) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (isImg && file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(
          `Ảnh "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Giới hạn tối đa 10MB.`,
          { id: `err-img-${file.name}` },
        );
        continue;
      }

      if (isVid && file.size > MAX_VIDEO_SIZE_BYTES) {
        toast.error(
          `Video "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Giới hạn video tối đa 20MB.`,
          { id: `err-vid-${file.name}` },
        );
        continue;
      }

      if (!isImg && !isVid && file.size > MAX_DOC_SIZE_BYTES) {
        toast.error(
          `Tài liệu "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Giới hạn tối đa 10MB.`,
          { id: `err-doc-${file.name}` },
        );
        continue;
      }

      if (prospectiveTotal + file.size > MAX_BATCH_SIZE_BYTES) {
        toast.error(
          `Tổng dung lượng các tệp vượt quá 30MB. Không thể thêm "${file.name}".`,
          { id: 'err-batch-limit' },
        );
        continue;
      }

      prospectiveTotal += file.size;

      try {
        const base64Data = await readFileAsBase64(file);
        const isMedia = isImg || isVid;
        const previewUrl = isMedia ? URL.createObjectURL(file) : undefined;

        newAttachments.push({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64Data,
          size: file.size,
          previewUrl,
        });
      } catch {
        toast.error(`Không thể đọc tệp "${file.name}"`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(`Đã thêm ${newAttachments.length} tệp.`, {
        id: 'file-attached-toast',
      });
    }
  };

  const compressImageIfNeeded = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1920;
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressed = canvas.toDataURL(mimeType, 0.88);
            resolve(compressed);
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    if (file.type.startsWith('image/')) {
      return compressImageIfNeeded(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset file input value so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Clipboard paste handler (Ctrl + V images or text files)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          filesToProcess.push(file);
        }
      }
    }

    if (filesToProcess.length > 0) {
      e.preventDefault();
      processFiles(filesToProcess);
      toast.success(`Đã dán ${filesToProcess.length} tệp từ Clipboard`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasAttachments = attachments.length > 0;
    const textToSend = input.trim();

    if ((!textToSend && !hasAttachments) || disabled) return;

    if (isStreaming) {
      onStopStreaming();
    }

    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);

    onSendMessage(
      textToSend || (hasAttachments ? 'Hãy phân tích hình ảnh/tệp đính kèm này giúp tôi.' : ''),
      currentAttachments.length > 0 ? currentAttachments : undefined,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500" />;
    if (mimeType.includes('csv') || mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html'))
      return <FileCode className="w-4 h-4 text-amber-500" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-purple-500" />;
    return <FileIcon className="w-4 h-4 text-slate-500" />;
  };

  const hasContent = input.trim().length > 0 || attachments.length > 0;
  const currentPreview = previewIndex !== null ? attachments[previewIndex] : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 transition-all ${isDragging ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
        }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-emerald-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white font-bold text-xs gap-1.5 pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-6 h-6 animate-bounce" />
          <span>Thả ảnh (≤10MB), video (≤20MB) hoặc tài liệu (≤10MB) vào đây</span>
        </div>
      )}

      {/* Hidden File Input Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.txt,.csv,.md,.json,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Attachment Preview Tray */}
      {attachments.length > 0 && (
        <div className="px-3.5 pt-3 pb-1 flex items-center gap-2 overflow-x-auto">
          {attachments.map((file, idx) => {
            const isImg = file.mimeType.startsWith('image/');
            const isVid = file.mimeType.startsWith('video/');

            return (
              <div
                key={idx}
                onClick={() => setPreviewIndex(idx)}
                className="relative group shrink-0 flex items-center gap-2.5 px-2.5 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-emerald-50/60 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-xs shadow-2xs max-w-[240px] cursor-pointer transition-all"
                title="Bấm vào để xem lại ảnh/video này trước khi gửi"
              >
                {/* Media Thumbnail */}
                {isImg ? (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700 bg-black/5">
                    <img
                      src={file.previewUrl || file.data}
                      alt={file.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : isVid ? (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-purple-300/80 dark:border-purple-800 bg-purple-950/40 flex items-center justify-center">
                    {file.previewUrl && (
                      <video src={file.previewUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <Play className="w-3 h-3 fill-white text-white group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {renderFileIcon(file.mimeType)}
                  </div>
                )}

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px] leading-tight">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {formatFileSize(file.size)}
                    </span>
                    {(isImg || isVid) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                        {isVid ? 'Xem video' : 'Xem ảnh'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAttachment(idx);
                  }}
                  className="w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Gỡ bỏ tệp này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Batch capacity counter */}
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span>{attachments.length}/{MAX_FILES} tệp</span>
            <span>•</span>
            <span
              className={
                attachments.reduce((sum, a) => sum + (a.size || 0), 0) > 25 * 1024 * 1024
                  ? 'text-amber-500 font-bold'
                  : ''
              }
            >
              {formatFileSize(attachments.reduce((sum, a) => sum + (a.size || 0), 0))}/30MB
            </span>
          </div>
        </div>
      )}

      {/* 2. Input Field & Action Buttons */}
      <form onSubmit={handleSubmit} className="p-3 flex items-end gap-2">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_FILES}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40"
          title="Đính kèm tệp (Ảnh ≤ 10MB, Video ≤ 20MB, Tài liệu ≤ 10MB, Tổng ≤ 30MB)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Chat Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Hỏi AI về sân thể thao, luật chơi, dịch vụ..."
          rows={1}
          disabled={disabled}
          className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all"
        />

        {/* Send / Stop Streaming Button */}
        {isStreaming && !hasContent ? (
          <button
            type="button"
            onClick={onStopStreaming}
            className="w-10 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer"
            title="Dừng phản hồi"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!hasContent || disabled}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer"
            title={isStreaming ? 'Dừng câu cũ & Gửi câu hỏi mới' : 'Gửi câu hỏi'}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>

      {currentPreview &&
        createPortal(
          <div
            onClick={() => setPreviewIndex(null)}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 rounded-3xl border border-white/15 shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between select-none shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="p-2 rounded-xl bg-white/10 shrink-0">
                    {currentPreview.mimeType.startsWith('video/') ? (
                      <Video className="w-5 h-5 text-purple-400" />
                    ) : currentPreview.mimeType.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5 text-emerald-400" />
                    ) : (
                      renderFileIcon(currentPreview.mimeType)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm truncate">{currentPreview.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 shrink-0">
                        {currentPreview.mimeType.startsWith('video/')
                          ? 'Video đính kèm'
                          : currentPreview.mimeType.startsWith('image/')
                            ? 'Ảnh đính kèm'
                            : 'Tệp đính kèm'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatFileSize(currentPreview.size)} • Tệp {(previewIndex || 0) + 1} / {attachments.length}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const idxToRemove = previewIndex!;
                      handleRemoveAttachment(idxToRemove);
                      if (attachments.length <= 1) {
                        setPreviewIndex(null);
                      } else {
                        setPreviewIndex(Math.max(0, idxToRemove - 1));
                      }
                      toast.success('Đã gỡ tệp khỏi danh sách gửi.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Gỡ bỏ tệp này nếu không muốn gửi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gỡ tệp này</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewIndex(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Đóng xem trước (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Media Body */}
              <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/50 min-h-[300px] max-h-[70vh]">
                {currentPreview.mimeType.startsWith('video/') ? (
                  <video
                    key={currentPreview.previewUrl || currentPreview.name}
                    src={currentPreview.previewUrl || currentPreview.data}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[65vh] max-w-full rounded-2xl shadow-2xl bg-black border border-white/10"
                  />
                ) : currentPreview.mimeType.startsWith('image/') ? (
                  <img
                    src={currentPreview.previewUrl || currentPreview.data}
                    alt={currentPreview.name}
                    className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-2xl"
                  />
                ) : currentPreview.mimeType.includes('pdf') ? (
                  <iframe
                    src={currentPreview.previewUrl || currentPreview.data}
                    title={currentPreview.name}
                    className="w-full h-[65vh] rounded-2xl border border-white/10"
                  />
                ) : (
                  <div className="p-6 bg-slate-900 rounded-2xl border border-white/10 text-center max-w-md">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                      {renderFileIcon(currentPreview.mimeType)}
                    </div>
                    <h5 className="font-bold text-sm mb-1">{currentPreview.name}</h5>
                    <p className="text-xs text-slate-400">
                      Tệp tài liệu dạng văn bản sẽ được gửi trực tiếp cho AI phân tích nội dung.
                    </p>
                  </div>
                )}

                {attachments.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : attachments.length - 1))
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 cursor-pointer shadow-lg"
                      title="Tệp trước đó (Mũi tên trái)"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((prev) => (prev! < attachments.length - 1 ? prev! + 1 : 0))
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 cursor-pointer shadow-lg"
                      title="Tệp tiếp theo (Mũi tên phải)"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 select-none">
                <span className="hidden sm:inline">
                  💡 Bạn đang xem lại nội dung tệp đính kèm trước khi gửi cho Sporting ONE AI.
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold ml-auto transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận & Quay lại</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
