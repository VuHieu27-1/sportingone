import { apiClient, ApiResponse } from './apiClient';

export interface PayOSCreatePaymentData {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

export interface PayOSPaymentLinkInfo {
  accountName: string;
  accountNumber: string;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  bin: string;
  checkoutUrl: string;
  currency: string;
  description: string;
  orderCode: number;
  paymentLinkId: string;
  qrCode: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | string;
  transactions?: any[];
}

export interface PayOSInfoData {
  paymentInfo: PayOSPaymentLinkInfo;
  status: 'paid' | 'cancelled' | 'pending';
}

export interface CreatePayOSPaymentPayload {
  bookingId?: number;
  bookingIds?: number[];
  returnUrl?: string;
  cancelUrl?: string;
}

export const payosService = {

  /**
   * Generates a PayOS checkout payment link.
   */
  async createPaymentLink(payload: CreatePayOSPaymentPayload): Promise<ApiResponse<PayOSCreatePaymentData>> {
    return apiClient.post<PayOSCreatePaymentData>('/payment/create-payment', payload);
  },

  /**
   * Fetches payment transaction status from PayOS API.
   */
  async getPaymentInfo(orderCode: number): Promise<ApiResponse<PayOSInfoData>> {
    return apiClient.get<PayOSInfoData>(`/payment/payment-info/${orderCode}`);
  },

  async updatePaymentStatus(
    orderCode: number,
    bookingId?: number,
    bookingIds?: number[],
  ): Promise<ApiResponse<{ bookingId: number; status: string; payOSInfo: PayOSPaymentLinkInfo }>> {
    return apiClient.post('/payment/update-status', { orderCode, bookingId, bookingIds });
  },

  /**
   * Cancels an active PayOS payment link.
   */
  async cancelPaymentLink(orderCode: number, cancellationReason?: string): Promise<ApiResponse<any>> {
    return apiClient.post('/payment/cancel-payment', { orderCode, cancellationReason });
  },
};
