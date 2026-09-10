import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  CoinTransaction,
  CoinTransactionType,
  CoinTransactionStatus,
} from './entities/coin_transaction.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateCoinTransactionDto } from './dto/create-coin_transaction.dto';
import { UpdateCoinTransactionDto } from './dto/update-coin_transaction.dto';
import { CreateCoinDepositDto } from './dto/create-coin-deposit.dto';
import { RequestWithdrawDto } from './dto/request-withdraw.dto';
import { RejectTransactionDto } from './dto/reject-transaction.dto';
import { PayOSService } from '../../common/payos/payos.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CoinTransactionsService {
  constructor(
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly payOSService: PayOSService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Creates a PayOS deposit transaction for recharging wallet coins.
   */
  async createDeposit(userId: number, dto: CreateCoinDepositDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { wallet: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const wallet = user.wallet;
    if (!wallet || !wallet.bankName || !wallet.bankNumber) {
      throw new BadRequestException(
        'Bạn cần liên kết tài khoản ngân hàng trước khi nạp xu. Vui lòng cập nhật thông tin ngân hàng trong ví của bạn.',
      );
    }

    if (!dto.amount || dto.amount < 10000) {
      throw new BadRequestException('Số tiền nạp tối thiểu là 10.000 VNĐ (10.000 Xu)');
    }

    const oldPendingTxs = await this.coinTransactionRepository.find({
      where: {
        userId,
        type: CoinTransactionType.DEPOSIT,
        status: CoinTransactionStatus.PENDING,
      },
    });

    for (const tx of oldPendingTxs) {
      tx.status = CoinTransactionStatus.CANCELLED;
      await this.coinTransactionRepository.save(tx);
    }

    const timestampStr = Date.now().toString().slice(-9);
    const randomDigits = Math.floor(100 + Math.random() * 900).toString();
    const orderCode = Number(`${timestampStr}${randomDigits}`);

    const coinTransaction = this.coinTransactionRepository.create({
      userId,
      type: CoinTransactionType.DEPOSIT,
      amount: dto.amount,
      transactionCode: String(orderCode),
      description: `Nạp ${dto.amount.toLocaleString('vi-VN')} Xu qua VietQR`,
      status: CoinTransactionStatus.PENDING,
      balanceAfter: null,
    });

    await this.coinTransactionRepository.save(coinTransaction);

    const appUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const returnUrl =
      dto.returnUrl ||
      `${appUrl}/profile?tab=wallet&orderCode=${orderCode}&status=success`;
    const cancelUrl =
      dto.cancelUrl ||
      `${appUrl}/profile?tab=wallet&orderCode=${orderCode}&status=cancel`;

    try {
      const payosResponse = await this.payOSService.createDepositPaymentLink({
        orderCode,
        amount: dto.amount,
        description: `Nap xu #${orderCode}`.slice(0, 25),
        returnUrl,
        cancelUrl,
        buyerName: user.username,
        buyerEmail: user.email || undefined,
      });

      return {
        success: true,
        message: 'Khởi tạo đơn nạp xu thành công',
        data: {
          orderCode,
          checkoutUrl: payosResponse.checkoutUrl,
          qrCode: payosResponse.qrCode,
          accountNumber: payosResponse.accountNumber,
          accountName: payosResponse.accountName,
          amount: payosResponse.amount || dto.amount,
          description: payosResponse.description || `Nap xu #${orderCode}`,
          bin: payosResponse.bin,
          coinTransaction,
        },
      };
    } catch (error: any) {
      coinTransaction.status = CoinTransactionStatus.CANCELLED;
      await this.coinTransactionRepository.save(coinTransaction);
      throw new BadRequestException(
        error?.message || 'Unable to initialize payment link',
      );
    }
  }

  /**
   * Manually cancels a coin deposit order in PENDING status
   */
  async cancelDeposit(orderCode: string | number) {
    const codeStr = String(orderCode);
    const coinTx = await this.coinTransactionRepository.findOne({
      where: { transactionCode: codeStr },
    });

    if (!coinTx) {
      throw new NotFoundException(`Coin transaction with code #${codeStr} does not exist`);
    }

    if (coinTx.status === CoinTransactionStatus.PENDING) {
      coinTx.status = CoinTransactionStatus.CANCELLED;
      await this.coinTransactionRepository.save(coinTx);
      try {
        await this.payOSService.cancelPaymentLink({
          orderCode: Number(orderCode),
          cancellationReason: 'User cancelled deposit order',
        });
      } catch {
      }
    }

    return {
      success: true,
      message: `Cancelled deposit order #${codeStr}`,
      coinTx,
    };
  }

  /**
   * Processes coin credit when PayOS payment completes successfully
   */
  async processSuccessfulDeposit(orderCode: string | number) {
    const codeStr = String(orderCode);
    const coinTx = await this.coinTransactionRepository.findOne({
      where: { transactionCode: codeStr },
    });

    if (!coinTx) {
      throw new NotFoundException(`Coin transaction with code #${codeStr} does not exist`);
    }

    if (coinTx.status === CoinTransactionStatus.COMPLETED) {
      const wallet = await this.walletRepository.findOne({
        where: { userId: coinTx.userId },
      });
      return {
        success: true,
        message: 'Transaction already processed successfully',
        wallet,
        coinTx,
      };
    }

    let wallet = await this.walletRepository.findOne({
      where: { userId: coinTx.userId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId: coinTx.userId,
        balance: 0,
      });
    }

    const currentBalance = Number(wallet.balance || 0);
    const depositAmount = Number(coinTx.amount || 0);
    const newBalance = currentBalance + depositAmount;

    wallet.balance = newBalance;
    await this.walletRepository.save(wallet);

    coinTx.status = CoinTransactionStatus.COMPLETED;
    coinTx.balanceAfter = newBalance;
    await this.coinTransactionRepository.save(coinTx);

    // Automatically send notification to user
    await this.notificationsService.sendSystemNotification(
      coinTx.userId,
      `Deposit successful (+${depositAmount.toLocaleString('vi-VN')} Coins)`,
      `You have successfully deposited ${depositAmount.toLocaleString('vi-VN')} Coins into your Sporting ONE wallet (Tx Code: ${coinTx.transactionCode}). Current wallet balance: ${newBalance.toLocaleString('vi-VN')} Coins.`,
    );

    return {
      success: true,
      message: `Successfully added ${coinTx.amount.toLocaleString('vi-VN')} Coins to wallet`,
      wallet,
      coinTx,
    };
  }

  /**
   * Synchronizes and checks payment status from PayOS for coin deposit transaction
   */
  async syncDepositStatus(orderCode: string | number) {
    const codeNum = Number(orderCode);
    const codeStr = String(orderCode);

    const coinTx = await this.coinTransactionRepository.findOne({
      where: { transactionCode: codeStr },
    });

    if (!coinTx) {
      throw new NotFoundException(`Giao dịch xu với mã #${codeStr} không tồn tại`);
    }

    if (coinTx.status === CoinTransactionStatus.COMPLETED) {
      return { success: true, status: 'completed', coinTx };
    }

    try {
      const payOSInfo = await this.payOSService.getPaymentLinkInformation(codeNum);

      if (payOSInfo.status === 'paid') {
        const result = await this.processSuccessfulDeposit(codeNum);
        return { success: true, status: 'completed', coinTx: result.coinTx, wallet: result.wallet };
      } else if (payOSInfo.status === 'cancelled') {
        coinTx.status = CoinTransactionStatus.CANCELLED;
        await this.coinTransactionRepository.save(coinTx);
        return { success: true, status: 'cancelled', coinTx };
      }
    } catch {
    }

    return { success: true, status: coinTx.status, coinTx };
  }

  /**
   * Creates or saves record.
   */
  async create(createDto: CreateCoinTransactionDto) {
    const user = await this.userRepository.findOne({
      where: { id: createDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    const transaction = this.coinTransactionRepository.create(createDto);
    return this.coinTransactionRepository.save(transaction);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.coinTransactionRepository.find({
      relations: { user: true },
      withDeleted: true,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const transaction = await this.coinTransactionRepository.findOne({
      where: { id },
      relations: { user: true },
      withDeleted: true,
    });
    if (!transaction) {
      throw new NotFoundException(`Coin transaction with ID ${id} not found`);
    }
    return transaction;
  }

  /**
   * Retrieves ByUserId information.
   */
  async findByUserId(userId: number) {
    return this.coinTransactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateDto: UpdateCoinTransactionDto) {
    const transaction = await this.findOne(id);
    this.coinTransactionRepository.merge(transaction, updateDto);
    return this.coinTransactionRepository.save(transaction);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const transaction = await this.findOne(id);
    return this.coinTransactionRepository.softDelete(transaction.id);
  }

  /**
   * Executes request Withdraw operation.
   */
  async requestWithdraw(userId: number, dto: RequestWithdrawDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException('Tài khoản chưa khởi tạo ví xu.');
    }

    const currentBalance = Number(wallet.balance || 0);
    const withdrawAmount = Number(dto.amount);

    if (currentBalance < withdrawAmount) {
      throw new BadRequestException(
        `Số dư Xu không đủ (${currentBalance.toLocaleString('vi-VN')} Xu < ${withdrawAmount.toLocaleString('vi-VN')} Xu).`,
      );
    }
    const newBalance = currentBalance - withdrawAmount;
    wallet.balance = newBalance;
    wallet.bankName = dto.bankName;
    wallet.bankNumber = dto.bankNumber;
    wallet.bankAccountName = dto.bankAccountName;
    await this.walletRepository.save(wallet);

    const timestampStr = Date.now().toString().slice(-8);
    const orderCode = `WD${timestampStr}`;

    const coinTx = this.coinTransactionRepository.create({
      userId,
      type: CoinTransactionType.WITHDRAW,
      amount: withdrawAmount,
      transactionCode: orderCode,
      description: `Rút xu #${orderCode}`,
      status: CoinTransactionStatus.PENDING,
      balanceAfter: newBalance,
    });

    await this.coinTransactionRepository.save(coinTx);

    return {
      success: true,
      message: 'Đã gửi yêu cầu rút tiền thành công, đang chờ Admin duyệt!',
      data: coinTx,
    };
  }

  /**
   * Retrieves all withdrawal and refund approval requests for Admin Portal (including booking status = 'refund')
   */
  async findApprovals() {
    const refundBookings = await this.bookingRepository.find({
      where: { status: 'refund' },
      relations: { user: true, yard: true },
    });

    for (const b of refundBookings) {
      if (!b.user) continue;

      const code = `REFUND_BK_${b.id}`;
      const existingTx = await this.coinTransactionRepository.findOne({
        where: { transactionCode: code },
      });

      if (!existingTx) {
        const price = Number(b.priced || b.yard?.price || 0);
        const startMs = new Date(b.startTime).getTime();
        const endMs = new Date(b.endTime).getTime();
        const durationHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
        const bookingCost = price > 0 ? (b.priced ? Number(b.priced) : price * durationHours) : 0;

        const refundTx = this.coinTransactionRepository.create({
          userId: b.user.id,
          type: CoinTransactionType.REFUND,
          amount: bookingCost,
          transactionCode: code,
          description: `Refund hoàn xu đơn đặt sân #LA-${b.id} (${b.yard?.yardName || 'Sân tiêu chuẩn'})`,
          status: CoinTransactionStatus.PENDING,
          balanceAfter: null,
        });
        await this.coinTransactionRepository.save(refundTx);
      }
    }

    const txs = await this.coinTransactionRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return txs.filter(
      (t) =>
        t.type === CoinTransactionType.WITHDRAW ||
        t.type === CoinTransactionType.REFUND ||
        t.status === CoinTransactionStatus.PENDING,
    );
  }

  /**
   * Admin approves withdrawal or refund transaction
   */
  async approveTransaction(id: number) {
    const coinTx = await this.coinTransactionRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!coinTx) {
      throw new NotFoundException(`Không tìm thấy đơn giao dịch #${id}`);
    }

    if (coinTx.status !== CoinTransactionStatus.PENDING) {
      throw new BadRequestException(`Giao dịch #${id} đã được xử lý (Trạng thái: ${coinTx.status})`);
    }

    let wallet = await this.walletRepository.findOne({ where: { userId: coinTx.userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId: coinTx.userId,
        balance: 0,
      });
    }

    const currentBalance = Number(wallet.balance || 0);

    if (coinTx.type === CoinTransactionType.WITHDRAW) {
      coinTx.status = CoinTransactionStatus.COMPLETED;
      coinTx.description = `Rút xu #${coinTx.transactionCode || coinTx.id} (Đã duyệt)`;
      await this.coinTransactionRepository.save(coinTx);

      // Send withdrawal approval notification to User
      await this.notificationsService.sendSystemNotification(
        coinTx.userId,
        `Yêu cầu rút tiền #${coinTx.id} đã được phê duyệt`,
        `Yêu cầu rút ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu của bạn đã được Admin phê duyệt thành công. Tiền sẽ sớm được chuyển vào tài khoản ngân hàng của bạn.`,
      );

      return {
        success: true,
        message: `Đã duyệt thành công đơn rút ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu cho ${coinTx.user?.username || 'khách hàng'}.`,
        coinTx,
      };
    } else if (coinTx.type === CoinTransactionType.REFUND) {
      const newBalance = currentBalance + Number(coinTx.amount);
      wallet.balance = newBalance;
      await this.walletRepository.save(wallet);

      coinTx.status = CoinTransactionStatus.COMPLETED;
      coinTx.balanceAfter = newBalance;
      coinTx.description = (coinTx.description || '') + ' (Đã cộng xu hoàn tiền vào ví)';
      await this.coinTransactionRepository.save(coinTx);

      // If refund is linked to Booking (REFUND_BK_[id]), update booking status to 'refunded'
      if (coinTx.transactionCode && coinTx.transactionCode.startsWith('REFUND_BK_')) {
        const bookingIdStr = coinTx.transactionCode.replace('REFUND_BK_', '');
        const bookingId = Number(bookingIdStr);
        if (!isNaN(bookingId)) {
          const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
          if (booking) {
            booking.status = 'refunded';
            await this.bookingRepository.save(booking);
          }
        }
      }

      // Send refund approval notification to User
      await this.notificationsService.sendSystemNotification(
        coinTx.userId,
        `Yêu cầu hoàn tiền #${coinTx.id} đã được chấp thuận`,
        `Yêu cầu hoàn tiền đã được phê duyệt thành công! ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu đã được cộng trực tiếp vào Ví của bạn.`,
      );

      return {
        success: true,
        message: `Đã duyệt hoàn thành công ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu vào ví tài khoản của ${coinTx.user?.username || 'khách hàng'}!`,
        coinTx,
      };
    }

    coinTx.status = CoinTransactionStatus.COMPLETED;
    await this.coinTransactionRepository.save(coinTx);
    return { success: true, message: `Đã duyệt đơn giao dịch #${id}`, coinTx };
  }

  /**
   * Admin rejects withdrawal or refund transaction
   */
  async rejectTransaction(id: number, dto?: RejectTransactionDto) {
    const coinTx = await this.coinTransactionRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!coinTx) {
      throw new NotFoundException(`Không tìm thấy đơn giao dịch #${id}`);
    }

    if (coinTx.status !== CoinTransactionStatus.PENDING) {
      throw new BadRequestException(`Giao dịch #${id} đã được xử lý (Trạng thái: ${coinTx.status})`);
    }

    if (coinTx.type === CoinTransactionType.WITHDRAW) {
      let wallet = await this.walletRepository.findOne({ where: { userId: coinTx.userId } });
      if (!wallet) {
        wallet = this.walletRepository.create({
          userId: coinTx.userId,
          balance: 0,
        });
      }

      const currentBalance = Number(wallet.balance || 0);
      const newBalance = currentBalance + Number(coinTx.amount);
      wallet.balance = newBalance;
      await this.walletRepository.save(wallet);

      coinTx.balanceAfter = newBalance;
    }

    const reason = dto?.reason ? ` [Lý do từ chối: ${dto.reason}]` : ' [Từ chối phê duyệt]';
    coinTx.status = CoinTransactionStatus.FAILED;
    coinTx.description =
      (coinTx.description || '') +
      reason +
      (coinTx.type === CoinTransactionType.WITHDRAW ? ' (Đã hoàn lại Xu vào ví)' : '');
    await this.coinTransactionRepository.save(coinTx);

    // If refund from Booking, update status to cancelled
    if (coinTx.transactionCode && coinTx.transactionCode.startsWith('REFUND_BK_')) {
      const bookingIdStr = coinTx.transactionCode.replace('REFUND_BK_', '');
      const bookingId = Number(bookingIdStr);
      if (!isNaN(bookingId)) {
        const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
        if (booking) {
          booking.status = 'cancelled';
          await this.bookingRepository.save(booking);
        }
      }
    }

    // Automatically send rejection notification to User
    const reasonText = dto?.reason ? `\nLý do từ chối: ${dto.reason}.` : '';
    if (coinTx.type === CoinTransactionType.WITHDRAW) {
      await this.notificationsService.sendSystemNotification(
        coinTx.userId,
        `Yêu cầu rút tiền #${coinTx.id} đã bị từ chối`,
        `Yêu cầu rút ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu (Mã GD: ${coinTx.transactionCode || coinTx.id}) của bạn đã bị từ chối xét duyệt.${reasonText}\nToàn bộ ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu đã được hoàn lại 100% vào Ví Sporting ONE của bạn.`,
      );
    } else if (coinTx.type === CoinTransactionType.REFUND) {
      await this.notificationsService.sendSystemNotification(
        coinTx.userId,
        `Yêu cầu hoàn tiền #${coinTx.id} đã bị từ chối`,
        `Yêu cầu hoàn tiền số tiền ${Number(coinTx.amount).toLocaleString('vi-VN')} Xu của bạn đã bị từ chối.${reasonText}`,
      );
    }

    return {
      success: true,
      message: `Đã từ chối đơn giao dịch #${id}.${coinTx.type === CoinTransactionType.WITHDRAW ? ' Số xu đã được hoàn trả lại cho người dùng.' : ''}`,
      coinTx,
    };
  }
}
