import { apiClient, ApiResponse } from './apiClient';
import { UserAddress } from '../types/user';
import { tokenManager } from '../utils/tokenManager';

export const userAddressService = {
  async getMyAddresses(): Promise<ApiResponse<UserAddress[]>> {
    const token = tokenManager.getActiveToken();
    if (!token) {
      return { success: false, message: 'Chưa đăng nhập.' };
    }
    try {
      const res = await apiClient.get<UserAddress[]>('/user_address');
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          message: 'Tải danh sách địa chỉ thành công.',
          data: res.data,
        };
      }
      return {
        success: false,
        message: res.message || 'Không thể lấy danh sách địa chỉ.',
        data: [],
      };
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối API địa chỉ người dùng.',
        data: [],
      };
    }
  },

  async createAddress(data: {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    isDefault?: boolean;
  }): Promise<ApiResponse<UserAddress>> {
    try {
      const res = await apiClient.post<UserAddress>('/user_address', data);
      return res;
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối máy chủ khi tạo địa chỉ.',
      };
    }
  },

  async updateAddress(
    id: number,
    data: {
      address?: string;
      latitude?: number | null;
      longitude?: number | null;
      isDefault?: boolean;
    },
  ): Promise<ApiResponse<UserAddress>> {
    try {
      const res = await apiClient.patch<UserAddress>(`/user_address/${id}`, data);
      return res;
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối máy chủ khi cập nhật địa chỉ.',
      };
    }
  },

  async setDefaultAddress(id: number): Promise<ApiResponse<UserAddress>> {
    try {
      const res = await apiClient.patch<UserAddress>(`/user_address/${id}/default`, {});
      return res;
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối máy chủ khi thiết lập địa chỉ mặc định.',
      };
    }
  },

  async deleteAddress(id: number): Promise<ApiResponse<any>> {
    try {
      const res = await apiClient.delete<any>(`/user_address/${id}`);
      return res;
    } catch {
      return {
        success: false,
        message: 'Lỗi kết nối máy chủ khi xóa địa chỉ.',
      };
    }
  },
};
