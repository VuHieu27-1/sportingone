import { apiClient, ApiResponse } from './apiClient';
import {
  YardRatesResponse,
  RateItem,
  CreateRatePayload,
  ReplyRatePayload,
  UpdateRatePayload,
} from '../types/rate';

export const rateService = {
  /**
   * Fetch all reviews and statistics for a specific yard.
   */
  async getRatesByYard(yardId: number | string): Promise<ApiResponse<YardRatesResponse>> {
    return apiClient.get<YardRatesResponse>(`/rates/yard/${yardId}`);
  },

  /**
   * Fetch all reviews and statistics across all yards of a vendor.
   */
  async getRatesByVendor(vendorId: number | string): Promise<ApiResponse<YardRatesResponse>> {
    return apiClient.get<YardRatesResponse>(`/rates/vendor/${vendorId}`);
  },

  /**
   * Fetch all reviews written by a specific user.
   */
  async getRatesByUser(userId: number | string): Promise<ApiResponse<RateItem[]>> {
    return apiClient.get<RateItem[]>(`/rates/user/${userId}`);
  },

  /**
   * Create a new review for a yard.
   */
  async createRate(payload: CreateRatePayload): Promise<ApiResponse<RateItem>> {
    return apiClient.post<RateItem>('/rates', payload);
  },

  /**
   * Reply to an existing review.
   */
  async replyRate(rateId: number | string, payload: ReplyRatePayload): Promise<ApiResponse<RateItem>> {
    return apiClient.post<RateItem>(`/rates/${rateId}/reply`, payload);
  },

  /**
   * Like / unlike / toggle helpful score for a review.
   */
  async likeRate(rateId: number | string, action?: 'like' | 'unlike' | 'toggle'): Promise<ApiResponse<RateItem>> {
    return apiClient.post<RateItem>(`/rates/${rateId}/like`, { action });
  },

  /**
   * Update an existing review.
   */
  async updateRate(rateId: number | string, payload: UpdateRatePayload): Promise<ApiResponse<RateItem>> {
    return apiClient.patch<RateItem>(`/rates/${rateId}`, payload);
  },

  /**
   * Delete a review (soft delete).
   */
  async deleteRate(rateId: number | string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/rates/${rateId}`);
  },

  /**
   * Upload rating image files to Google Drive rates-images folder.
   */
  async uploadRateImages(files: File[], rateId?: number | string): Promise<ApiResponse<{ urls: string[] }>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const endpoint = rateId ? `/rates/${rateId}/upload-images` : '/rates/upload';
    return apiClient.post<{ urls: string[] }>(endpoint, formData);
  },
};
