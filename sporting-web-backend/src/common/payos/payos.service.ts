import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const payosSdk = require('@payos/node');
const PayOS = payosSdk.PayOS || payosSdk.default || payosSdk;
type PaymentLink = any;
type CreatePaymentLinkRequest = any;
import { Booking } from '../../module/bookings/entities/booking.entity';
import { Payment } from '../../module/payments/entities/payment.entity';
import { CreatePayOSPaymentDto } from './dto/create-payos-payment.dto';
import { UpdatePayOSStatusDto } from './dto/update-payos-status.dto';
import { CancelPayOSPaymentDto } from './dto/cancel-payos-payment.dto';
import { validateVendorOperatingHours } from '../../common/utils/date.util';

import * as crypto from 'crypto';
import { MailService } from '../../module/mail/mail.service';

/**
 * Executes to Ms operation.
 */
function toMs(dateVal: Date | string): number {
  return new Date(dateVal).getTime();
}

@Injectable()
export class PayOSService {
  private payOS: any;
  private readonly logger = new Logger(PayOSService.name);
  private readonly paymentInfoCache = new Map<
    number,
    {
      data: { paymentInfo: PaymentLink; status: 'paid' | 'cancelled' | 'pending' };
      timestamp: number;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly mailService: MailService,
  ) {
    const clientId =
      this.configService.get<string>('PAYOS_CLIENT_ID') ||
      process.env.PAYOS_CLIENT_ID ||
      'dummy-client-id';
    const apiKey =
      this.configService.get<string>('PAYOS_API_KEY') ||
      process.env.PAYOS_API_KEY ||
      'dummy-api-key';
    const checksumKey =
      this.configService.get<string>('PAYOS_CHECKSUM_KEY') ||
      process.env.PAYOS_CHECKSUM_KEY ||
      'dummy-checksum-key';

    const PayOSClass = PayOS.PayOS || PayOS.default || PayOS;
    this.payOS = new PayOSClass({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  /**
   * Generates a PayOS checkout payment link.
   */
  async createPaymentLink(dto: CreatePayOSPaymentDto) {
    let ids: number[] = [];
    if (dto.bookingIds && Array.isArray(dto.bookingIds) && dto.bookingIds.length > 0) {
      ids = dto.bookingIds.map((id) => Number(id));
    } else if (dto.bookingId) {
      ids = [Number(dto.bookingId)];
    }

    if (ids.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 đơn đặt sân để thanh toán.');
    }

    const bookings = await this.bookingRepository.find({
      where: ids.map((id) => ({ id })),
      relations: { yard: { vendor: true }, user: true },
    });

    if (bookings.length === 0) {
      throw new NotFoundException('Không tìm thấy bản ghi đặt sân được yêu cầu.');
    }

    let totalAmount = 0;
    const items: Array<{ name: string; quantity: number; price: number }> = [];

    for (const booking of bookings) {
      if (booking.status && booking.status !== 'unpaid') {
        if (booking.status === 'paid') {
          throw new BadRequestException(`Sân "${booking.yard?.yardName}" đã được thanh toán trước đó`);
        }
        if (booking.status === 'cancelled') {
          throw new BadRequestException(`Sân "${booking.yard?.yardName}" đã bị hủy`);
        }
        throw new BadRequestException(`Không thể thanh toán sân ở trạng thái '${booking.status}'`);
      }

      if (!booking.yard) {
        throw new BadRequestException('Bản ghi đặt sân không đính kèm thông tin sân (yard)');
      }

      if (booking.yard.status === 'unavailable') {
        throw new BadRequestException(`Sân "${booking.yard.yardName}" hiện đang tạm ngưng hoạt động.`);
      }

      if (booking.yard.vendor) {
        validateVendorOperatingHours(
          booking.startTime,
          booking.endTime,
          booking.yard.vendor.openTime,
          booking.yard.vendor.closeTime,
          booking.yard.yardName,
        );
      }

      const paidBookings = await this.bookingRepository.find({
        where: { yard: { id: booking.yard.id }, status: 'paid' },
        relations: { yard: true },
      });

      const reqStartMs = new Date(booking.startTime).getTime();
      const reqEndMs = new Date(booking.endTime).getTime();

      for (const pb of paidBookings) {
        if (pb.id === booking.id) continue;
        const pbStartMs = new Date(pb.startTime).getTime();
        const pbEndMs = new Date(pb.endTime).getTime();

        if (pbStartMs < reqEndMs && pbEndMs > reqStartMs) {
          const startStr = new Date(pb.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const endStr = new Date(pb.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(pb.startTime).toLocaleDateString('vi-VN');

          throw new BadRequestException(
            `Rất tiếc! Sân "${booking.yard.yardName || 'này'}" đã bị người dùng khác đặt và thanh toán trước đó vào lúc ${startStr} - ${endStr} (ngày ${dateStr}).`,
          );
        }
      }

      const nowMs = Date.now();
      const bookingStartMs = toMs(booking.startTime);

      if (bookingStartMs <= nowMs) {
        booking.status = 'cancelled';
        await this.bookingRepository.save(booking);

        const startStr = new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(booking.startTime).toLocaleDateString('vi-VN');
        const yardName = booking.yard?.yardName || 'Sân';

        throw new BadRequestException(
          `Đơn đặt sân #${booking.id} ("${yardName}" - ${startStr} ${dateStr}) đã quá thời gian bắt đầu nên hệ thống đã tự động huỷ đơn. Bạn không thể tiếp tục thanh toán đơn này.`,
        );
      }

      const amt = Number(booking.priced) || Number(booking.yard.price) || 0;
      totalAmount += amt;

      items.push({
        name: `${booking.yard.yardName}`.slice(0, 50),
        quantity: 1,
        price: amt,
      });
    }

    if (totalAmount <= 0) {
      throw new BadRequestException('Tổng số tiền thanh toán phải lớn hơn 0');
    }

    const timestampMs = Date.now().toString();
    const randomDigits = Math.floor(Math.random() * 89 + 10).toString();
    const orderCode = Number(`${timestampMs}${randomDigits}`.slice(0, 13));

    const appUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const primaryBookingId = bookings[0].id;
    const bookingIdsStr = ids.join(',');

    const returnUrl = dto.returnUrl || `${appUrl}/payment-success?orderCode=${orderCode}&bookingIds=${bookingIdsStr}`;
    const cancelUrl = dto.cancelUrl || `${appUrl}/payment-cancel?orderCode=${orderCode}&bookingIds=${bookingIdsStr}`;

    const description =
      bookings.length > 1
        ? `TT ${bookings.length} san #${ids.slice(0, 3).join(',')}`.slice(0, 25)
        : `TT Booking #${primaryBookingId}`.slice(0, 25);

    const expireSeconds = Number(this.configService.get<number>('PAYOS_EXPIRED_IN_SECONDS')) || 3600;
    const expiredAt = Math.floor(Date.now() / 1000) + expireSeconds;

    const paymentData: CreatePaymentLinkRequest = {
      orderCode,
      amount: totalAmount,
      description,
      returnUrl,
      cancelUrl,
      expiredAt,
      items,
      buyerName: bookings[0].user?.username || undefined,
      buyerEmail: bookings[0].user?.email || undefined,
    };

    try {
      const response = await this.payOS.paymentRequests.create(paymentData);
      this.logger.log(`PayOS payment link created for Bookings [${ids.join(',')}], PayOS OrderCode: ${orderCode}, Total: ${totalAmount}`);

      return {
        success: true,
        message: 'PayOS payment link created successfully',
        data: response,
      };
    } catch (error: any) {
      const rawMsg = error?.message || String(error);
      this.logger.error(`Error creating PayOS payment link for Bookings [${ids.join(',')}]: ${rawMsg}`);

      let userFriendlyMsg = rawMsg;
      if (rawMsg.includes('423') || rawMsg.includes('VietQR Pro thất bại')) {
        userFriendlyMsg = 'Cổng VietQR thông báo: Kênh ngân hàng liên kết chưa sẵn sàng (Mã lỗi 423). Vui lòng thử lại sau hoặc chọn phương thức Thanh toán bằng Xu trong Ví!';
      } else if (rawMsg.includes('401') || rawMsg.includes('API key')) {
        userFriendlyMsg = 'Cấu hình cổng thanh toán chưa hợp lệ. Vui lòng liên hệ quản trị viên!';
      }

      throw new BadRequestException(userFriendlyMsg);
    }
  }

  async createDepositPaymentLink(params: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    buyerName?: string;
    buyerEmail?: string;
  }) {
    const expireSeconds =
      Number(this.configService.get<number>('PAYOS_EXPIRED_IN_SECONDS')) || 3600;
    const expiredAt = Math.floor(Date.now() / 1000) + expireSeconds;

    const paymentData: CreatePaymentLinkRequest = {
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description.slice(0, 25),
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      expiredAt,
      items: [
        {
          name: 'Nạp Xu Sporting One',
          quantity: 1,
          price: params.amount,
        },
      ],
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
    };

    try {
      const response = await this.payOS.paymentRequests.create(paymentData);
      this.logger.log(
        `PayOS deposit payment link created. OrderCode: ${params.orderCode}, Amount: ${params.amount}`,
      );
      return response;
    } catch (error: any) {
      this.logger.error(
        `Error creating PayOS deposit payment link for orderCode #${params.orderCode}: ${error?.message || error}`,
      );
      throw new BadRequestException(
        error?.message || 'Failed to create PayOS deposit payment link',
      );
    }
  }

  /**
   * Fetches payment transaction status from PayOS API.
   */
  async getPaymentInfo(orderCode: number) {
    const result = await this.getPaymentLinkInformation(orderCode);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Retrieves PaymentLinkInformation information.
   */
  async getPaymentLinkInformation(orderCode: number): Promise<{
    paymentInfo: PaymentLink;
    status: 'paid' | 'cancelled' | 'pending';
  }> {
    const numOrderCode = Number(orderCode);
    const now = Date.now();
    const cached = this.paymentInfoCache.get(numOrderCode);

    if (cached && now - cached.timestamp < 4000) {
      return cached.data;
    }

    try {
      const paymentInfo = await this.payOS.paymentRequests.get(numOrderCode);
      let mappedStatus: 'paid' | 'cancelled' | 'pending' = 'pending';

      if (paymentInfo.status === 'PAID') {
        mappedStatus = 'paid';
      } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(paymentInfo.status)) {
        mappedStatus = 'cancelled';
      } else {
        mappedStatus = 'pending';
      }

      const resultData = { paymentInfo, status: mappedStatus };
      this.paymentInfoCache.set(numOrderCode, {
        data: resultData,
        timestamp: now,
      });

      return resultData;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        this.logger.debug(`PayOS rate-limited (HTTP 429) for orderCode #${numOrderCode}, falling back gracefully.`);
        if (cached) return cached.data;
        return {
          paymentInfo: { status: 'PENDING' } as any,
          status: 'pending',
        };
      }

      this.logger.error(`Error fetching PayOS payment info for orderCode #${numOrderCode}: ${errorMsg}`);
      if (cached) return cached.data;
      throw new NotFoundException(`PayOS transaction for orderCode #${numOrderCode} not found`);
    }
  }

  private generateBookingSignature(booking: Booking): string {
    const bookingId = booking.id;
    const yardId = booking.yard?.id || (booking as any).yardId || 0;
    const userId = booking.user?.id || (booking as any).userId || 0;
    const priced = Number(booking.priced || 0);

    const timeStarted = new Date(booking.startTime).toISOString();
    const timeEnded = new Date(booking.endTime).toISOString();
    const secretKey = process.env.BOOKING_QR_SECRET_KEY || 'sporting_one_secret_key_2026';

    const rawData = `bookingid=${bookingId}&yardId=${yardId}&userId=${userId}&priced=${priced}&time_started=${timeStarted}&time_ended=${timeEnded}&${secretKey}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  private async sendBookingConfirmationEmail(booking: Booking) {
    if (!booking.user?.email) return;
    try {
      const sig = this.generateBookingSignature(booking);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${baseUrl}/verify-qr?id=${booking.id}&sig=${sig}`;

      await this.mailService.sendBookingConfirmationEmail(
        booking.user.email,
        booking.user.username || 'Khách hàng',
        {
          id: booking.id,
          yardName: booking.yard?.yardName || 'Sân thi đấu',
          vendorName: booking.yard?.vendor?.vendorName,
          startTime: new Date(booking.startTime).toLocaleString('vi-VN'),
          endTime: new Date(booking.endTime).toLocaleString('vi-VN'),
          priced: Number(booking.priced || booking.yard?.price || 0),
          verifyUrl,
        },
      );
    } catch {
    }
  }

  /**
   * Syncs and updates the payment status for booking(s) in the database.
   */
  async updatePaymentStatus(dto: UpdatePayOSStatusDto) {
    if (!dto || !dto.orderCode) {
      throw new BadRequestException('orderCode is required');
    }

    const orderCodeNum = Number(dto.orderCode);
    let ids: number[] = [];

    if (dto.bookingIds && Array.isArray(dto.bookingIds) && dto.bookingIds.length > 0) {
      ids = dto.bookingIds.map((id) => Number(id));
    } else if (dto.bookingId) {
      ids = [Number(dto.bookingId)];
    }

    const payOSInfo = await this.getPaymentLinkInformation(orderCodeNum);
    const mappedStatus = payOSInfo.status;

    if (ids.length === 0) {
      const desc = (payOSInfo.paymentInfo as any)?.description || '';
      const matches = desc.match(/\d+/g);
      if (matches && matches.length > 0) {
        ids = matches.map((m: string) => Number(m));
      } else {
        ids = [orderCodeNum];
      }
    }

    const bookings = await this.bookingRepository.find({
      where: ids.map((id) => ({ id })),
      relations: { yard: { vendor: true }, user: true },
    });

    if (bookings.length === 0) {
      throw new NotFoundException(`Bookings [${ids.join(',')}] not found`);
    }

    if (mappedStatus !== 'pending') {
      for (const booking of bookings) {
        let finalStatus: 'paid' | 'cancelled' | 'pending' | 'refund' = mappedStatus;

        if (mappedStatus === 'paid' && booking.yard) {
          const paidBookings = await this.bookingRepository.find({
            where: { yard: { id: booking.yard.id }, status: 'paid' },
            relations: { yard: true },
          });

          const reqStartMs = toMs(booking.startTime);
          const reqEndMs = toMs(booking.endTime);

          for (const pb of paidBookings) {
            if (pb.id === booking.id) continue;
            const pbStartMs = toMs(pb.startTime);
            const pbEndMs = toMs(pb.endTime);

            if (pbStartMs < reqEndMs && pbEndMs > reqStartMs) {
              finalStatus = 'refund';
              break;
            }
          }
        }

        booking.status = finalStatus;
        await this.bookingRepository.save(booking);

        if (finalStatus === 'paid') {
          await this.sendBookingConfirmationEmail(booking);
        }

        let paymentRecord = await this.paymentRepository.findOne({
          where: { booking: { id: booking.id } },
        });

        if (!paymentRecord) {
          paymentRecord = this.paymentRepository.create({
            yard: booking.yard,
            user: booking.user,
            booking: booking,
            totalPrice: Number(booking.priced) || Number(booking.yard?.price) || 0,
            paymentMethod: 'PayOS',
            status: finalStatus,
          });
        } else {
          paymentRecord.status = finalStatus;
          paymentRecord.paymentMethod = 'PayOS';
        }

        await this.paymentRepository.save(paymentRecord);
      }
    }

    return {
      success: true,
      message: `Payment status updated successfully for ${bookings.length} bookings`,
      data: {
        bookingId: bookings[0].id,
        bookingIds: ids,
        status: bookings[0].status,
        payOSInfo: payOSInfo.paymentInfo,
      },
    };
  }

  /**
   * Handles asynchronous webhook notifications sent by PayOS.
   */
  async handleWebhook(webhookBody: any) {
    const verifiedData = await this.verifyWebhookData(webhookBody);

    if (verifiedData) {
      const orderCodeNum = Number(verifiedData.orderCode);
      let bookingIds: number[] = [];

      if (verifiedData.description) {
        const matches = verifiedData.description.match(/\d+/g);
        if (matches && matches.length > 0) {
          bookingIds = matches.map((m: string) => Number(m));
        }
      }
      if (bookingIds.length === 0) {
        bookingIds = [orderCodeNum];
      }

      const bookings = await this.bookingRepository.find({
        where: bookingIds.map((id) => ({ id })),
        relations: { yard: { vendor: true }, user: true },
      });

      if (bookings.length > 0) {
        const isSuccess = verifiedData.code === '00';
        const mappedStatus = isSuccess ? 'paid' : 'cancelled';

        for (const booking of bookings) {
          if (booking.status === 'unpaid') {
            let finalStatus: 'paid' | 'cancelled' | 'pending' | 'refund' = mappedStatus;

            if (mappedStatus === 'paid' && booking.yard) {
              const paidBookings = await this.bookingRepository.find({
                where: { yard: { id: booking.yard.id }, status: 'paid' },
                relations: { yard: true },
              });

              const reqStartMs = toMs(booking.startTime);
              const reqEndMs = toMs(booking.endTime);

              for (const pb of paidBookings) {
                if (pb.id === booking.id) continue;
                const pbStartMs = toMs(pb.startTime);
                const pbEndMs = toMs(pb.endTime);

                if (pbStartMs < reqEndMs && pbEndMs > reqStartMs) {
                  finalStatus = 'refund';
                  break;
                }
              }
            }

            booking.status = finalStatus;
            await this.bookingRepository.save(booking);

            if (finalStatus === 'paid') {
              await this.sendBookingConfirmationEmail(booking);
            }

            let paymentRecord = await this.paymentRepository.findOne({
              where: { booking: { id: booking.id } },
            });

            if (!paymentRecord) {
              paymentRecord = this.paymentRepository.create({
                yard: booking.yard,
                user: booking.user,
                booking: booking,
                totalPrice: Number(booking.priced) || Number(booking.yard?.price) || 0,
                paymentMethod: 'PayOS',
                status: finalStatus,
              });
            } else {
              paymentRecord.status = finalStatus;
              paymentRecord.paymentMethod = 'PayOS';
            }

            await this.paymentRepository.save(paymentRecord);
          }
        }
      }
    }

    return {
      success: true,
      message: 'PayOS webhook processed successfully',
    };
  }

  /**
   * Validates and verifies parameters for verifyWebhookData.
   */
  async verifyWebhookData(webhookBody: any) {
    try {
      return await this.payOS.webhooks.verify(webhookBody);
    } catch (error: any) {
      this.logger.error(`PayOS webhook verification failed: ${error?.message || error}`);
      throw new BadRequestException('Invalid webhook payload');
    }
  }

  /**
   * Cancels an active PayOS payment link.
   */
  async cancelPaymentLink(dto: CancelPayOSPaymentDto) {
    if (!dto || !dto.orderCode) {
      throw new BadRequestException('orderCode is required');
    }

    const orderCodeNum = Number(dto.orderCode);
    const reason = dto.cancellationReason || 'User cancelled payment';

    let payOSResult: PaymentLink | null = null;
    try {
      payOSResult = await this.payOS.paymentRequests.cancel(orderCodeNum, reason);
    } catch (error: any) {
      this.logger.error(`Error cancelling PayOS payment link for orderCode #${orderCodeNum}: ${error?.message || error}`);
    }

    return {
      success: true,
      message: 'PayOS payment link cancelled successfully',
      data: {
        orderCode: orderCodeNum,
        payOSResult,
      },
    };
  }
}
