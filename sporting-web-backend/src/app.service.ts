import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeolocationService } from './common/geolocation/geolocation.service';
import { fetchVietnamTimeFromApi } from './common/utils/time.util';
import { WalletsService } from './module/wallets/wallets.service';
import { BanksApiService } from './common/banks/banks.service';
import { GenerateQrDto } from './common/banks/dto/generate-qr.dto';
import {
  CoinTransaction,
  CoinTransactionType,
} from './module/coin_transactions/entities/coin_transaction.entity';

@Injectable()
export class AppService {
  constructor(
    private readonly geolocationService: GeolocationService,
    private readonly walletsService: WalletsService,
    private readonly banksApiService: BanksApiService,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
  ) { }

  /**
   * Retrieves Hello information.
   */
  getHello(): string {
    return 'Hello World!';
  }

  async getTime() {
    const timeData = await fetchVietnamTimeFromApi();
    return {
      success: true,
      message: 'Lấy thời gian từ TimeAPI thành công',
      data: timeData,
    };
  }

  async getDeviceLocation(
    req: any,
    queryIp?: string,
    lat?: string,
    lng?: string,
  ) {
    const clientIp =
      queryIp ||
      req.headers?.['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket?.remoteAddress ||
      req.ip;

    const latNum =
      lat !== undefined && lat !== '' ? parseFloat(lat) : undefined;
    const lngNum =
      lng !== undefined && lng !== '' ? parseFloat(lng) : undefined;

    const locationData = await this.geolocationService.getDeviceLocation(
      clientIp,
      latNum,
      lngNum,
    );
    return {
      success: true,
      message: 'Lấy vị trí thiết bị thành công',
      data: locationData,
    };
  }

  async generateBankQr(dto: GenerateQrDto) {
    let userId = dto.userId;
    let amount = dto.amount;
    let addInfo = dto.addInfo;
    let walletBankName: string | null = null;
    let walletBankNumber: string | null = null;
    let walletBankAccountName: string | null = null;

    if (dto.transactionId) {
      const coinTx = await this.coinTransactionRepository.findOne({
        where: {
          id: dto.transactionId,
          type: CoinTransactionType.WITHDRAW,
        },
        relations: {
          user: {
            wallet: true,
          },
        },
      });

      if (!coinTx) {
        throw new NotFoundException(
          `Không tìm thấy yêu cầu rút tiền với mã #${dto.transactionId}`,
        );
      }

      userId = coinTx.userId;
      amount = Number(coinTx.amount);
      addInfo = `Rut xu #${coinTx.transactionCode || coinTx.id}`;

      const wallet = coinTx.user?.wallet;
      if (wallet) {
        walletBankName = wallet.bankName;
        walletBankNumber = wallet.bankNumber;
        walletBankAccountName = wallet.bankAccountName;
      }
    }

    if (!userId && !dto.transactionId) {
      throw new BadRequestException('Vui lòng cung cấp userId hoặc transactionId');
    }

    if (!walletBankName || !walletBankNumber || !walletBankAccountName) {
      const wallet = await this.walletsService.findOneByUserId(userId!);
      if (!wallet) {
        throw new NotFoundException(
          `Không tìm thấy ví cho người dùng có ID ${userId}`,
        );
      }
      walletBankName = wallet.bankName;
      walletBankNumber = wallet.bankNumber;
      walletBankAccountName = wallet.bankAccountName;
    }

    if (!walletBankName || !walletBankNumber || !walletBankAccountName) {
      throw new BadRequestException(
        'Ví của người dùng chưa thiết lập đầy đủ thông tin ngân hàng (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản)',
      );
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }

    if (!addInfo) {
      addInfo = `Thanh toan chuyen khoan User #${userId}`;
    }

    const qrResult = this.banksApiService.generateBankQr({
      bankName: walletBankName,
      bankNumber: walletBankNumber,
      bankAccountName: walletBankAccountName,
      amount,
      addInfo,
      template: dto.template,
    });

    return {
      success: true,
      message: 'Tạo mã QR chuyển khoản ngân hàng thành công',
      data: {
        ...qrResult,
        userId,
        transactionId: dto.transactionId || null,
      },
    };
  }
}
