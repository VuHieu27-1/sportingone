import { apiClient, ApiResponse } from './apiClient';

export interface WalletData {
  id?: number;
  userId: number;
  bankName: string | null;
  bankNumber: string | null;
  bankAccountName: string | null;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveWalletBankInfoDto {
  bankName: string;
  bankNumber: string;
  bankAccountName: string;
}

export const walletService = {
  /**
   * Retrieves wallet details and balance for the authenticated user.
   */
  async getMyWallet(): Promise<ApiResponse<WalletData | null>> {
    return apiClient.get<WalletData | null>('/wallets/my');
  },

  /**
   * Updates bank account payout details for the user's wallet.
   */
  async saveMyBankInfo(dto: SaveWalletBankInfoDto): Promise<ApiResponse<WalletData>> {
    return apiClient.patch<WalletData>('/wallets/my', dto);
  },
};
