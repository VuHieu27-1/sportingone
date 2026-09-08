import React from 'react';
import { MessageSquare, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ConversationItem } from '../../services/chatService';

export interface ChatConversationListProps {
  conversations: ConversationItem[];
  activeConversationId?: number;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: number) => void;
  onCloseList: () => void;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onCloseList,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onCloseList}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Đoạn chat mới
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có lịch sử hội thoại nào
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20'
                    : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity cursor-pointer"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
