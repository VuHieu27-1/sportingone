import { apiClient, ApiResponse } from './apiClient';
import { tokenManager } from '../utils/tokenManager';

export interface BackendYardImage {
  id: number;
  imageUrl: string;
  isCover: boolean;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
  yard?: {
    id: number;
    yardName?: string;
  };
}

export const imagesYardService = {
  /**
   * Retrieves all images for a specific sports yard.
   */
  async getYardImages(yardId: number | string): Promise<ApiResponse<BackendYardImage[]>> {
    try {
      const res = await apiClient.get<BackendYardImage[]>(`/images-yard/yard/${yardId}`);
      return res;
    } catch {
      return {
        success: false,
        message: 'Không thể tải danh sách ảnh của sân',
        data: [],
      };
    }
  },

  /**
   * Uploads an image file to Google Drive and registers it for the yard.
   */
  async uploadYardImage(
    file: File,
    yardId: number | string,
    isCover: boolean = false,
    caption?: string,
  ): Promise<ApiResponse<BackendYardImage>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('yardId', String(yardId));
      formData.append('isCover', String(isCover));
      if (caption) {
        formData.append('caption', caption);
      }

      const token = tokenManager.getActiveToken();
      const baseUrl = apiClient.getBaseUrl();
      const uploadUrl = `${baseUrl}/images-yard/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: json?.message || 'Không thể tải ảnh lên máy chủ',
        };
      }

      return {
        success: true,
        message: 'Tải ảnh sân lên Google Drive thành công!',
        data: json?.data || json,
      };
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối khi tải ảnh sân lên máy chủ',
      };
    }
  },

  /**
   * Updates an existing yard image (e.g. set as cover or edit caption).
   */
  async updateYardImage(
    id: number | string,
    payload: { isCover?: boolean; caption?: string },
  ): Promise<ApiResponse<BackendYardImage>> {
    try {
      const res = await apiClient.patch<BackendYardImage>(`/images-yard/${id}`, payload);
      return res;
    } catch {
      return {
        success: false,
        message: 'Không thể cập nhật thông tin ảnh sân',
      };
    }
  },

  /**
   * Deletes a yard image from database and Google Drive.
   */
  async deleteYardImage(id: number | string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(`/images-yard/${id}`);
      return res;
    } catch {
      return {
        success: false,
        message: 'Không thể xóa ảnh sân',
      };
    }
  },
};
