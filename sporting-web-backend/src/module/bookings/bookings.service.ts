import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, LessThanOrEqual, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { BookingsMonth } from '../bookings_month/entities/bookings_month.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { getVietnamDate, getVietnamTimeParts, validateVendorOperatingHours } from '../../common/utils/date.util';

import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  CoinTransaction,
  CoinTransactionType,
  CoinTransactionStatus,
} from '../coin_transactions/entities/coin_transaction.entity';
import { PayBookingsWithWalletDto } from './dto/pay-wallet-booking.dto';

/**
 * Executes to Ms operation.
 */
function toMs(dateVal: Date | string): number {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  const s = String(dateVal).trim();
  const normalized = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
  return new Date(normalized).getTime();
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly repository: Repository<Booking>,
    @InjectRepository(BookingsMonth)
    private readonly bookingsMonthRepository: Repository<BookingsMonth>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) { }

  private getSecretKey(): string {
    return process.env.BOOKING_QR_SECRET_KEY || 'sporting_one_secret_key_2026';
  }

  /**
   * Generates a secure SHA-256 digital signature for booking QR verification.
   */
  generateBookingSignature(booking: Booking): string {
    const bookingId = booking.id;
    const yardId = booking.yard?.id || (booking as any).yardId || 0;
    const userId = booking.user?.id || (booking as any).userId || 0;
    const priced = Number(booking.priced || 0);

    const timeStarted = new Date(booking.startTime).toISOString();
    const timeEnded = new Date(booking.endTime).toISOString();
    const secretKey = this.getSecretKey();

    const rawData = `bookingid=${bookingId}&yardId=${yardId}&userId=${userId}&priced=${priced}&time_started=${timeStarted}&time_ended=${timeEnded}&${secretKey}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  /**
   * Generates QR code verification metadata and URL for a paid booking.
   */
  getBookingQrInfo(booking: Booking, appUrl?: string) {
    const sig = this.generateBookingSignature(booking);
    const baseUrl = appUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify-qr?id=${booking.id}&sig=${sig}`;

    return {
      bookingId: booking.id,
      sig,
      verifyUrl,
    };
  }

  /**
   * Generates a secure SHA-256 digital signature for monthly booking QR verification.
   */
  generateBookingMonthSignature(booking: BookingsMonth): string {
    const bookingId = booking.id;
    const yardId = booking.yard?.id || (booking as any).yardId || 0;
    const userId = booking.user?.id || (booking as any).userId || 0;
    const priced = Number(booking.priced || 0);
    const startDate = typeof booking.startDate === 'string' ? booking.startDate.split('T')[0] : booking.startDate;
    const endDate = typeof booking.endDate === 'string' ? booking.endDate.split('T')[0] : booking.endDate;
    const startTime = booking.startTime || '00:00';
    const endTime = booking.endTime || '00:00';
    const secretKey = this.getSecretKey();

    const rawData = `monthBookingId=${bookingId}&yardId=${yardId}&userId=${userId}&priced=${priced}&startDate=${startDate}&endDate=${endDate}&startTime=${startTime}&endTime=${endTime}&${secretKey}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  private sanitizeBooking(booking: Booking): any {
    if (!booking) return booking;
    if (booking.user) {
      delete (booking.user as Partial<User>).password;
    }
    if (booking.status === 'paid') {
      const sig = this.generateBookingSignature(booking);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${baseUrl}/verify-qr?id=${booking.id}&sig=${sig}`;
      return {
        ...booking,
        itemType: 'hourly',
        sig,
        verifyUrl,
      };
    }
    return {
      ...booking,
      itemType: 'hourly',
    };
  }

  private sanitizeBookingMonth(booking: BookingsMonth): any {
    if (!booking) return booking;
    if (booking.user) {
      delete (booking.user as Partial<User>).password;
    }
    if (booking.status === 'paid') {
      const sig = this.generateBookingMonthSignature(booking);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${baseUrl}/verify-qr?type=month&id=${booking.id}&sig=${sig}`;
      return {
        ...booking,
        itemType: 'monthly',
        sig,
        verifyUrl,
      };
    }
    return {
      ...booking,
      itemType: 'monthly',
    };
  }

  private sanitizeBookings(bookings: Booking[]): any[] {
    return bookings.map((booking) => this.sanitizeBooking(booking));
  }

  private validateBookingTimes(startTimeStr: string | Date, endTimeStr: string | Date) {
    const now = getVietnamDate();
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start_time or end_time');
    }

    if (start <= now) {
      throw new BadRequestException('start_time must be greater than current time');
    }

    if (end <= now) {
      throw new BadRequestException('end_time must be greater than current time');
    }

    if (end <= start) {
      throw new BadRequestException('end_time must be greater than start_time');
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs >= 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'Đơn đặt sân lẻ (Bookings) không hỗ trợ thời lượng từ 24 giờ trở lên. Đối với gói đặt sân theo tháng, vui lòng sử dụng API /bookings-month.',
      );
    }
  }

  /**
   * Checks if a single daily booking conflicts with any paid monthly bookings (BookingsMonth) on the same yard.
   */
  private async checkMonthlyBookingConflicts(
    yardId: number,
    startTime: Date | string,
    endTime: Date | string,
    manager?: any,
  ) {
    const startD = new Date(startTime);
    const endD = new Date(endTime);
    const startParts = getVietnamTimeParts(startD);
    const endParts = getVietnamTimeParts(endD);

    const bookingDate = startParts.dateStr; // "YYYY-MM-DD"
    const startMins = parseInt(startParts.hours, 10) * 60 + parseInt(startParts.minutes, 10);
    const endMins = parseInt(endParts.hours, 10) * 60 + parseInt(endParts.minutes, 10);

    const repo = manager ? manager.getRepository(BookingsMonth) : this.bookingsMonthRepository;
    const paidMonthly = await repo
      .createQueryBuilder('bm')
      .leftJoinAndSelect('bm.yard', 'yard')
      .where('bm.yard_id = :yardId', { yardId })
      .andWhere('bm.status = :status', { status: 'paid' })
      .andWhere('bm.startDate <= :bookingDate AND bm.endDate >= :bookingDate', { bookingDate })
      .getMany();

    for (const bm of paidMonthly) {
      const bmStartDate = typeof bm.startDate === 'string' ? bm.startDate.slice(0, 10) : getVietnamTimeParts(bm.startDate).dateStr;
      const bmEndDate = typeof bm.endDate === 'string' ? bm.endDate.slice(0, 10) : getVietnamTimeParts(bm.endDate).dateStr;

      if (bookingDate >= bmStartDate && bookingDate <= bmEndDate) {
        const [bmSH, bmSM] = String(bm.startTime).split(':').map(Number);
        const [bmEH, bmEM] = String(bm.endTime).split(':').map(Number);
        const bmStartMins = (bmSH || 0) * 60 + (bmSM || 0);
        const bmEndMins = (bmEH || 0) * 60 + (bmEM || 0);

        if (startMins < bmEndMins && endMins > bmStartMins) {
          const yardName = bm.yard?.yardName || 'Sân';
          throw new BadRequestException(
            `Sân "${yardName}" đã được người khác thanh toán gói tháng (#BM-${bm.id}) trong khung giờ ${bm.startTime} - ${bm.endTime} (từ ${bmStartDate} đến ${bmEndDate}). Vui lòng chọn khung giờ khác hoặc đổi sân khác.`,
          );
        }
      }
    }
  }

  /**
   * Creates or saves record.
   */
  async create(dto: CreateBookingDto) {
    this.validateBookingTimes(dto.startTime, dto.endTime);

    const { yardId, userId, ...cleanDto } = dto;
    const status = dto.status || 'unpaid';

    const yardVal = await this.yardRepository.findOne({
      where: { id: dto.yardId },
      relations: { vendor: true },
    });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    if (yardVal.vendor && yardVal.vendor.status !== 'active') {
      throw new BadRequestException(
        `Vendor of this yard is not active (status: ${yardVal.vendor.status})`,
      );
    }

    if (yardVal.vendor) {
      validateVendorOperatingHours(
        dto.startTime,
        dto.endTime,
        yardVal.vendor.openTime,
        yardVal.vendor.closeTime,
        yardVal.yardName,
      );
    }

    const userVal = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const reqStart = new Date(dto.startTime);
    const reqEnd = new Date(dto.endTime);

    // Check if slot is already paid (simple non-locking check)
    const conflictingPaid = await this.repository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.yard', 'yard')
      .where('b.yard_id = :yardId', { yardId: dto.yardId })
      .andWhere('b.status = :status', { status: 'paid' })
      .andWhere('b.startTime < :reqEnd', { reqEnd })
      .andWhere('b.endTime > :reqStart', { reqStart })
      .getOne();

    if (conflictingPaid) {
      const startStr = new Date(conflictingPaid.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const endStr = new Date(conflictingPaid.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(conflictingPaid.startTime).toLocaleDateString('vi-VN');

      const isLongTerm = (reqEnd.getTime() - reqStart.getTime()) >= 24 * 60 * 60 * 1000;
      const msg = isLongTerm
        ? `Không thể đặt theo gói dài hạn: Sân đã có người đặt lịch lẻ vào lúc ${startStr} - ${endStr} (ngày ${dateStr}) trong khoảng thời gian này. Vui lòng chọn thời gian khác hoặc đổi sân khác.`
        : `Sân đã được người khác thanh toán giữ lịch vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Vui lòng chọn khoảng thời gian khác hoặc đổi sân khác.`;

      throw new BadRequestException(msg);
    }

    // Check conflict against paid monthly bookings
    await this.checkMonthlyBookingConflicts(dto.yardId, dto.startTime, dto.endTime);

    const entity = this.repository.create({
      ...cleanDto,
      status,
      startTime: reqStart,
      endTime: reqEnd,
      yard: yardVal,
      user: userVal,
    } as DeepPartial<Booking>);

    const savedBooking = await this.repository.save(entity);
    return this.sanitizeBooking(savedBooking);
  }

  private async syncYardStatusesRealtime() {
    const now = getVietnamDate();
    const nowParts = getVietnamTimeParts(now);
    const todayStr = nowParts.dateStr;
    const currentMins = parseInt(nowParts.hours, 10) * 60 + parseInt(nowParts.minutes, 10);

    // Query only active hourly bookings right now
    const activeDaily = await this.repository
      .createQueryBuilder('b')
      .select('b.yard_id', 'yardId')
      .where('b.status = :status', { status: 'paid' })
      .andWhere('b.startTime <= :now AND b.endTime > :now', { now })
      .getRawMany();

    // Query only active monthly bookings valid for today
    const activeMonthly = await this.bookingsMonthRepository
      .createQueryBuilder('bm')
      .select('bm.yard_id', 'yardId')
      .addSelect('bm.startTime', 'startTime')
      .addSelect('bm.endTime', 'endTime')
      .where('bm.status = :status', { status: 'paid' })
      .andWhere('bm.startDate <= :todayStr AND bm.endDate >= :todayStr', { todayStr })
      .getRawMany();

    const occupiedYardIds = new Set<number>();
    activeDaily.forEach((r) => {
      const yId = Number(r.yardId || r.b_yard_id);
      if (yId) occupiedYardIds.add(yId);
    });

    activeMonthly.forEach((bm) => {
      const [bmSH, bmSM] = String(bm.startTime).split(':').map(Number);
      const [bmEH, bmEM] = String(bm.endTime).split(':').map(Number);
      const bmStartMins = (bmSH || 0) * 60 + (bmSM || 0);
      const bmEndMins = (bmEH || 0) * 60 + (bmEM || 0);

      if (bmStartMins <= currentMins && currentMins < bmEndMins) {
        const yId = Number(bm.yardId || bm.bm_yard_id);
        if (yId) occupiedYardIds.add(yId);
      }
    });

    const occupiedIds = Array.from(occupiedYardIds);
    if (occupiedIds.length > 0) {
      await this.yardRepository
        .createQueryBuilder()
        .update(Yard)
        .set({ status: 'booked' })
        .where('id IN (:...occupiedIds)', { occupiedIds })
        .andWhere('status = :status', { status: 'available' })
        .execute();

      await this.yardRepository
        .createQueryBuilder()
        .update(Yard)
        .set({ status: 'available' })
        .where('id NOT IN (:...occupiedIds)', { occupiedIds })
        .andWhere('status = :status', { status: 'booked' })
        .execute();
    } else {
      await this.yardRepository
        .createQueryBuilder()
        .update(Yard)
        .set({ status: 'available' })
        .where('status = :status', { status: 'booked' })
        .execute();
    }
  }

  /**
   * Automatically cancels unpaid bookings whose start time is past the current time.
   */
  async cancelExpiredUnpaidBookings(): Promise<void> {
    const now = getVietnamDate();
    await this.repository
      .createQueryBuilder()
      .update(Booking)
      .set({ status: 'cancelled' })
      .where('status = :status', { status: 'unpaid' })
      .andWhere('startTime <= :now', { now })
      .execute();
  }

  /**
   * Retrieves bookings with optimized SQL JOIN across daily and monthly bookings for Admin & Vendor.
   */
  async findAll(query?: {
    yardId?: number;
    vendorId?: number;
    date?: string;
    status?: string;
    currentUser?: any;
  }) {
    if (!query?.currentUser && !query?.yardId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để xem danh sách đặt sân.');
    }

    const qb = this.repository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.yard', 'yard')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('booking.createdAt', 'DESC');

    const monthQb = this.bookingsMonthRepository
      .createQueryBuilder('bookingMonth')
      .withDeleted()
      .leftJoinAndSelect('bookingMonth.yard', 'yard')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('bookingMonth.user', 'user')
      .orderBy('bookingMonth.createdAt', 'DESC');

    if (query?.yardId) {
      qb.andWhere('yard.id = :yardId', { yardId: query.yardId });
      monthQb.andWhere('yard.id = :yardId', { yardId: query.yardId });
    }

    if (query?.vendorId) {
      qb.andWhere('yard.vendor_id = :vendorId', { vendorId: query.vendorId });
      monthQb.andWhere('yard.vendor_id = :vendorId', { vendorId: query.vendorId });
    } else if (query?.currentUser?.role === 'vendor' && !query?.yardId) {
      const userVendors = await this.dataSource.getRepository(Vendor).find({
        where: { user: { id: query.currentUser.id } },
        select: { id: true },
      });
      const vIds = userVendors.map((v) => v.id);
      if (vIds.length > 0) {
        qb.andWhere('yard.vendor_id IN (:...vIds)', { vIds });
        monthQb.andWhere('yard.vendor_id IN (:...vIds)', { vIds });
      } else {
        return [];
      }
    }

    if (query?.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
      monthQb.andWhere('bookingMonth.status = :status', { status: query.status });
    }

    if (query?.date) {
      const startOfDay = new Date(`${query.date}T00:00:00`);
      const endOfDay = new Date(`${query.date}T23:59:59.999`);
      qb.andWhere('booking.startTime <= :endOfDay AND booking.endTime >= :startOfDay', {
        startOfDay,
        endOfDay,
      });
      monthQb.andWhere('bookingMonth.startDate <= :date AND bookingMonth.endDate >= :date', {
        date: query.date,
      });
    }

    const [dailyList, monthList] = await Promise.all([qb.getMany(), monthQb.getMany()]);
    const sanitizedDaily = dailyList.map((b) => this.sanitizeBooking(b));
    const sanitizedMonth = monthList.map((bm) => this.sanitizeBookingMonth(bm));

    const all = [...sanitizedDaily, ...sanitizedMonth];
    all.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.startTime || a.startDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.startTime || b.startDate || 0).getTime();
      return timeB - timeA;
    });

    if (!query?.currentUser) {
      all.forEach((b: any) => {
        delete b.user;
      });
    }

    return all;
  }

  /**
   * Retrieves bookings belonging to the currently logged-in user.
   */
  async findMyBookings(userId: number) {
    await this.cancelExpiredUnpaidBookings();
    await this.syncYardStatusesRealtime();

    const dailyQb = this.repository
      .createQueryBuilder('booking')
      .withDeleted()
      .leftJoinAndSelect('booking.yard', 'yard')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.user_id = :userId', { userId })
      .andWhere('booking.ondeleted IS NULL')
      .orderBy('booking.createdAt', 'DESC');

    const dailyList = await dailyQb.getMany();
    return dailyList.map((b) => this.sanitizeBooking(b));
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    await this.syncYardStatusesRealtime();
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: { vendor: true }, user: true },
      withDeleted: true,
    });
    if (!entity) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return this.sanitizeBooking(entity);
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateBookingDto) {
    const entity = await this.findOne(id);

    const startTimeToValidate = dto.startTime !== undefined ? dto.startTime : entity.startTime;
    const endTimeToValidate = dto.endTime !== undefined ? dto.endTime : entity.endTime;

    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      this.validateBookingTimes(startTimeToValidate, endTimeToValidate);
    }

    if (dto.startTime !== undefined || dto.endTime !== undefined || dto.yardId !== undefined) {
      let targetYard = entity.yard;
      if (dto.yardId !== undefined) {
        const found = await this.yardRepository.findOne({
          where: { id: dto.yardId },
          relations: { vendor: true },
        });
        if (found) targetYard = found;
      }

      if (targetYard && targetYard.vendor) {
        validateVendorOperatingHours(
          startTimeToValidate,
          endTimeToValidate,
          targetYard.vendor.openTime,
          targetYard.vendor.closeTime,
          targetYard.yardName,
        );
      }
    }

    if (dto.status !== undefined && dto.status !== entity.status) {
      if (dto.status === 'paid') {
        const reqStartMs = toMs(dto.startTime ? dto.startTime : entity.startTime);
        if (reqStartMs <= Date.now()) {
          entity.status = 'cancelled';
          await this.repository.save(entity);
          throw new BadRequestException(
            `Đơn đặt sân #${entity.id} đã quá thời gian bắt đầu nên hệ thống đã tự động huỷ đơn. Không thể thanh toán!`,
          );
        }

        const targetYardId = dto.yardId !== undefined ? dto.yardId : entity.yard?.id;
        const reqEndMs = toMs(dto.endTime ? dto.endTime : entity.endTime);

        if (targetYardId) {
          await this.checkMonthlyBookingConflicts(
            targetYardId,
            dto.startTime ? dto.startTime : entity.startTime,
            dto.endTime ? dto.endTime : entity.endTime,
          );

          const paidBookings = await this.repository.find({
            where: { yard: { id: targetYardId }, status: 'paid' },
            relations: { yard: true },
          });

          for (const pb of paidBookings) {
            if (pb.id === entity.id) continue;
            const pbStartMs = toMs(pb.startTime);
            const pbEndMs = toMs(pb.endTime);

            if (pbStartMs < reqEndMs && pbEndMs > reqStartMs) {
              const startStr = new Date(pb.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const endStr = new Date(pb.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const dateStr = new Date(pb.startTime).toLocaleDateString('vi-VN');

              entity.status = 'refund';
              await this.repository.save(entity);

              if (entity.user) {
                const userWallet = await this.walletRepository.findOne({ where: { userId: entity.user.id } });
                if (userWallet) {
                  await this.processRefund(entity.id, entity.user.id);
                  throw new BadRequestException(
                    `Rất tiếc! Sân đã được người khác thanh toán giữ lịch trước vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Đơn đặt của bạn đã được hoàn trực tiếp Xu vào ví tài khoản!`,
                  );
                }
              }

              throw new BadRequestException(
                `Rất tiếc! Sân đã được người khác thanh toán giữ lịch trước vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Vui lòng vào Giỏ hàng / Ví để nhận hoàn Xu.`,
              );
            }
          }
        }
      }

      if (dto.status === 'cancelled') {
        if (entity.status === 'paid') {
          throw new BadRequestException(
            'Đơn đặt sân đã thanh toán (status: paid) không thể chuyển sang trạng thái cancelled.',
          );
        }
        if (entity.status !== 'unpaid') {
          throw new BadRequestException(
            `Không thể chuyển đơn từ trạng thái "${entity.status}" sang "cancelled"`,
          );
        }
      }

      if (entity.status === 'cancelled') {
        throw new BadRequestException(
          'Đơn đặt sân đã bị hủy (cancelled) không thể thay đổi sang trạng thái khác.',
        );
      }
    }

    const { yardId, userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);

    if (dto.startTime) entity.startTime = new Date(dto.startTime);
    if (dto.endTime) entity.endTime = new Date(dto.endTime);

    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({
        where: { id: dto.yardId },
        relations: { vendor: true },
      });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
      }
      if (yardVal.vendor && yardVal.vendor.status !== 'active') {
        throw new BadRequestException(
          `Vendor of this yard is not active (status: ${yardVal.vendor.status})`,
        );
      }
      entity.yard = yardVal;
    }

    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
    }

    const savedBooking = await this.repository.save(entity);

    await this.syncYardStatusesRealtime();

    const sanitized = this.sanitizeBooking(savedBooking);
    return sanitized;
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.softDelete(id);
    await this.syncYardStatusesRealtime();
    return 'Delete success';
  }

  /**
   * Restores a soft-deleted booking record.
   */
  async restoreBooking(id: number) {
    await this.repository.restore(id);
    await this.syncYardStatusesRealtime();
    return { success: true, message: `Khôi phục đơn đặt sân #${id} thành công` };
  }

  /**
   * Handles event processing for handleExpiredBookings.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredBookings() {
    await this.cancelExpiredUnpaidBookings();
    await this.syncYardStatusesRealtime();
  }

  /**
   * Validates and verifies parameters for checkYardAvailability.
   */
  async checkYardAvailability(yardId: number, startTimeStr: string | Date, endTimeStr: string | Date) {
    if (!yardId || isNaN(yardId)) {
      throw new BadRequestException('yardId không hợp lệ');
    }
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isAvailable: true, message: 'Thời gian không xác định' };
    }

    const targetYard = await this.yardRepository.findOne({
      where: { id: yardId },
      relations: { vendor: true },
    });
    if (!targetYard) {
      return {
        isAvailable: false,
        message: 'Sân này không tồn tại hoặc đã ngừng hoạt động.',
      };
    }

    if (targetYard.vendor) {
      try {
        validateVendorOperatingHours(
          startTimeStr,
          endTimeStr,
          targetYard.vendor.openTime,
          targetYard.vendor.closeTime,
          targetYard.yardName,
        );
      } catch (e: any) {
        return {
          isAvailable: false,
          message: e.message || 'Thời gian đặt ngoài khung giờ hoạt động của sân',
        };
      }
    }

    const conflictBooking = await this.repository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.yard', 'yard')
      .where('b.yard_id = :yardId', { yardId })
      .andWhere('b.status = :status', { status: 'paid' })
      .andWhere('b.startTime < :reqEnd AND b.endTime > :reqStart', {
        reqEnd: end,
        reqStart: start,
      })
      .getOne();

    if (conflictBooking) {
      const startStr = new Date(conflictBooking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const endStr = new Date(conflictBooking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(conflictBooking.startTime).toLocaleDateString('vi-VN');

      const isLongTerm = (end.getTime() - start.getTime()) >= 24 * 60 * 60 * 1000;
      const message = isLongTerm
        ? `Không thể đặt theo gói dài hạn: Sân đã có người đặt lịch lẻ vào lúc ${startStr} - ${endStr} (ngày ${dateStr}) trong khoảng thời gian này. Vui lòng chọn thời gian khác hoặc đổi sân khác.`
        : `Sân đã được người khác thanh toán giữ lịch vào lúc ${startStr} - ${endStr} (ngày ${dateStr}).`;

      return {
        isAvailable: false,
        conflictBookingId: conflictBooking.id,
        message,
      };
    }

    // Check conflict with paid monthly bookings
    try {
      await this.checkMonthlyBookingConflicts(yardId, startTimeStr, endTimeStr);
    } catch (e: any) {
      return {
        isAvailable: false,
        message: e.message || 'Sân đã được người khác thanh toán gói tháng trong khung giờ này',
      };
    }

    return {
      isAvailable: true,
      message: 'Sân khả dụng trong khoảng thời gian này',
    };
  }

  /**
   * Processes payment for pending bookings using the user wallet balance atomically with ACID transaction.
   */
  async payBookingsWithWallet(userId: number, dto: PayBookingsWithWalletDto) {
    if (!dto.bookingIds || dto.bookingIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 sân để thanh toán.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const bookings = await queryRunner.manager.find(Booking, {
        where: dto.bookingIds.map((id) => ({ id, user: { id: userId } })),
        relations: {
          yard: {
            vendor: {
              user: true,
            },
          },
          user: true,
        },
      });

      if (bookings.length === 0) {
        throw new NotFoundException('Không tìm thấy đơn đặt sân phù hợp.');
      }

      const unpaidBookings = bookings.filter((b) => (b.status || 'unpaid') === 'unpaid');
      if (unpaidBookings.length === 0) {
        throw new BadRequestException('Các sân được chọn đều đã được thanh toán hoặc bị hủy.');
      }

      // Check if any unpaid booking has expired (startTime <= now)
      const nowMs = Date.now();
      const expiredBookings: Booking[] = [];

      for (const b of unpaidBookings) {
        const bStartMs = toMs(b.startTime);
        if (bStartMs <= nowMs) {
          b.status = 'cancelled';
          await queryRunner.manager.save(Booking, b);
          expiredBookings.push(b);
        }
      }

      if (expiredBookings.length > 0) {
        await queryRunner.commitTransaction();
        const expiredDetails = expiredBookings
          .map((b) => {
            const startStr = new Date(b.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(b.startTime).toLocaleDateString('vi-VN');
            const yardName = b.yard?.yardName || 'Sân';
            return `"${yardName}" (lúc ${startStr} ngày ${dateStr})`;
          })
          .join(', ');

        throw new BadRequestException(
          `Đơn đặt sân ${expiredDetails} đã quá thời gian bắt đầu nên hệ thống đã tự động huỷ đơn. Bạn không thể tiếp tục thanh toán đơn này!`,
        );
      }

      // Check slot conflict with lock
      for (const b of unpaidBookings) {
        if (b.yard && b.yard.id) {
          const conflictingPaid = await queryRunner.manager
            .createQueryBuilder(Booking, 'booking')
            .innerJoinAndSelect('booking.yard', 'yard')
            .where('yard.id = :yardId', { yardId: b.yard.id })
            .andWhere('booking.status = :status', { status: 'paid' })
            .andWhere('booking.id != :currentId', { currentId: b.id })
            .andWhere('booking.startTime < :reqEnd', { reqEnd: new Date(b.endTime) })
            .andWhere('booking.endTime > :reqStart', { reqStart: new Date(b.startTime) })
            .getOne();

          if (conflictingPaid) {
            const startStr = new Date(conflictingPaid.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const endStr = new Date(conflictingPaid.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(conflictingPaid.startTime).toLocaleDateString('vi-VN');
            const yardName = b.yard?.yardName || conflictingPaid.yard?.yardName || 'này';

            throw new BadRequestException(
              `Rất tiếc! Sân "${yardName}" đã được người khác thanh toán giữ lịch trước vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Vui lòng bỏ chọn sân này hoặc chọn khung giờ khác.`,
            );
          }

          // Check conflict with paid monthly bookings
          const bStartParts = getVietnamTimeParts(new Date(b.startTime));
          const bEndParts = getVietnamTimeParts(new Date(b.endTime));
          const bDate = bStartParts.dateStr;
          const bStartMins = parseInt(bStartParts.hours, 10) * 60 + parseInt(bStartParts.minutes, 10);
          const bEndMins = parseInt(bEndParts.hours, 10) * 60 + parseInt(bEndParts.minutes, 10);

          const paidMonthList = await queryRunner.manager
            .createQueryBuilder(BookingsMonth, 'bm')
            .innerJoinAndSelect('bm.yard', 'yard')
            .where('yard.id = :yardId', { yardId: b.yard.id })
            .andWhere('bm.status = :status', { status: 'paid' })
            .andWhere('bm.startDate <= :bDate AND bm.endDate >= :bDate', { bDate })
            .getMany();

          for (const pbm of paidMonthList) {
            const [bmSH, bmSM] = String(pbm.startTime).split(':').map(Number);
            const [bmEH, bmEM] = String(pbm.endTime).split(':').map(Number);
            const bmStartMins = (bmSH || 0) * 60 + (bmSM || 0);
            const bmEndMins = (bmEH || 0) * 60 + (bmEM || 0);

            if (bStartMins < bmEndMins && bEndMins > bmStartMins) {
              const yardName = b.yard?.yardName || 'này';
              throw new BadRequestException(
                `Rất tiếc! Sân "${yardName}" đã được người khác thanh toán gói tháng trước đó (#BM-${pbm.id}) trong khung giờ ${pbm.startTime} - ${pbm.endTime}. Vui lòng bỏ chọn sân này.`,
              );
            }
          }
        }
      }

      let totalAmount = 0;
      for (const b of unpaidBookings) {
        const price = Number(b.priced || b.yard?.price || 0);
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        const durationHours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
        const bookingCost = price > 0 ? (b.priced ? Number(b.priced) : price * durationHours) : 0;
        totalAmount += bookingCost;
      }

      let playerWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!playerWallet) {
        playerWallet = queryRunner.manager.create(Wallet, {
          userId,
          balance: 0,
        });
        await queryRunner.manager.save(Wallet, playerWallet);
      }

      const playerBalance = Number(playerWallet.balance || 0);
      if (playerBalance < totalAmount) {
        throw new BadRequestException(
          `Số dư Xu trong ví không đủ để thanh toán. Bạn hiện có ${playerBalance.toLocaleString('vi-VN')} Xu, tổng tiền cần thanh toán là ${totalAmount.toLocaleString('vi-VN')} Xu. Vui lòng nạp thêm Xu!`,
        );
      }

      const newPlayerBalance = playerBalance - totalAmount;
      playerWallet.balance = newPlayerBalance;
      await queryRunner.manager.save(Wallet, playerWallet);

      const playerTx = queryRunner.manager.create(CoinTransaction, {
        userId,
        type: CoinTransactionType.PAYMENT,
        amount: -totalAmount,
        balanceAfter: newPlayerBalance,
        transactionCode: `PAY_BOOKING_${Date.now()}_${userId}`,
        description: `Thanh toán ${unpaidBookings.length} đơn đặt sân qua Xu trong ví`,
        status: CoinTransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(CoinTransaction, playerTx);

      const savedPaidBookings: Booking[] = [];
      for (const booking of unpaidBookings) {
        const price = Number(booking.priced || booking.yard?.price || 0);
        const start = new Date(booking.startTime).getTime();
        const end = new Date(booking.endTime).getTime();
        const durationHours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
        const bookingCost = price > 0 ? (booking.priced ? Number(booking.priced) : price * durationHours) : 0;

        const vendorOwnerUserId = booking.yard?.vendor?.user?.id;
        if (vendorOwnerUserId) {
          let vendorWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: vendorOwnerUserId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!vendorWallet) {
            vendorWallet = queryRunner.manager.create(Wallet, {
              userId: vendorOwnerUserId,
              balance: 0,
            });
          }
          const currentVendorBalance = Number(vendorWallet.balance || 0);
          const newVendorBalance = currentVendorBalance + bookingCost;
          vendorWallet.balance = newVendorBalance;
          await queryRunner.manager.save(Wallet, vendorWallet);

          const vendorTx = queryRunner.manager.create(CoinTransaction, {
            userId: vendorOwnerUserId,
            type: CoinTransactionType.DEPOSIT,
            amount: bookingCost,
            balanceAfter: newVendorBalance,
            transactionCode: `REC_BOOKING_${booking.id}_${Date.now()}`,
            description: `Nhận tiền thanh toán thuê sân ${booking.yard?.yardName || ''} (Mã đơn #${booking.id}) từ người chơi ${user.username}`,
            status: CoinTransactionStatus.COMPLETED,
          });
          await queryRunner.manager.save(CoinTransaction, vendorTx);
        }

        booking.status = 'paid';
        const savedPaid = await queryRunner.manager.save(Booking, booking);
        savedPaidBookings.push(savedPaid);
      }

      await queryRunner.commitTransaction();

      // Async email notification dispatch after transaction commit
      if (user && user.email) {
        for (const savedPaidBooking of savedPaidBookings) {
          try {
            const qrInfo = this.getBookingQrInfo(savedPaidBooking);
            this.mailService.sendBookingConfirmationEmail(
              user.email,
              user.username,
              {
                id: savedPaidBooking.id,
                yardName: savedPaidBooking.yard?.yardName || 'Sân thi đấu',
                vendorName: savedPaidBooking.yard?.vendor?.vendorName,
                startTime: new Date(savedPaidBooking.startTime).toLocaleString('vi-VN'),
                endTime: new Date(savedPaidBooking.endTime).toLocaleString('vi-VN'),
                priced: Number(savedPaidBooking.priced || 0),
                verifyUrl: qrInfo.verifyUrl,
              },
            ).catch(() => { });
          } catch (err) {
          }
        }
      }

      return {
        success: true,
        message: `Thanh toán thành công ${unpaidBookings.length} sân bằng Xu!`,
        totalPaid: totalAmount,
        remainingBalance: newPlayerBalance,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Executes atomic process Refund operation.
   */
  async processRefund(bookingId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: bookingId, user: { id: userId } },
        relations: { yard: { vendor: true }, user: true },
      });

      if (!booking) {
        throw new NotFoundException(`Không tìm thấy đơn đặt sân #${bookingId}.`);
      }

      if (booking.status !== 'refund') {
        if (booking.status === 'refunded') {
          throw new BadRequestException(`Đơn đặt sân #${bookingId} đã được hoàn tiền thành công trước đó.`);
        }
        if (booking.status === 'cancelled') {
          throw new BadRequestException(`Đơn đặt sân #${bookingId} đã bị hủy.`);
        }
        throw new BadRequestException(`Đơn đặt sân #${bookingId} hiện không ở trạng thái chờ hoàn tiền.`);
      }

      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, { userId, balance: 0 });
      }

      const price = Number(booking.priced || booking.yard?.price || 0);
      const start = new Date(booking.startTime).getTime();
      const end = new Date(booking.endTime).getTime();
      const durationHours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
      const refundAmount = price > 0 ? (booking.priced ? Number(booking.priced) : price * durationHours) : 0;

      const currentBalance = Number(wallet.balance || 0);
      const newBalance = currentBalance + refundAmount;
      wallet.balance = newBalance;
      await queryRunner.manager.save(Wallet, wallet);

      const coinTx = queryRunner.manager.create(CoinTransaction, {
        userId,
        type: CoinTransactionType.REFUND,
        amount: refundAmount,
        balanceAfter: newBalance,
        transactionCode: `REFUND_BK_${booking.id}_${Date.now()}`,
        description: `Hoàn xu trực tiếp đơn đặt sân #${booking.id} (${booking.yard?.yardName || 'Sân tiêu chuẩn'})`,
        status: CoinTransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(CoinTransaction, coinTx);

      booking.status = 'refunded';
      await queryRunner.manager.save(Booking, booking);

      await queryRunner.commitTransaction();

      await this.syncYardStatusesRealtime();

      return {
        success: true,
        message: `Đã hoàn thành công ${refundAmount.toLocaleString('vi-VN')} Xu vào ví tài khoản của bạn! Đơn đặt sân đã chuyển sang trạng thái Đã Hoàn Tiền.`,
        refundedAmount: refundAmount,
        newBalance,
        bookingId: booking.id,
        status: 'refunded',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Allows user to cancel a future paid booking (automatically refunds if >= 1 hour before playtime).
   */
  async cancelPaidBooking(bookingId: number, userId: number) {
    const booking = await this.repository.findOne({
      where: { id: bookingId, user: { id: userId } },
      relations: { yard: { vendor: { user: true } }, user: true },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt sân #${bookingId}`);
    }

    if (booking.status !== 'paid') {
      throw new BadRequestException(`Chỉ có thể hủy đối với đơn đã thanh toán (trạng thái hiện tại: ${booking.status})`);
    }

    const nowMs = Date.now();
    const startMs = new Date(booking.startTime).getTime();
    const oneHourMs = 60 * 60 * 1000;

    if (startMs <= nowMs) {
      throw new BadRequestException('Không thể hủy đơn đặt sân khi đã đến hoặc quá giờ bắt đầu.');
    }

    if (startMs - nowMs < oneHourMs) {
      throw new BadRequestException('Đã gần tới giờ chơi (dưới 1 tiếng), hệ thống không cho phép hủy đơn đặt sân.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetUserId = booking.user?.id || userId;

      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, { userId: targetUserId, balance: 0 });
      }

      const price = Number(booking.priced || booking.yard?.price || 0);
      const start = new Date(booking.startTime).getTime();
      const end = new Date(booking.endTime).getTime();
      const durationHours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
      const refundAmount = price > 0 ? (booking.priced ? Number(booking.priced) : price * durationHours) : 0;

      const currentBalance = Number(wallet.balance || 0);
      const newBalance = currentBalance + refundAmount;
      wallet.balance = newBalance;
      await queryRunner.manager.save(Wallet, wallet);

      const coinTx = queryRunner.manager.create(CoinTransaction, {
        userId: targetUserId,
        type: CoinTransactionType.REFUND,
        amount: refundAmount,
        balanceAfter: newBalance,
        transactionCode: `REFUND_AUTO_BK_${booking.id}_${Date.now()}`,
        description: `Tự động hoàn tiền do người dùng hủy đơn đặt sân #${booking.id} (${booking.yard?.yardName || 'Sân'})`,
        status: CoinTransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(CoinTransaction, coinTx);

      booking.status = 'refunded';
      await queryRunner.manager.save(Booking, booking);

      await queryRunner.commitTransaction();

      await this.syncYardStatusesRealtime();

      // Send automated notification to customer
      try {
        await this.notificationsService.sendSystemNotification(
          targetUserId,
          'Hủy Đơn & Hoàn Tiền Thành Công',
          `Bạn đã hủy thành công đơn đặt sân "${booking.yard?.yardName || ''}" (#BK-${booking.id}). Hệ thống đã tự động hoàn ${refundAmount.toLocaleString('vi-VN')} Xu vào ví tài khoản của bạn!`,
          booking.yard?.vendor?.user?.id || undefined,
        );
      } catch (notifErr) {
        console.error('Failed to send auto refund notification:', notifErr);
      }

      return {
        success: true,
        message: `Đã hủy đơn thành công! Hệ thống đã tự động hoàn ${refundAmount.toLocaleString('vi-VN')} Xu vào ví của bạn.`,
        refundedAmount: refundAmount,
        booking,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validates and verifies parameters for verifyQrRedirect.
   */
  verifyQrRedirect(id: string, sig: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const targetUrl = `${frontendUrl}/verify-qr?id=${id || ''}&sig=${encodeURIComponent(sig || '')}`;
    return {
      url: targetUrl,
      statusCode: 302,
    };
  }

  /**
   * Validates and verifies parameters for verifyQr.
   */
  async verifyQr(bookingId: number, sig: string) {
    if (!bookingId || isNaN(bookingId)) {
      throw new BadRequestException('Mã đơn đặt sân (id) không hợp lệ');
    }
    if (!sig) {
      throw new BadRequestException('Mã chữ ký xác thực (sig) không được để trống');
    }

    const booking = await this.repository.findOne({
      where: { id: bookingId },
      relations: { yard: { vendor: true }, user: { detailUser: true } },
      withDeleted: true,
    });

    if (!booking) {
      throw new NotFoundException(`Đơn đặt sân với mã #${bookingId} không tồn tại trong hệ thống`);
    }

    const expectedSig = this.generateBookingSignature(booking);
    if (expectedSig.toLowerCase() !== sig.trim().toLowerCase()) {
      throw new BadRequestException(
        `Chữ ký xác thực QR không hợp lệ! Dữ liệu đơn đặt sân #${bookingId} có dấu hiệu bị thay đổi hoặc giả mạo.`,
      );
    }

    if (booking.status !== 'paid') {
      throw new BadRequestException(
        `Đơn đặt sân #${bookingId} chưa được thanh toán (Trạng thái hiện tại: ${booking.status || 'unpaid'}).`,
      );
    }

    const now = getVietnamDate();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    let timeStatus: 'upcoming' | 'active' | 'expired' = 'active';
    let timeMessage = '';

    if (now.getTime() > endTime.getTime()) {
      timeStatus = 'expired';
      timeMessage = `Đơn đặt sân đã quá hạn sử dụng (Khung giờ đã kết thúc lúc ${endTime.toLocaleString('vi-VN')}).`;
    } else if (now.getTime() < startTime.getTime()) {
      timeStatus = 'upcoming';
      timeMessage = `Đơn đặt sân chưa đến giờ thi đấu (Lịch bắt đầu lúc ${startTime.toLocaleString('vi-VN')}).`;
    } else {
      timeStatus = 'active';
      timeMessage = `Đơn đặt sân hợp lệ! Khách hàng đang trong khung giờ thi đấu.`;
    }

    return {
      success: true,
      valid: timeStatus !== 'expired',
      message: `Xác thực thành công đơn đặt sân #${bookingId}`,
      timeStatus,
      timeMessage,
      booking: {
        id: booking.id,
        yardId: booking.yard?.id,
        yardName: booking.yard?.yardName,
        vendorName: booking.yard?.vendor?.vendorName,
        vendorAddress: booking.yard?.vendor?.vendorAddress,
        username: booking.user?.username,
        email: booking.user?.email,
        phone: booking.user?.detailUser?.phone || '',
        userPhone: booking.user?.detailUser?.phone || '',
        startTime: booking.startTime,
        endTime: booking.endTime,
        priced: booking.priced,
        status: booking.status,
      },
    };
  }

}
