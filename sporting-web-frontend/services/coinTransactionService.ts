import { apiClient, ApiResponse } from './apiClient';

export interface CoinTransactionData {
  id: number;
  userId: number;
  user?: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
  type: 'deposit' | 'withdraw' | 'payment' | 'refund';
  amount: number;
  balanceAfter: number | null;
  transactionCode: string | null;
  description: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepositResponse {
  orderCode: number;
  checkoutUrl: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  bin?: string;
  coinTransaction: CoinTransactionData;
}

export interface BankQrData {
  qrUrl: string;
  quickLink: string;
  bankName: string;
  bankNumber: string;
  bankAccountName: string;
  amount: number;
  addInfo: string;
  template?: string;
  userId: number;
  transactionId?: number | null;
}

export const coinTransactionService = {
  /**
   * Creates a PayOS deposit transaction for recharging wallet coins.
   */
  async createDeposit(amount: number): Promise<ApiResponse<CreateDepositResponse>> {
    return apiClient.post<CreateDepositResponse>('/coin-transactions/create-deposit', {
      amount,
    });
  },

  /**
   * Synchronizes transaction status with PayOS payment gateway.
   */
  async syncDepositStatus(orderCode: string | number): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/coin-transactions/sync-deposit/${orderCode}`, {});
  },

  /**
   * Cancels a pending coin deposit transaction.
   */
  async cancelDeposit(orderCode: string | number): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/coin-transactions/cancel-deposit/${orderCode}`, {});
  },

  /**
   * Retrieves coin transaction history for the logged-in user.
   */
  async getMyTransactions(): Promise<ApiResponse<CoinTransactionData[]>> {
    return apiClient.get<CoinTransactionData[]>('/coin-transactions/my');
  },

  async requestWithdraw(dto: {
    amount: number;
    bankName: string;
    bankNumber: string;
    bankAccountName: string;
  }): Promise<ApiResponse<CoinTransactionData>> {
    return apiClient.post<CoinTransactionData>('/coin-transactions/request-withdraw', dto);
  },

  /**
   * Retrieves pending withdrawal or refund requests for admin approval.
   */
  async getAdminApprovals(): Promise<ApiResponse<CoinTransactionData[]>> {
    return apiClient.get<CoinTransactionData[]>('/coin-transactions/admin/approvals');
  },

  /**
   * Approves a withdrawal or refund request as an administrator.
   */
  async approveTransaction(id: number): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/coin-transactions/admin/approve/${id}`, {});
  },

  /**
   * Rejects a withdrawal or refund request as an administrator.
   */
  async rejectTransaction(id: number, reason?: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/coin-transactions/admin/reject/${id}`, { reason });
  },

  /**
   * Generates bank transfer QR code for withdraw transaction.
   */
  async getBankQrByTransactionId(transactionId: number): Promise<ApiResponse<BankQrData>> {
    return apiClient.get<BankQrData>(`/qr/bank?transactionId=${transactionId}`);
  },
};
