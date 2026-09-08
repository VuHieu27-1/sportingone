import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  X,
  History,
  Plus,
  Minimize2,
  Maximize2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  chatService,
  ChatMessageItem,
  ConversationItem,
  AIHealthStatus,
  ChatAttachment,
} from '../../services/chatService';
import { tokenManager } from '../../utils/tokenManager';
import { ChatBubble } from './ChatBubble';
import { ChatInputBar } from './ChatInputBar';
import { ChatConversationList } from './ChatConversationList';

export interface AIChatboxModalProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onStreamingChange?: (isStreaming: boolean) => void;
}

export const AIChatboxModal: React.FC<AIChatboxModalProps> = ({
  isOpen,
  onOpen,
  onClose,
  onStreamingChange,
}) => {
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeConvIdRef = useRef<number | undefined>(activeConversationId);
  const userScrolledUpRef = useRef(false);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const scrollToBottom = (force = false) => {
    if (force || !userScrolledUpRef.current) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    const isScrolledUp = distanceFromBottom > 80;
    userScrolledUpRef.current = isScrolledUp;
    setShowScrollBottomBtn(isScrolledUp);
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isStreaming]);

  //Check health and load conversations/messages once
  useEffect(() => {
    checkAIHealth();
    loadUserConversations(undefined, true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkAIHealth();
      loadUserConversations(undefined, false);
      setTimeout(() => scrollToBottom(true), 150);
    }
  }, [isOpen]);

  const checkAIHealth = async () => {
    try {
      const res = await chatService.checkHealth();
      if (res.success && res.data) {
        setHealthStatus(res.data);
      }
    } catch {
      setHealthStatus(null);
    }
  };

  /**
   * Fetches only the currently logged-in user's conversations from backend database.
   */
  const loadUserConversations = async (targetConvId?: number, reloadMessages = false) => {
    const token = tokenManager.getActiveToken();
    if (!token) {
      // Guest: no persistent database conversation history
      setConversations([]);
      return;
    }

    try {
      const res = await chatService.getConversations();
      if (res.success && res.data) {
        setConversations(res.data);

        if (reloadMessages && !isStreamingRef.current) {
          const chosenId = targetConvId !== undefined ? targetConvId : activeConvIdRef.current;
          const exists = chosenId ? res.data.find((c) => c.id === chosenId) : null;

          if (exists) {
            fetchConversationMessages(exists.id);
          } else if (res.data.length > 0 && !activeConvIdRef.current && messages.length === 0) {
            // Default to the latest conversation of this logged-in user
            const latestId = res.data[0].id;
            setActiveConversationId(latestId);
            activeConvIdRef.current = latestId;
            fetchConversationMessages(latestId);
          }
        }
      }
    } catch {
      setConversations([]);
    }
  };

  const fetchConversationMessages = async (convId: number) => {
    try {
      const res = await chatService.getMessages(convId);
      if (res.success && res.data) {
        setMessages(res.data);
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch {
      // Error loading messages
    }
  };

  const handleSelectConversation = async (convId: number) => {
    activeConvIdRef.current = convId;
    setActiveConversationId(convId);
    setShowHistory(false);
    setErrorMessage(null);
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    fetchConversationMessages(convId);
  };

  const handleNewChat = () => {
    activeConvIdRef.current = undefined;
    setActiveConversationId(undefined);
    setMessages([]);
    setShowHistory(false);
    setErrorMessage(null);
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
  };

  const handleDeleteConversation = async (convId: number) => {
    try {
      const res = await chatService.deleteConversation(convId);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          handleNewChat();
        }
      }
    } catch {
      // Error handling
    }
  };

  const handleSendMessage = async (
    text: string,
    attachments?: ChatAttachment[],
    baseMessages?: ChatMessageItem[],
  ) => {
    setErrorMessage(null);

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // Ignore
      }
      abortControllerRef.current = null;
    }

    const userMsg: ChatMessageItem = {
      role: 'user',
      content: text,
      attachments,
      createdAt: new Date().toISOString(),
    };

    const tempAssistantMsg: ChatMessageItem = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const currentList = baseMessages !== undefined ? baseMessages : prev;
      const sanitized = currentList.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m));
      return [...sanitized, userMsg, tempAssistantMsg];
    });
    setIsStreaming(true);
    onStreamingChange?.(true);

    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom(true), 50);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedContent = '';
    const currentTargetConvId = activeConvIdRef.current;

    await chatService.streamMessage(
      text,
      currentTargetConvId,
      attachments,
      {
        onStart: (convId) => {
          if (convId) {
            activeConvIdRef.current = convId;
            setActiveConversationId(convId);
            loadUserConversations(convId, false);
          }
        },
        onChunk: (chunk) => {
          accumulatedContent += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: accumulatedContent,
                isStreaming: true,
              };
            }
            return updated;
          });
        },
        onDone: (finalData) => {
          setIsStreaming(false);
          onStreamingChange?.(false);
          abortControllerRef.current = null;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: accumulatedContent || 'Đã hoàn tất.',
                model: finalData.model,
                isStreaming: false,
              };
            }
            return updated;
          });

          if (finalData.conversationId) {
            activeConvIdRef.current = finalData.conversationId;
            setActiveConversationId(finalData.conversationId);
          }
          loadUserConversations(finalData.conversationId, false);

          onOpen?.();
          toast.success('Sporting ONE AI đã hoàn tất câu trả lời!', {
            id: 'ai-done-toast',
            duration: 3500,
          });
          setTimeout(() => scrollToBottom(true), 150);
        },
        onError: (errText) => {
          setIsStreaming(false);
          onStreamingChange?.(false);
          abortControllerRef.current = null;
          setErrorMessage(errText);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && !updated[lastIdx].content) {
              return updated.slice(0, -1);
            }
            return updated;
          });

          // Auto pop-up chat box to notify error if closed
          onOpen?.();
        },
      },
      controller.signal,
    );
  };

  const handleEditMessage = (msgIndex: number, newText: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const targetMsg = messages[msgIndex];
    const truncated = messages.slice(0, msgIndex);
    handleSendMessage(newText, targetMsg?.attachments, truncated);
  };

  const handleRetryMessage = (msgIndex: number) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    let userMsgIdx = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIdx = i;
        break;
      }
    }

    if (userMsgIdx !== -1) {
      const userMsg = messages[userMsgIdx];
      const truncated = messages.slice(0, userMsgIdx);
      handleSendMessage(userMsg.content, userMsg.attachments, truncated);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    onStreamingChange?.(false);
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
        updated[lastIdx] = {
          ...updated[lastIdx],
          isStreaming: false,
        };
      }
      return updated;
    });
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed z-50 transition-all duration-300 ease-out ${isOpen
        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        } ${isExpanded
          ? 'inset-2 sm:inset-6 md:inset-10'
          : 'inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[440px] h-[82vh] sm:h-[620px] max-h-[85vh]'
        }`}
      style={{
        visibility: isOpen ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div className="w-full h-full rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-emerald-800 ${healthStatus?.status === 'healthy'
                  ? 'bg-emerald-400'
                  : healthStatus?.status === 'degraded'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                  }`}
                title={
                  healthStatus?.status === 'healthy'
                    ? 'AI Model sẵn sàng'
                    : healthStatus?.status === 'degraded'
                      ? 'AI Model Fallback'
                      : 'AI đang ngoại tuyến'
                }
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-none">Sporting ONE AI</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-medium leading-none">
                  AI Assistant
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-1 leading-none">
                Trợ lý thể thao & đặt sân thông minh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showHistory ? 'bg-white/20 text-white' : 'text-emerald-100 hover:bg-white/10'
                }`}
              title="Lịch sử đoạn chat"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
              title="Đoạn chat mới"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors hidden sm:flex cursor-pointer"
              title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: History Sidebar & Chat Messages Stream */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-50/50 dark:bg-slate-900/50">
          {/* Conversation History Drawer */}
          {showHistory && (
            <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 overflow-y-auto animate-in slide-in-from-left duration-200">
              <ChatConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                onCloseList={() => setShowHistory(false)}
              />
            </div>
          )}

          {/* Messages Stream View */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 flex flex-col h-full overflow-y-auto px-4 py-3 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="my-auto text-center px-4 py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Xin chào 👋 Tôi là Sporting ONE AI!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Tôi có thể giúp bạn tìm sân, kiểm tra lịch trống, xem giá và hướng dẫn đặt sân nhanh chóng.
                  </p>
                </div>

                {/* Suggestion Question Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto pt-2 text-left">
                  {[
                    { icon: '💳', title: 'Nạp tiền ví', desc: 'Nạp tiền vào ví Sporting ONE' },
                    { icon: '🔄', title: 'Đặt lại sân', desc: 'Xem lịch sử và đặt lại sân đã chơi' },
                    { icon: '🏪', title: 'Đăng ký Vendor', desc: 'Hướng dẫn đăng ký đối tác cụm sân' },
                    { icon: '👤', title: 'Hồ sơ & Địa chỉ', desc: 'Chỉnh sửa thông tin cá nhân và địa chỉ' },
                  ].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug.desc)}
                      className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{sug.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {sug.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">
                            {sug.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatBubble
                  key={idx}
                  index={idx}
                  message={msg}
                  isLastAssistant={idx === messages.length - 1 && msg.role === 'assistant'}
                  onEdit={handleEditMessage}
                  onRetry={handleRetryMessage}
                  onNavigateAction={onClose}
                  isStreaming={isStreaming}
                />
              ))
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="my-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-300 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottomBtn && (
            <button
              onClick={() => {
                userScrolledUpRef.current = false;
                setShowScrollBottomBtn(false);
                scrollToBottom(true);
              }}
              className="absolute bottom-3 right-4 z-30 p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border border-white/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer animate-fadeIn"
              title="Cuộn xuống tin nhắn mới nhất"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Input Bar */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
};
