import { apiClient, ApiResponse } from './apiClient';

export type AiKeyStatus = 'active' | 'cooldown' | 'disabled' | 'error';
export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq';

export interface AiApiKeyItem {
  id: number;
  name: string;
  apiKey: string;
  provider: AiProvider;
  status: AiKeyStatus;
  priority: number;
  usageCount: number;
  errorCount: number;
  lastUsedAt?: string | null;
  lastExhaustedAt?: string | null;
  cooldownUntil?: string | null;
  lastErrorMessage?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiApiKeyPayload {
  name: string;
  apiKey: string;
  provider?: AiProvider;
  status?: AiKeyStatus;
  priority?: number;
  note?: string;
}

export interface UpdateAiApiKeyPayload {
  name?: string;
  apiKey?: string;
  provider?: AiProvider;
  status?: AiKeyStatus;
  priority?: number;
  note?: string;
}

export interface AiKeyMetrics {
  totalKeys: number;
  activeKeys: number;
  cooldownKeys: number;
  disabledKeys: number;
  totalUsage: number;
  totalErrors: number;
}

export interface TestKeyResult {
  valid: boolean;
  latencyMs?: number;
  model?: string;
  message: string;
  details?: any;
}

export const aiApiKeyService = {
  /**
   * Retrieves all AI API keys in the system
   */
  async getAllKeys(): Promise<AiApiKeyItem[]> {
    const res = await apiClient.get<AiApiKeyItem[]>('/ai-api-keys');
    if (!res.success) {
      throw new Error(res.message || 'Không thể tải danh sách AI API Key');
    }
    return Array.isArray(res.data) ? res.data : (res as any) || [];
  },

  /**
   * Retrieves overview metrics of the key pool
   */
  async getMetrics(): Promise<AiKeyMetrics> {
    const res = await apiClient.get<AiKeyMetrics>('/ai-api-keys/metrics');
    if (!res.success) {
      throw new Error(res.message || 'Không thể tải thống kê AI API Key');
    }
    return (
      res.data || {
        totalKeys: 0,
        activeKeys: 0,
        cooldownKeys: 0,
        disabledKeys: 0,
        totalUsage: 0,
        totalErrors: 0,
      }
    );
  },

  /**
   * Creates a new API Key in the pool
   */
  async createKey(payload: CreateAiApiKeyPayload): Promise<AiApiKeyItem> {
    const res = await apiClient.post<AiApiKeyItem>('/ai-api-keys', payload);
    if (!res.success) {
      throw new Error(res.message || 'Không thể tạo mới API Key');
    }
    return res.data!;
  },

  /**
   * Updates an existing API Key
   */
  async updateKey(id: number, payload: UpdateAiApiKeyPayload): Promise<AiApiKeyItem> {
    const res = await apiClient.patch<AiApiKeyItem>(`/ai-api-keys/${id}`, payload);
    if (!res.success) {
      throw new Error(res.message || 'Không thể cập nhật API Key');
    }
    return res.data!;
  },

  /**
   * Toggles active / disabled status of an API Key
   */
  async toggleKey(id: number): Promise<AiApiKeyItem> {
    const res = await apiClient.patch<AiApiKeyItem>(`/ai-api-keys/${id}/toggle`, {});
    if (!res.success) {
      throw new Error(res.message || 'Không thể thay đổi trạng thái API Key');
    }
    return res.data!;
  },

  /**
   * Deletes an API Key from the pool
   */
  async deleteKey(id: number): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/ai-api-keys/${id}`);
    if (!res.success) {
      throw new Error(res.message || 'Không thể xóa API Key');
    }
    return res.data || { success: true, message: 'Đã xóa API Key' };
  },

  /**
   * Live tests an API Key to check validity and connection latency
   */
  async testKey(apiKey: string, provider = 'gemini'): Promise<TestKeyResult> {
    const res = await apiClient.post<TestKeyResult>('/ai-api-keys/test', {
      apiKey,
      provider,
    });
    if (!res.success && !res.data) {
      throw new Error(res.message || 'Lỗi khi kiểm tra kết nối API Key');
    }
    return (
      res.data || {
        valid: false,
        message: res.message || 'Kiểm tra thất bại',
      }
    );
  },
};
