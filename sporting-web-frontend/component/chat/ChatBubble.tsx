import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  User as UserIcon,
  Copy,
  Check,
  CalendarCheck,
  ExternalLink,
  Pencil,
  RotateCcw,
  X,
  Send,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  ZoomIn,
  Download,
  Eye,
  FileCheck,
  Video,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatMessageItem, ChatAttachment } from '../../services/chatService';
import { AICourtCardWidget, AICourtCardData } from './AICourtCardWidget';

export interface ChatBubbleProps {
  message: ChatMessageItem;
  index: number;
  isLastAssistant?: boolean;
  onEdit?: (index: number, newText: string) => void;
  onRetry?: (index: number) => void;
  onNavigateAction?: () => void;
  isStreaming?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  index,
  isLastAssistant = false,
  onEdit,
  onRetry,
  onNavigateAction,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  // Modal Lightbox states
  const [zoomedImage, setZoomedImage] = useState<ChatAttachment | null>(null);
  const [zoomedVideo, setZoomedVideo] = useState<ChatAttachment | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ChatAttachment | null>(null);

  const navigate = useNavigate();
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    const cleanText = message.content
      .replace(/\[COURT_CARD:\{.*?\}\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .trim();
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCourtClick = (url: string) => {
    navigate(url);
    onNavigateAction?.();
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsEditing(false);
    onEdit?.(index, trimmed);
  };

  const handleCancelEdit = () => {
    setEditText(message.content);
    setIsEditing(false);
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    if (mimeType.includes('csv') || mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html'))
      return <FileCode className="w-4 h-4 text-amber-500 shrink-0" />;
    return <FileIcon className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  // Trigger download of attachment
  const handleDownloadAttachment = (att: ChatAttachment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetUrl = att.url || att.data || att.previewUrl || '';
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = att.name || 'tai-lieu';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  // Open Document in Viewer / New Tab
  const handleOpenDocument = (doc: ChatAttachment) => {
    if (doc.mimeType.includes('pdf') || doc.mimeType.includes('text') || doc.mimeType.includes('csv') || doc.mimeType.includes('json')) {
      setViewingDoc(doc);
    } else {
      handleDownloadAttachment(doc);
    }
  };

  /**
   * Parses inline markdown text: converts **bold** to <strong> and cleans up stray asterisks.
   */
  const renderInlineMarkdown = (text: string, baseKey: string): React.ReactNode[] => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const inlineParts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        const segment = text.substring(lastIdx, match.index).replace(/\*/g, '');
        inlineParts.push(<span key={`${baseKey}-t-${lastIdx}`}>{segment}</span>);
      }

      inlineParts.push(
        <strong
          key={`${baseKey}-b-${match.index}`}
          className="font-bold text-slate-900 dark:text-white"
        >
          {match[1]}
        </strong>,
      );

      lastIdx = boldRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      const remaining = text.substring(lastIdx).replace(/\*/g, '');
      inlineParts.push(<span key={`${baseKey}-rem-${lastIdx}`}>{remaining}</span>);
    }

    return inlineParts.length > 0 ? inlineParts : [text.replace(/\*/g, '')];
  };

  /**
   * Parses content containing [COURT_CARD:{...}] or markdown links [Text](/path)
   */
  const renderFormattedContent = (content: string) => {
    const combinedRegex = /(?:\[COURT_CARD:(\{.*?\})\])|(?:\[([^\]]+)\]\(([^)]+)\))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = combinedRegex.lastIndex;

      if (matchStart > lastIndex) {
        const textChunk = content.substring(lastIndex, matchStart);
        parts.push(
          <React.Fragment key={`frag-${lastIndex}`}>
            {renderInlineMarkdown(textChunk, `txt-${lastIndex}`)}
          </React.Fragment>,
        );
      }

      if (match[1]) {
        try {
          const cardData: AICourtCardData = JSON.parse(match[1]);
          parts.push(
            <AICourtCardWidget
              key={`card-${matchStart}`}
              court={cardData}
              data={cardData}
              onBookClick={handleCourtClick}
            />,
          );
        } catch {
          parts.push(<span key={`err-card-${matchStart}`} className="text-xs text-rose-500">[Dữ liệu sân]</span>);
        }
      } else if (match[2] && match[3]) {
        const linkText = match[2];
        let linkUrl = match[3];

        if (linkUrl.includes('/user/profile?tab=wallet') && !linkUrl.includes('action=')) {
          linkUrl += '&action=deposit';
        } else if (linkUrl.includes('/user/profile?tab=vendor') && !linkUrl.includes('action=')) {
          linkUrl += '&action=register';
        } else if (linkUrl.match(/^\/yard\/\d+$/) && !linkUrl.includes('action=')) {
          linkUrl += '?action=booking';
        }

        parts.push(
          <button
            key={`link-${matchStart}`}
            type="button"
            onClick={() => handleCourtClick(linkUrl)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1.5 mx-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs shadow-2xs transition-all cursor-pointer group"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
          </button>,
        );
      }

      lastIndex = matchEnd;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      parts.push(
        <React.Fragment key={`frag-end-${lastIndex}`}>
          {renderInlineMarkdown(remaining, `txt-end-${lastIndex}`)}
        </React.Fragment>,
      );
    }

    return parts;
  };

  const images = (message.attachments || []).filter((a) => a.mimeType.startsWith('image/'));
  const videos = (message.attachments || []).filter((a) => a.mimeType.startsWith('video/'));
  const documents = (message.attachments || []).filter(
    (a) => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('video/'),
  );

  return (
    <div
      className={`flex items-start gap-3 text-sm group ${isAssistant ? 'justify-start' : 'justify-end flex-row'
        }`}
    >
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-2xs transition-all ${isAssistant
            ? 'bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60'
            : 'bg-emerald-600 text-white rounded-tr-xs shadow-sm'
          }`}
      >
        {/* User Edit Button (Hover on user bubble) */}
        {!isAssistant && !isEditing && onEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Chỉnh sửa câu hỏi này"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 1. Render Uploaded Attachments (if any) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2.5 space-y-2">
            {/* Images Grid */}
            {images.length > 0 && (
              <div
                className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
                  }`}
              >
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(img)}
                    className="relative group/img overflow-hidden rounded-xl border border-white/20 dark:border-slate-700 aspect-video bg-black/20 cursor-pointer shadow-2xs"
                    title="Bấm để xem ảnh phóng to"
                  >
                    <img
                      src={img.url || img.data || img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-bold">
                      <ZoomIn className="w-4 h-4" />
                      <span>Xem ảnh</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Videos Grid */}
            {videos.length > 0 && (
              <div
                className={`grid gap-1.5 ${videos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                  }`}
              >
                {videos.map((vid, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedVideo(vid)}
                    className="relative group/vid overflow-hidden rounded-xl border border-white/20 dark:border-slate-700 aspect-video bg-black/40 cursor-pointer shadow-2xs flex items-center justify-center"
                    title="Bấm để phát video"
                  >
                    {vid.url || vid.previewUrl || vid.data ? (
                      <video
                        src={vid.url || vid.previewUrl || vid.data}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 group-hover/vid:bg-black/60 transition-colors flex flex-col items-center justify-center text-white gap-1">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover/vid:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                      <span className="text-[11px] font-bold px-2 truncate max-w-[90%]">
                        {vid.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Documents List */}
            {documents.length > 0 && (
              <div className="space-y-1.5">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenDocument(doc)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all ${isAssistant
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs'
                        : 'bg-emerald-700/80 border-emerald-500 text-white shadow-2xs'
                      }`}
                    title="Bấm để xem hoặc tải tệp"
                  >
                    <div className="p-1 rounded-lg bg-white/10 shrink-0">
                      {renderFileIcon(doc.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-bold text-[12px]">{doc.name}</p>
                      {doc.size && <p className="text-[10px] opacity-75">{formatFileSize(doc.size)}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadAttachment(doc, e)}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                      title="Tải xuống tệp này"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Message Body */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDownEdit}
              rows={2}
              autoFocus
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              placeholder="Chỉnh sửa câu hỏi..."
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Huỷ</span>
              </button>
              <button
                type="submit"
                disabled={!editText.trim()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi lại</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="whitespace-pre-wrap break-words">
              {isAssistant
                ? renderFormattedContent(message.content)
                : renderInlineMarkdown(message.content, 'user-msg')}
            </div>

            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle rounded-xs" />
            )}

            <div
              className={`flex items-center justify-between mt-2 pt-1 border-t text-[11px] opacity-70 ${isAssistant
                  ? 'border-slate-200/40 dark:border-slate-700/40'
                  : 'border-emerald-500/50 text-emerald-100'
                }`}
            >
              <span>{isAssistant ? 'Trợ lý AI' : 'Bạn'}</span>

              {isAssistant && message.content && !message.isStreaming && (
                <div className="flex items-center gap-1.5 ml-2">
                  {onRetry && (
                    <button
                      onClick={() => onRetry(index)}
                      className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                      title="Thử lại / Tạo lại câu trả lời"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Thử lại</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopy}
                    className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Sao chép câu trả lời"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <UserIcon className="w-4 h-4" />
        </div>
      )}

      {/* 3. Fullscreen Image Lightbox Modal via Portal */}
      {zoomedImage &&
        createPortal(
          <div
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/15 flex flex-col cursor-default"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between text-white select-none">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold truncate max-w-xs sm:max-w-md">
                    {zoomedImage.name}
                  </span>
                  {zoomedImage.size && (
                    <span className="text-[10px] text-slate-400">
                      ({formatFileSize(zoomedImage.size)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDownloadAttachment(zoomedImage, e)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Tải ảnh về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tải về</span>
                  </button>

                  <button
                    onClick={() => setZoomedImage(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Full Image */}
              <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
                <img
                  src={zoomedImage.url || zoomedImage.data || zoomedImage.previewUrl}
                  alt={zoomedImage.name}
                  className="max-h-[70vh] w-auto object-contain rounded-2xl"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 4. Full Document Viewer Modal via Portal */}
      {viewingDoc &&
        createPortal(
          <div
            onClick={() => setViewingDoc(null)}
            className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 rounded-xl bg-white/10">
                    {renderFileIcon(viewingDoc.mimeType)}
                  </div>
                  <div className="truncate">
                    <h4 className="font-extrabold text-sm truncate">{viewingDoc.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(viewingDoc.size)} • {viewingDoc.mimeType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDownloadAttachment(viewingDoc, e)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document Viewer Body */}
              <div className="p-4 overflow-y-auto max-h-[70vh] flex-1 bg-slate-50 dark:bg-slate-950/50">
                {viewingDoc.mimeType.includes('pdf') ? (
                  <iframe
                    src={viewingDoc.url || viewingDoc.data || viewingDoc.previewUrl}
                    title={viewingDoc.name}
                    className="w-full h-[60vh] rounded-2xl border border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words max-h-[55vh] overflow-y-auto">
                    {viewingDoc.data && viewingDoc.data.includes('base64,')
                      ? (() => {
                        try {
                          return atob(viewingDoc.data!.split('base64,')[1]);
                        } catch {
                          return 'Không thể giải mã nội dung văn bản.';
                        }
                      })()
                      : viewingDoc.data || viewingDoc.url}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 5. Full Video Player Modal via Portal */}
      {zoomedVideo &&
        createPortal(
          <div
            onClick={() => setZoomedVideo(null)}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-white/15 flex flex-col text-white"
            >
              <div className="px-5 py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-sm truncate">{zoomedVideo.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(zoomedVideo.size)} • Video đính kèm
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDownloadAttachment(zoomedVideo, e)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Tải video về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tải về</span>
                  </button>

                  <button
                    onClick={() => setZoomedVideo(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex items-center justify-center bg-black/60 min-h-[300px] max-h-[70vh]">
                <video
                  src={zoomedVideo.url || zoomedVideo.data || zoomedVideo.previewUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[65vh] max-w-full rounded-2xl shadow-2xl bg-black border border-white/10"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
