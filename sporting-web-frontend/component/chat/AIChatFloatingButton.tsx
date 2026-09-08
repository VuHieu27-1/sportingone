import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { AIChatboxModal } from './AIChatboxModal';

export const AIChatFloatingButton: React.FC = () => {
  // Retain open/closed state across F5 refreshes within the tab session
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('sporting_ai_chat_open') === 'true';
    } catch {
      return false;
    }
  });

  const [isAiStreaming, setIsAiStreaming] = useState<boolean>(false);

  const handleOpen = () => {
    setIsOpen(true);
    try {
      sessionStorage.setItem('sporting_ai_chat_open', 'true');
    } catch {}
  };

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('sporting_ai_chat_open', 'false');
    } catch {}
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => (isOpen ? handleClose() : handleOpen())}
          className={`group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 cursor-pointer ${
            isAiStreaming && !isOpen ? 'ring-4 ring-emerald-400/50 shadow-emerald-500/50 scale-105' : ''
          }`}
          title="Trợ lý thể thao Sporting ONE AI"
        >
          {/* Subtle pulse animation when AI is processing in the background */}
          {isAiStreaming && !isOpen && (
            <span className="absolute -inset-1 rounded-full bg-emerald-400/50 animate-ping pointer-events-none" />
          )}

          <div className="relative">
            <Bot className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform ${isAiStreaming && !isOpen ? 'animate-pulse' : 'group-hover:scale-110'}`} />
            <Sparkles className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 absolute -top-1 -right-1 ${isAiStreaming ? 'animate-spin' : 'animate-pulse'}`} />
          </div>

          {/* If streaming while closed: show active status badge */}
          {isAiStreaming && !isOpen ? (
            <div className="hidden sm:flex absolute right-full mr-3 px-3.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-emerald-300 text-xs font-semibold rounded-2xl shadow-xl border border-emerald-500/40 items-center gap-2 whitespace-nowrap animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sporting ONE AI đang trả lời...</span>
            </div>
          ) : (
            /* Tooltip hint on hover - desktop only to prevent mobile horizontal overflow */
            <span className="hidden sm:block absolute right-full mr-3 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-md">
              Hỏi Sporting ONE AI ✨
            </span>
          )}
        </button>
      </div>

      <AIChatboxModal
        isOpen={isOpen}
        onOpen={handleOpen}
        onClose={handleClose}
        onStreamingChange={setIsAiStreaming}
      />
    </>
  );
};
