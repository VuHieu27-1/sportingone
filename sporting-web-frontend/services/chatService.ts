import { apiClient, API_BASE_URL, ApiResponse } from './apiClient';
import { tokenManager } from '../utils/tokenManager';

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data?: string; // Base64 or Data URL
  url?: string; // Permanent Google Drive URL
  size?: number;
  previewUrl?: string;
  driveFileId?: string;
  webViewLink?: string;
}

export interface ChatMessageItem {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  durationMs?: number;
  createdAt?: string;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
}

export interface ConversationItem {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  serverReachable: boolean;
  message?: string;
}

export const chatService = {
  /**
   * Retrieves AI health status
   */
  async checkHealth(): Promise<ApiResponse<AIHealthStatus>> {
    return apiClient.get<AIHealthStatus>('/chat/health');
  },

  /**
   * Gets list of conversations
   */
  async getConversations(): Promise<ApiResponse<ConversationItem[]>> {
    return apiClient.get<ConversationItem[]>('/chat/conversations');
  },

  /**
   * Gets message history for a conversation
   */
  async getMessages(conversationId: number): Promise<ApiResponse<ChatMessageItem[]>> {
    return apiClient.get<ChatMessageItem[]>(`/chat/conversations/${conversationId}/messages`);
  },

  /**
   * Deletes a conversation
   */
  async deleteConversation(conversationId: number): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(`/chat/conversations/${conversationId}`);
  },

  /**
   * Non-streaming message send
   */
  async sendMessage(
    message: string,
    conversationId?: number,
    attachments?: ChatAttachment[],
  ): Promise<ApiResponse<{ conversationId: number; messageId: number; content: string; model: string }>> {
    const cleanAttachments = attachments?.map((a) => ({
      name: a.name,
      mimeType: a.mimeType,
      data: a.data,
      size: a.size,
    }));
    return apiClient.post('/chat', { message, conversationId, attachments: cleanAttachments });
  },

  /**
   * SSE Streaming message
   */
  async streamMessage(
    message: string,
    conversationId: number | undefined,
    attachments: ChatAttachment[] | undefined,
    callbacks: {
      onStart?: (convId?: number) => void;
      onChunk: (chunkText: string) => void;
      onDone: (finalData: { conversationId?: number; model?: string }) => void;
      onError: (errorMessage: string) => void;
    },
    abortSignal?: AbortSignal,
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = tokenManager.getActiveToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const cleanAttachments = attachments?.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        data: a.data,
        size: a.size,
      }));

      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, conversationId, stream: true, attachments: cleanAttachments }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errMsg = errorJson.message || `Lỗi máy chủ (${response.status})`;
        callbacks.onError(errMsg);
        return;
      }

      if (!response.body) {
        callbacks.onError('Không nhận được dữ liệu từ hệ thống AI.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let activeConvId = conversationId;
      let usedModel: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataContent = trimmed.replace(/^data:\s*/, '');
          if (dataContent === '[DONE]') {
            callbacks.onDone({ conversationId: activeConvId, model: usedModel });
            return;
          }

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.error) {
              callbacks.onError(parsed.message || 'Lỗi xử lý phản hồi từ AI.');
              return;
            }

            if (parsed.conversationId && !activeConvId) {
              activeConvId = parsed.conversationId;
              callbacks.onStart?.(activeConvId);
            }

            if (parsed.model) {
              usedModel = parsed.model;
            }

            if (parsed.content) {
              callbacks.onChunk(parsed.content);
            }
          } catch {
            // Partial JSON chunk, continue
          }
        }
      }

      callbacks.onDone({ conversationId: activeConvId, model: usedModel });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onDone({ conversationId });
        return;
      }
      callbacks.onError(err.message || 'Mất kết nối với hệ thống AI.');
    }
  },
};
