import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
  short_name: string;
  support: number;
  isTransfer: number;
  swift_code?: string;
}

@Injectable()
export class BanksApiService {
  private readonly vietqrUrl = 'https://api.vietqr.io/v2/banks';

  /**
   * Retrieves VietQRBanks information.
   */
  async getVietQRBanks(): Promise<VietQRBank[]> {
    try {
      const response = await fetch(this.vietqrUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch banks from VietQR API, status: ${response.status}`,
        );
      }
      const result = await response.json();
      if (result.code === '00' && Array.isArray(result.data)) {
        return result.data;
      }
      return result.data || [];
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Error fetching bank list from VietQR API',
      );
    }
  }

  /**
   * Generates VietQR bank transfer QR code URL from bank information, amount, and description.
   */
  generateBankQr(params: {
    bankName: string;
    bankNumber: string;
    bankAccountName: string;
    amount: number;
    addInfo: string;
    template?: string;
  }) {
    const template = params.template || 'compact2';
    const cleanBankName = params.bankName.trim();
    const cleanBankNumber = params.bankNumber.trim();
    const cleanAccountName = params.bankAccountName.trim();

    const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(
      cleanBankName,
    )}-${encodeURIComponent(cleanBankNumber)}-${template}.png?amount=${params.amount
      }&addInfo=${encodeURIComponent(params.addInfo)}&accountName=${encodeURIComponent(
        cleanAccountName,
      )}`;

    return {
      qrUrl,
      quickLink: qrUrl,
      bankName: cleanBankName,
      bankNumber: cleanBankNumber,
      bankAccountName: cleanAccountName,
      amount: params.amount,
      addInfo: params.addInfo,
      template,
    };
  }
}
