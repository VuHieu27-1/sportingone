import { SearchBookingParams, CourtVenue } from '../types/booking';
import { apiClient, ApiResponse } from './apiClient';

export interface BackendBooking {
  id: number;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  bookingType?: string;
  itemType?: 'hourly' | 'monthly';
  status: 'unpaid' | 'paid' | 'cancelled' | 'refund' | 'refunded' | string;
  priced?: number;
  createdAt: string;
  sig?: string;
  verifyUrl?: string;
  yard?: {
    id: number;
    yardName: string;
    price: number;
    status: string;
    sportType?: {
      id: number;
      sportName: string;
    };
    typeYard?: {
      id: number;
      typeName: string;
    };
    vendor?: {
      id: number;
      vendorName: string;
      vendorAddress: string;
      vendorPhone: string;
    };
  };
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface BackendBookingsMonth {
  id: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  bookingType: string;
  status: 'unpaid' | 'paid' | 'cancelled' | 'refund' | 'refunded' | string;
  priced?: number;
  createdAt: string;
  sig?: string;
  verifyUrl?: string;
  yard?: {
    id: number;
    yardName: string;
    price: number;
    status: string;
    sportType?: {
      id: number;
      sportName: string;
    };
    typeYard?: {
      id: number;
      typeName: string;
    };
    vendor?: {
      id: number;
      vendorName: string;
      vendorAddress: string;
      vendorPhone: string;
    };
  };
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface CreateBookingPayload {
  yardId: number;
  startTime: string;
  endTime: string;
  status?: 'unpaid' | 'paid' | 'cancelled';
  priced?: number;
}

export interface CreateBookingsMonthPayload {
  yardId: number;
  bookingType?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  priced?: number;
  status?: 'unpaid' | 'paid' | 'cancelled' | 'refund' | 'refunded';
}

export const bookingService = {
  /**
   * Executes search Courts operation.
   */
  async searchCourts(params: SearchBookingParams): Promise<ApiResponse<CourtVenue[]>> {
    const res = await apiClient.get<any[]>('/yards');
    if (res.success && Array.isArray(res.data)) {
      const venues: CourtVenue[] = res.data.map((yard: any) => ({
        id: String(yard.id),
        name: yard.yardName || yard.name || 'Sân thể thao Sporting',
        sport: yard.sportType?.typeName || (params.sportType !== 'ALL' ? params.sportType : 'FOOTBALL'),
        address: yard.vendor?.vendorAddress || yard.address || 'TP. Hồ Chí Minh',
        rating: Number(yard.rating || 5.0),
        reviewsCount: Number(yard.reviewsCount || 128),
        pricePerHour: Number(yard.price || 50000),
        imageUrl: yard.imageUrl || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
        isAvailableNow: yard.status === 'available' || yard.status === 'active',
        hasAiCamera: true,
      }));

      return {
        success: true,
        message: 'Successfully loaded court list!',
        data: venues,
      };
    }

    return {
      success: false,
      message: res.message || 'Failed to load court list from backend server.',
      data: [],
    };
  },

  // ==================== DAILY BOOKINGS (bảng bookings) ====================

  /**
   * Creates a new hourly court booking record (bảng bookings).
   */
  async createBooking(payload: CreateBookingPayload): Promise<ApiResponse<BackendBooking>> {
    const res = await apiClient.post<BackendBooking>('/bookings', {
      yardId: Number(payload.yardId),
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: payload.status || 'unpaid',
      priced: payload.priced,
    });
    return res;
  },

  async checkYardAvailability(
    yardId: number,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<{ isAvailable: boolean; conflictBookingId?: number; message?: string }>> {
    const res = await apiClient.get<{ isAvailable: boolean; conflictBookingId?: number; message?: string }>(
      `/bookings/check-availability?yardId=${yardId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
    );
    return res;
  },

  /**
   * Retrieves hourly bookings of the current user.
   */
  async fetchMyBookings(): Promise<ApiResponse<BackendBooking[]>> {
    const res = await apiClient.get<BackendBooking[]>('/bookings/my');
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully loaded user bookings list!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể tải danh sách đơn đặt sân.',
      data: [],
    };
  },

  /**
   * Retrieves bookings for a specific yard.
   */
  async fetchBookingsByYard(
    yardId: number,
    date?: string,
    status?: string
  ): Promise<ApiResponse<BackendBooking[]>> {
    let url = `/bookings?yardId=${yardId}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    const res = await apiClient.get<BackendBooking[]>(url);
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully fetched yard bookings!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể tải lịch đặt của sân.',
      data: [],
    };
  },

  /**
   * Retrieves all system hourly bookings, or filtered by vendorId.
   */
  async fetchAllBookings(vendorId?: number): Promise<ApiResponse<BackendBooking[]>> {
    const query = vendorId ? `?vendorId=${vendorId}` : '';
    const res = await apiClient.get<BackendBooking[]>(`/bookings${query}`);
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully fetched system bookings!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể tải danh sách lịch đặt sân.',
      data: [],
    };
  },

  async updateBookingStatus(
    id: number,
    status: 'unpaid' | 'paid' | 'cancelled'
  ): Promise<ApiResponse<BackendBooking>> {
    const res = await apiClient.patch<BackendBooking>(`/bookings/${id}`, { status });
    return res;
  },

  async cancelBooking(id: number): Promise<ApiResponse<BackendBooking>> {
    return this.updateBookingStatus(id, 'cancelled');
  },

  async processRefund(bookingId: number): Promise<ApiResponse<any>> {
    const res = await apiClient.post<any>(`/bookings/${bookingId}/process-refund`, {});
    return res;
  },

  async cancelPaidBooking(bookingId: number): Promise<ApiResponse<BackendBooking>> {
    const res = await apiClient.post<BackendBooking>(`/bookings/${bookingId}/cancel-paid`, {});
    return res;
  },

  async deleteBooking(id: number): Promise<ApiResponse<void>> {
    const res = await apiClient.delete<void>(`/bookings/${id}`);
    return res;
  },

  async payWithWallet(
    bookingIds: number[]
  ): Promise<ApiResponse<{ success: boolean; message: string; totalPaid?: number; remainingBalance?: number }>> {
    const res = await apiClient.post<{ success: boolean; message: string; totalPaid?: number; remainingBalance?: number }>(
      '/bookings/pay-with-wallet',
      { bookingIds }
    );
    return res;
  },

  async verifyQrCode(id: number | string, sig: string): Promise<ApiResponse<any>> {
    const res = await apiClient.get<any>(`/bookings/verify_qr_data?id=${id}&sig=${encodeURIComponent(sig)}`);
    return res;
  },

  // ==================== MONTHLY BOOKINGS (bảng bookings_month) ====================

  /**
   * Creates a new monthly package booking record (bảng bookings_month).
   */
  async createBookingsMonth(payload: CreateBookingsMonthPayload): Promise<ApiResponse<BackendBookingsMonth>> {
    const res = await apiClient.post<BackendBookingsMonth>('/bookings-month', {
      yardId: Number(payload.yardId),
      bookingType: payload.bookingType || 'month',
      startDate: payload.startDate,
      endDate: payload.endDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: payload.status || 'unpaid',
      priced: payload.priced,
    });
    return res;
  },

  /**
   * Checks yard availability for a monthly package booking.
   */
  async checkYardMonthAvailability(
    yardId: number,
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<{ isAvailable: boolean; message?: string }>> {
    const url = `/bookings-month/check-availability?yardId=${yardId}&startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&startTime=${encodeURIComponent(
      startTime
    )}&endTime=${encodeURIComponent(endTime)}`;
    const res = await apiClient.get<{ isAvailable: boolean; message?: string }>(url);
    return res;
  },

  /**
   * Retrieves monthly bookings of the current user.
   */
  async fetchMyBookingsMonth(): Promise<ApiResponse<BackendBookingsMonth[]>> {
    const res = await apiClient.get<BackendBookingsMonth[]>('/bookings-month/my');
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully loaded user monthly bookings!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể tải danh sách gói đặt sân theo tháng.',
      data: [],
    };
  },

  /**
   * Retrieves all system monthly bookings.
   */
  async fetchAllBookingsMonth(params?: {
    yardId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<ApiResponse<BackendBookingsMonth[]>> {
    let url = '/bookings-month?';
    if (params?.yardId) url += `yardId=${params.yardId}&`;
    if (params?.startDate) url += `startDate=${encodeURIComponent(params.startDate)}&`;
    if (params?.endDate) url += `endDate=${encodeURIComponent(params.endDate)}&`;
    if (params?.status) url += `status=${encodeURIComponent(params.status)}&`;

    const res = await apiClient.get<BackendBookingsMonth[]>(url);
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully fetched monthly bookings!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể tải danh sách gói đặt theo tháng.',
      data: [],
    };
  },

  /**
   * Pays monthly bookings using wallet Xu balance.
   */
  async payBookingsMonthWithWallet(
    bookingMonthIds: number[]
  ): Promise<ApiResponse<{ success: boolean; message: string; totalPaid?: number; remainingBalance?: number }>> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      totalPaid?: number;
      remainingBalance?: number;
    }>('/bookings-month/pay-with-wallet', { bookingMonthIds });
    return res;
  },

  /**
   * Cancels a paid monthly booking and requests auto refund.
   */
  async cancelPaidBookingsMonth(id: number): Promise<ApiResponse<BackendBookingsMonth>> {
    const res = await apiClient.post<BackendBookingsMonth>(`/bookings-month/${id}/cancel-paid`, {});
    return res;
  },

  /**
   * Deletes an unpaid monthly booking.
   */
  async deleteBookingsMonth(id: number): Promise<ApiResponse<void>> {
    const res = await apiClient.delete<void>(`/bookings-month/${id}`);
    return res;
  },

  /**
   * Processes refund for a monthly booking in refund status.
   */
  async processRefundMonth(id: number): Promise<ApiResponse<any>> {
    const res = await apiClient.post<any>(`/bookings-month/${id}/process-refund`, {});
    return res;
  },

  /**
   * Verifies QR code for monthly bookings.
   */
  async verifyQrCodeMonth(id: number | string, sig: string): Promise<ApiResponse<any>> {
    const res = await apiClient.get<any>(`/bookings-month/verify_qr_data?id=${id}&sig=${encodeURIComponent(sig)}`);
    return res;
  },
};
