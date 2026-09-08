import { apiClient, ApiResponse } from './apiClient';
import {
  AdminUser,
  AdminVendor,
  AdminYard,
  CreateAdminUserDTO,
  UpdateAdminUserDTO,
  CreateVendorDTO,
  UpdateVendorDTO,
  CreateYardDTO,
  UpdateYardDTO,
} from '../types/admin';

export type { AdminUser, AdminVendor, AdminYard };

export interface SportTypeItem {
  id: number;
  sportName: string;
}

export interface TypeYardItem {
  id: number;
  typeName: string;
}

export const getUserRoleName = (user: AdminUser): string => {
  if (typeof user.role === 'object' && user.role !== null) {
    return (user.role.roleName || '').toLowerCase();
  }
  if (typeof user.role === 'string') {
    return user.role.toLowerCase();
  }
  return 'user';
};

export const getUserRoleLabel = (user: AdminUser): string => {
  const roleName = getUserRoleName(user);
  if (roleName === 'admin') return 'Admin';
  if (roleName === 'vendor') return 'Vendor';
  return 'User';
};

export const adminService = {
  /**
   * Retrieves AllUsers information.
   */
  async getAllUsers(): Promise<AdminUser[]> {
    try {
      const res = await apiClient.get<AdminUser[]>('/users');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Creates or saves User.
   */
  async createUser(payload: CreateAdminUserDTO): Promise<ApiResponse<AdminUser>> {
    return apiClient.post<AdminUser>('/users', payload);
  },

  /**
   * Updates user profile information.
   */
  async updateUser(id: number, payload: UpdateAdminUserDTO): Promise<ApiResponse<AdminUser>> {
    return apiClient.patch<AdminUser>(`/users/${id}`, payload);
  },

  /**
   * Deletes or deactivates a user account.
   */
  async deleteUser(id: number): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/users/${id}`);
  },

  /**
   * Retrieves AllVendors information.
   */
  async getAllVendors(status?: string): Promise<AdminVendor[]> {
    try {
      const url = status ? `/vendors?status=${status}` : '/vendors';
      const res = await apiClient.get<AdminVendor[]>(url);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Registers a new vendor account or facility.
   */
  async createVendor(payload: CreateVendorDTO): Promise<ApiResponse<AdminVendor>> {
    return apiClient.post<AdminVendor>('/vendors', payload);
  },

  /**
   * Updates vendor information.
   */
  async updateVendor(id: number, payload: UpdateVendorDTO): Promise<ApiResponse<AdminVendor>> {
    return apiClient.patch<AdminVendor>(`/vendors/${id}`, payload);
  },

  /**
   * Removes a vendor record.
   */
  async deleteVendor(id: number): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/vendors/${id}`);
  },

  /**
   * Dedicated API call for Admin to paginate Vendors using SQL LIMIT & OFFSET
   */
  async getAdminVendorsPaginated(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ data: AdminVendor[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.status && params.status !== 'ALL') queryParams.set('status', params.status);
      if (params?.search) queryParams.set('search', params.search);

      const url = `/vendors/query?${queryParams.toString()}`;
      const res = await apiClient.get<any>(url);

      if (res.success && res.data) {
        return {
          data: Array.isArray(res.data.data) ? res.data.data : [],
          total: res.data.total || 0,
          page: res.data.page || 1,
          limit: res.data.limit || 8,
          totalPages: res.data.totalPages || 1,
        };
      }
      return { data: [], total: 0, page: 1, limit: 8, totalPages: 1 };
    } catch {
      return { data: [], total: 0, page: 1, limit: 8, totalPages: 1 };
    }
  },

  /**
   * Retrieves AllYards information.
   */
  async getAllYards(): Promise<AdminYard[]> {
    try {
      const res = await apiClient.get<AdminYard[]>('/yards');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  async getAdminVendorYardsPaginated(params?: {
    page?: number;
    limit?: number;
    vendorId?: number;
    search?: string;
  }): Promise<{ data: AdminYard[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.vendorId) queryParams.set('vendorId', String(params.vendorId));
      if (params?.search) queryParams.set('search', params.search);

      const url = `/yards/query?${queryParams.toString()}`;
      const res = await apiClient.get<any>(url);

      if (res.success && res.data) {
        return {
          data: Array.isArray(res.data.data) ? res.data.data : [],
          total: res.data.total || 0,
          page: res.data.page || 1,
          limit: res.data.limit || 8,
          totalPages: res.data.totalPages || 1,
        };
      }
      return { data: [], total: 0, page: 1, limit: 8, totalPages: 1 };
    } catch {
      return { data: [], total: 0, page: 1, limit: 8, totalPages: 1 };
    }
  },

  /**
   * Retrieves sports courts belonging to a specific vendor.
   */
  async getYardsByVendor(vendorId: number): Promise<AdminYard[]> {
    try {
      const res = await apiClient.get<AdminYard[]>(`/yards/vendors/${vendorId}`);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Adds a new sports court under a vendor.
   */
  async createYard(data: CreateYardDTO): Promise<ApiResponse<AdminYard>> {
    const priceVal = Number(data.price ?? data.pricePerHour ?? 100000);
    const payload: any = {
      yardName: data.yardName,
      price: priceVal,
    };
    if (data.peakHourPrice !== undefined && data.peakHourPrice !== null && (data.peakHourPrice as any) !== '') {
      payload.peakHourPrice = Number(data.peakHourPrice);
    }
    if (data.vendorId) payload.vendorId = Number(data.vendorId);
    if (data.sportTypeId) payload.sportTypeId = Number(data.sportTypeId);
    if (data.typeYardId) payload.typeYardId = Number(data.typeYardId);

    return apiClient.post<AdminYard>('/yards', payload);
  },

  /**
   * Updates sports court information.
   */
  async updateYard(id: number, data: UpdateYardDTO): Promise<ApiResponse<AdminYard>> {
    const payload: any = {};
    if (data.yardName !== undefined) payload.yardName = data.yardName;
    if (data.price !== undefined || data.pricePerHour !== undefined) {
      payload.price = Number(data.price ?? data.pricePerHour ?? 100000);
    }
    if (data.peakHourPrice !== undefined && data.peakHourPrice !== null && (data.peakHourPrice as any) !== '') {
      payload.peakHourPrice = Number(data.peakHourPrice);
    }
    if (data.vendorId) payload.vendorId = Number(data.vendorId);
    if (data.sportTypeId) payload.sportTypeId = Number(data.sportTypeId);
    if (data.typeYardId) payload.typeYardId = Number(data.typeYardId);

    return apiClient.patch<AdminYard>(`/yards/${id}`, payload);
  },

  /**
   * Deletes a sports court from the system.
   */
  async deleteYard(id: number): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/yards/${id}`);
  },

  /**
   * Restores a soft-deleted user account.
   */
  async restoreUser(id: number): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/users/${id}/restore`, {});
  },

  /**
   * Restores a soft-deleted vendor facility.
   */
  async restoreVendor(id: number): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/vendors/${id}/restore`, {});
  },

  /**
   * Restores a soft-deleted yard court.
   */
  async restoreYard(id: number): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/yards/${id}/restore`, {});
  },

  /**
   * Restores a soft-deleted booking.
   */
  async restoreBooking(id: number): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/bookings/${id}/restore`, {});
  },

  /**
   * Retrieves AllSportTypes information.
   */
  async getAllSportTypes(): Promise<SportTypeItem[]> {
    try {
      const res = await apiClient.get<SportTypeItem[]>('/sport-types');
      if (res.success && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Creates or saves SportType.
   */
  async createSportType(sportName: string): Promise<ApiResponse<SportTypeItem>> {
    return apiClient.post<SportTypeItem>('/sport-types', { sportName });
  },

  /**
   * Retrieves AllTypeYards information.
   */
  async getAllTypeYards(): Promise<TypeYardItem[]> {
    try {
      const res = await apiClient.get<TypeYardItem[]>('/types');
      if (res.success && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Creates or saves TypeYard.
   */
  async createTypeYard(typeName: string, sportTypeId?: number): Promise<ApiResponse<TypeYardItem>> {
    return apiClient.post<TypeYardItem>('/types', { typeName, sportTypeId: sportTypeId || null });
  },
};
