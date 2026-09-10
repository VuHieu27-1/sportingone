import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateBookingsMonthDto } from './dto/create-bookings_month.dto';
import { UpdateBookingsMonthDto } from './dto/update-bookings_month.dto';
import { BookingsMonth } from './entities/bookings_month.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  CoinTransaction,
  CoinTransactionType,
  CoinTransactionStatus,
} from '../coin_transactions/entities/coin_transaction.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getVietnamDate,
  getVietnamTimeParts,
  validateVendorOperatingHours,
} from '../../common/utils/date.util';
import { PayBookingsMonthWithWalletDto } from './dto/pay-wallet-bookings-month.dto';
import * as crypto from 'crypto';

/**
 * Normalizes time string to HH:mm format (e.g. "08:00:00" -> "08:00", "8:0" -> "08:00")
 */
function normalizeTimeStr(timeStr: string): string {
  if (!timeStr) return '00:00';
  const parts = timeStr.trim().split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Parses date string or Date object to YYYY-MM-DD string
 */
function toDateString(dateVal: string | Date): string {
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes(' ')) return trimmed.split(' ')[0];
    return trimmed;
  }
  const parts = getVietnamTimeParts(dateVal);
  return parts.dateStr;
}

/**
 * Combines date string (YYYY-MM-DD) and time string (HH:mm) into a timestamp in ms
 */
function toDateTimeMs(dateStr: string | Date, timeStr: string): number {
  const dStr = toDateString(dateStr);
  const tStr = normalizeTimeStr(timeStr);
  return new Date(`${dStr}T${tStr}:00+07:00`).getTime();
}

/**
 * Converts HH:mm to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  const norm = normalizeTimeStr(timeStr);
  const [h, m] = norm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class BookingsMonthService {
  constructor(
    @InjectRepository(BookingsMonth)
    private readonly repository: Repository<BookingsMonth>,
    @InjectRepository(Booking)
    private readonly dailyBookingRepository: Repository<Booking>,
    @InjectRepository(Yard)
    private readonly yardRepository: Repository<Yard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
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
   * Generates a secure SHA-256 digital signature for monthly booking QR verification.
   */
  generateBookingMonthSignature(booking: BookingsMonth): string {
    const bookingId = booking.id;
    const yardId = booking.yard?.id || (booking as any).yardId || 0;
    const userId = booking.user?.id || (booking as any).userId || 0;
    const priced = Number(booking.priced || 0);
    const startDate = toDateString(booking.startDate);
    const endDate = toDateString(booking.endDate);
    const startTime = normalizeTimeStr(booking.startTime);
    const endTime = normalizeTimeStr(booking.endTime);
    const secretKey = this.getSecretKey();

    const rawData = `monthBookingId=${bookingId}&yardId=${yardId}&userId=${userId}&priced=${priced}&startDate=${startDate}&endDate=${endDate}&startTime=${startTime}&endTime=${endTime}&${secretKey}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  /**
   * Generates QR code verification metadata and URL for a paid monthly booking.
   */
  getBookingMonthQrInfo(booking: BookingsMonth, appUrl?: string) {
    const sig = this.generateBookingMonthSignature(booking);
    const baseUrl = appUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify-qr?type=month&id=${booking.id}&sig=${sig}`;

    return {
      bookingId: booking.id,
      sig,
      verifyUrl,
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
        sig,
        verifyUrl,
      };
    }
    return booking;
  }

  private sanitizeBookingsMonth(bookings: BookingsMonth[]): any[] {
    return bookings.map((b) => this.sanitizeBookingMonth(b));
  }

  private validateBookingTimes(
    startDateStr: string | Date,
    endDateStr: string | Date,
    startTimeStr: string,
    endTimeStr: string,
  ) {
    const startDate = toDateString(startDateStr);
    const endDate = toDateString(endDateStr);
    const startTime = normalizeTimeStr(startTimeStr);
    const endTime = normalizeTimeStr(endTimeStr);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException(
        `Giờ kết thúc (${endTime}) phải lớn hơn giờ bắt đầu (${startTime}) trong ngày.`,
      );
    }

    const startDateTimeMs = toDateTimeMs(startDate, startTime);
    const endDateTimeMs = toDateTimeMs(endDate, endTime);

    if (isNaN(startDateTimeMs) || isNaN(endDateTimeMs)) {
      throw new BadRequestException('Ngày hoặc giờ đặt sân không hợp lệ.');
    }

    if (endDate < startDate) {
      throw new BadRequestException(
        `Ngày kết thúc gói tháng (${endDate}) phải lớn hơn hoặc bằng ngày bắt đầu (${startDate}).`,
      );
    }

    const now = getVietnamDate();
    const nowMs = now.getTime();

    if (startDateTimeMs <= nowMs) {
      throw new BadRequestException(
        'Thời gian bắt đầu gói tháng phải lớn hơn thời gian hiện tại.',
      );
    }
  }

  /**
   * Cross-conflict check for monthly bookings against:
   * 1. Other paid monthly bookings (BookingsMonth)
   * 2. Paid single-day bookings (Booking)
   */
  private async checkCrossConflicts(
    yardId: number,
    startDateStr: string | Date,
    endDateStr: string | Date,
    startTimeStr: string,
    endTimeStr: string,
    excludeBookingMonthId?: number,
  ) {
    const reqStartDate = toDateString(startDateStr);
    const reqEndDate = toDateString(endDateStr);
    const reqStartMins = timeToMinutes(startTimeStr);
    const reqEndMins = timeToMinutes(endTimeStr);

    // 1. Check conflict with paid monthly bookings
    const paidMonthlyBookings = await this.repository.find({
      where: { yard: { id: yardId }, status: 'paid' },
      relations: { yard: true },
    });

    for (const pbm of paidMonthlyBookings) {
      if (excludeBookingMonthId && pbm.id === excludeBookingMonthId) continue;

      const pbmStartDate = toDateString(pbm.startDate);
      const pbmEndDate = toDateString(pbm.endDate);
      const pbmStartMins = timeToMinutes(pbm.startTime);
      const pbmEndMins = timeToMinutes(pbm.endTime);

      // Date range overlap: pbmStartDate <= reqEndDate && pbmEndDate >= reqStartDate
      const dateOverlap = pbmStartDate <= reqEndDate && pbmEndDate >= reqStartDate;
      // Time-of-day overlap: pbmStartMins < reqEndMins && pbmEndMins > reqStartMins
      const timeOverlap = pbmStartMins < reqEndMins && pbmEndMins > reqStartMins;

      if (dateOverlap && timeOverlap) {
        throw new BadRequestException(
          `Sân đã có người thanh toán gói tháng #BM-${pbm.id} trong khoảng ${pbmStartDate} đến ${pbmEndDate} (khung giờ ${normalizeTimeStr(pbm.startTime)} - ${normalizeTimeStr(pbm.endTime)}). Vui lòng chọn khung giờ hoặc sân khác.`,
        );
      }
    }

    // 2. Check conflict with paid single-day bookings
    // Single bookings with startTime between reqStartDate and reqEndDate + 1 day
    const searchStart = new Date(`${reqStartDate}T00:00:00+07:00`);
    const searchEnd = new Date(`${reqEndDate}T23:59:59+07:00`);

    const paidDailyBookings = await this.dailyBookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.yard', 'yard')
      .where('yard.id = :yardId', { yardId })
      .andWhere('booking.status = :status', { status: 'paid' })
      .andWhere('booking.startTime <= :searchEnd AND booking.endTime >= :searchStart', {
        searchStart,
        searchEnd,
      })
      .getMany();

    for (const pb of paidDailyBookings) {
      const pbParts = getVietnamTimeParts(new Date(pb.startTime));
      const pbEndParts = getVietnamTimeParts(new Date(pb.endTime));

      const pbDate = pbParts.dateStr;
      if (pbDate >= reqStartDate && pbDate <= reqEndDate) {
        const pbStartMins = parseInt(pbParts.hours, 10) * 60 + parseInt(pbParts.minutes, 10);
        const pbEndMins = parseInt(pbEndParts.hours, 10) * 60 + parseInt(pbEndParts.minutes, 10);

        if (pbStartMins < reqEndMins && pbEndMins > reqStartMins) {
          const startStr = `${pbParts.hours}:${pbParts.minutes}`;
          const endStr = `${pbEndParts.hours}:${pbEndParts.minutes}`;
          const dateStr = pbParts.formattedDate;

          throw new BadRequestException(
            `Không thể đặt gói tháng: Sân đã có người đặt lịch lẻ vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Vui lòng chọn khung giờ khác hoặc đổi sân khác.`,
          );
        }
      }
    }
  }

  /**
   * Creates or saves record.
   */
  async create(dto: CreateBookingsMonthDto) {
    this.validateBookingTimes(
      dto.startDate,
      dto.endDate,
      dto.startTime,
      dto.endTime,
    );

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
      // Validate daily time range against vendor open/close hours
      const dummyStart = `2026-01-01T${normalizeTimeStr(dto.startTime)}:00`;
      const dummyEnd = `2026-01-01T${normalizeTimeStr(dto.endTime)}:00`;
      validateVendorOperatingHours(
        dummyStart,
        dummyEnd,
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

    // Check conflicts
    await this.checkCrossConflicts(
      dto.yardId,
      dto.startDate,
      dto.endDate,
      dto.startTime,
      dto.endTime,
    );

    const status = dto.status || 'unpaid';
    const cleanStartDate = toDateString(dto.startDate);
    const cleanEndDate = toDateString(dto.endDate);
    const cleanStartTime = normalizeTimeStr(dto.startTime);
    const cleanEndTime = normalizeTimeStr(dto.endTime);

    const { yardId, userId, ...cleanDto } = dto;
    const entity = this.repository.create({
      ...cleanDto,
      startDate: cleanStartDate,
      endDate: cleanEndDate,
      startTime: cleanStartTime,
      endTime: cleanEndTime,
      bookingType: dto.bookingType || 'month',
      status,
      yard: yardVal,
      user: userVal,
    } as DeepPartial<BookingsMonth>);

    const savedBookingMonth = await this.repository.save(entity);
    await this.syncYardStatusesRealtime();

    return this.sanitizeBookingMonth(savedBookingMonth);
  }

  /**
   * Automatically cancels unpaid monthly bookings whose start date & time is past the current time.
   */
  async cancelExpiredUnpaidBookingsMonth(): Promise<void> {
    const now = getVietnamDate();
    const nowParts = getVietnamTimeParts(now);
    const todayStr = nowParts.dateStr;
    const currentTimeStr = `${nowParts.hours}:${nowParts.minutes}:00`;

    // 1. Where startDate < today
    await this.repository
      .createQueryBuilder()
      .update(BookingsMonth)
      .set({ status: 'cancelled' })
      .where('status = :status', { status: 'unpaid' })
      .andWhere('startDate < :todayStr', { todayStr })
      .execute();

    // 2. Where startDate = today AND startTime <= currentTime
    await this.repository
      .createQueryBuilder()
      .update(BookingsMonth)
      .set({ status: 'cancelled' })
      .where('status = :status', { status: 'unpaid' })
      .andWhere('startDate = :todayStr', { todayStr })
      .andWhere('startTime <= :currentTimeStr', { currentTimeStr })
      .execute();
  }

  /**
   * Synchronizes yard statuses in real-time considering both daily and monthly bookings.
   */
  async syncYardStatusesRealtime() {
    const now = getVietnamDate();
    const nowParts = getVietnamTimeParts(now);
    const todayStr = nowParts.dateStr;
    const currentMins = parseInt(nowParts.hours, 10) * 60 + parseInt(nowParts.minutes, 10);

    const activeDaily = await this.dailyBookingRepository
      .createQueryBuilder('b')
      .select('b.yard_id', 'yardId')
      .where('b.status = :status', { status: 'paid' })
      .andWhere('b.startTime <= :now AND b.endTime > :now', { now })
      .getRawMany();

    const activeMonthly = await this.repository
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
      const bmStartMins = timeToMinutes(bm.startTime);
      const bmEndMins = timeToMinutes(bm.endTime);
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
   * Retrieves all monthly bookings with optional filters.
   */
  async findAll(query?: {
    yardId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    await this.cancelExpiredUnpaidBookingsMonth();
    await this.syncYardStatusesRealtime();

    const qb = this.repository
      .createQueryBuilder('bookingMonth')
      .withDeleted()
      .leftJoinAndSelect('bookingMonth.yard', 'yard')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('bookingMonth.user', 'user')
      .orderBy('bookingMonth.id', 'DESC');

    if (query?.yardId) {
      qb.andWhere('yard.id = :yardId', { yardId: query.yardId });
    }

    if (query?.status) {
      qb.andWhere('bookingMonth.status = :status', { status: query.status });
    }

    if (query?.startDate) {
      qb.andWhere('bookingMonth.endDate >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query?.endDate) {
      qb.andWhere('bookingMonth.startDate <= :endDate', {
        endDate: query.endDate,
      });
    }

    const list = await qb.getMany();
    return this.sanitizeBookingsMonth(list);
  }

  /**
   * Retrieves monthly bookings belonging to the currently logged-in user.
   */
  async findMyBookings(userId: number) {
    await this.cancelExpiredUnpaidBookingsMonth();
    await this.syncYardStatusesRealtime();

    const qb = this.repository
      .createQueryBuilder('bookingMonth')
      .withDeleted()
      .leftJoinAndSelect('bookingMonth.yard', 'yard')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('bookingMonth.user', 'user')
      .where('bookingMonth.user_id = :userId', { userId })
      .andWhere('bookingMonth.ondeleted IS NULL')
      .orderBy('bookingMonth.id', 'DESC');

    const list = await qb.getMany();
    return this.sanitizeBookingsMonth(list);
  }

  /**
   * Retrieves One monthly booking.
   */
  async findOne(id: number) {
    await this.syncYardStatusesRealtime();
    const entity = await this.repository.findOne({
      where: { id },
      relations: {
        yard: { vendor: true, sportType: true, typeYard: true },
        user: true,
      },
      withDeleted: true,
    });
    if (!entity) {
      throw new NotFoundException(`BookingMonth with ID ${id} not found`);
    }
    return this.sanitizeBookingMonth(entity);
  }

  /**
   * Updates monthly booking details.
   */
  async update(id: number, dto: UpdateBookingsMonthDto) {
    const entity = await this.findOne(id);

    const startDateToVal = dto.startDate !== undefined ? dto.startDate : entity.startDate;
    const endDateToVal = dto.endDate !== undefined ? dto.endDate : entity.endDate;
    const startTimeToVal = dto.startTime !== undefined ? dto.startTime : entity.startTime;
    const endTimeToVal = dto.endTime !== undefined ? dto.endTime : entity.endTime;

    if (
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.startTime !== undefined ||
      dto.endTime !== undefined
    ) {
      this.validateBookingTimes(
        startDateToVal,
        endDateToVal,
        startTimeToVal,
        endTimeToVal,
      );
    }

    const targetYardId = dto.yardId !== undefined ? dto.yardId : entity.yard?.id;

    if (dto.status !== undefined && dto.status !== entity.status) {
      if (dto.status === 'paid') {
        const startDateTimeMs = toDateTimeMs(startDateToVal, startTimeToVal);
        if (startDateTimeMs <= Date.now()) {
          entity.status = 'cancelled';
          await this.repository.save(entity);
          throw new BadRequestException(
            `Gói đặt sân tháng #BM-${entity.id} đã quá thời gian bắt đầu nên hệ thống đã tự động huỷ đơn. Không thể thanh toán!`,
          );
        }

        if (targetYardId) {
          await this.checkCrossConflicts(
            targetYardId,
            startDateToVal,
            endDateToVal,
            startTimeToVal,
            endTimeToVal,
            entity.id,
          );
        }
      }

      if (dto.status === 'cancelled') {
        if (entity.status === 'paid') {
          throw new BadRequestException(
            'Gói đặt sân tháng đã thanh toán (status: paid) không thể chuyển sang trạng thái cancelled.',
          );
        }
        if (entity.status !== 'unpaid') {
          throw new BadRequestException(
            `Không thể chuyển gói đặt từ trạng thái "${entity.status}" sang "cancelled"`,
          );
        }
      }

      if (entity.status === 'cancelled') {
        throw new BadRequestException(
          'Gói đặt sân tháng đã bị hủy (cancelled) không thể thay đổi sang trạng thái khác.',
        );
      }
    }

    const { yardId, userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);

    if (dto.startDate) entity.startDate = toDateString(dto.startDate);
    if (dto.endDate) entity.endDate = toDateString(dto.endDate);
    if (dto.startTime) entity.startTime = normalizeTimeStr(dto.startTime);
    if (dto.endTime) entity.endTime = normalizeTimeStr(dto.endTime);

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

    const saved = await this.repository.save(entity);
    await this.syncYardStatusesRealtime();

    return this.sanitizeBookingMonth(saved);
  }

  /**
   * Soft deletes monthly booking.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);
    if (entity.status == 'unpaid') {
      entity.status = 'cancelled';
      await this.repository.save(entity);
    }
    await this.repository.softDelete(id);
    await this.syncYardStatusesRealtime();
    return 'Delete success';
  }

  /**
   * Restores a soft-deleted monthly booking.
   */
  async restoreBookingMonth(id: number) {
    await this.repository.restore(id);
    await this.syncYardStatusesRealtime();
    return {
      success: true,
      message: `Khôi phục gói đặt sân theo tháng #BM-${id} thành công`,
    };
  }

  /**
   * Periodic cron job to cancel expired unpaid bookings.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredMonthlyBookings() {
    await this.cancelExpiredUnpaidBookingsMonth();
  }

  /**
   * Checks availability of a yard for a monthly booking.
   */
  async checkYardAvailability(
    yardId: number,
    startDateStr: string,
    endDateStr: string,
    startTimeStr: string,
    endTimeStr: string,
  ) {
    if (!yardId || isNaN(yardId)) {
      throw new BadRequestException('yardId không hợp lệ');
    }
    if (!startDateStr || !endDateStr || !startTimeStr || !endTimeStr) {
      return { isAvailable: false, message: 'Vui lòng cung cấp đầy đủ startDate, endDate, startTime, endTime' };
    }

    const targetYard = await this.yardRepository.findOne({
      where: { id: yardId },
      relations: { vendor: true },
    });
    if (!targetYard) {
      return { isAvailable: false, message: 'Sân này không tồn tại hoặc đã ngừng hoạt động.' };
    }

    if (targetYard.vendor) {
      try {
        const dummyStart = `2026-01-01T${normalizeTimeStr(startTimeStr)}:00`;
        const dummyEnd = `2026-01-01T${normalizeTimeStr(endTimeStr)}:00`;
        validateVendorOperatingHours(
          dummyStart,
          dummyEnd,
          targetYard.vendor.openTime,
          targetYard.vendor.closeTime,
          targetYard.yardName,
        );
      } catch (e: any) {
        return {
          isAvailable: false,
          message: e.message || 'Khung giờ đặt ngoài giờ mở cửa của sân',
        };
      }
    }

    try {
      await this.checkCrossConflicts(
        yardId,
        startDateStr,
        endDateStr,
        startTimeStr,
        endTimeStr,
      );
      return {
        isAvailable: true,
        message: 'Sân khả dụng cho gói đặt theo tháng trong khoảng thời gian này!',
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        message: err.message || 'Sân đã bị trùng lịch đặt trước đó',
      };
    }
  }

  /**
   * Processes wallet payment for monthly bookings with ACID transaction & pessimistic locking.
   */
  async payBookingsMonthWithWallet(
    userId: number,
    dto: PayBookingsMonthWithWalletDto,
  ) {
    if (!dto.bookingMonthIds || dto.bookingMonthIds.length === 0) {
      throw new BadRequestException(
        'Vui lòng chọn ít nhất 1 gói đặt sân theo tháng để thanh toán.',
      );
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

      const bookingsMonth = await queryRunner.manager.find(BookingsMonth, {
        where: dto.bookingMonthIds.map((id) => ({ id, user: { id: userId } })),
        relations: {
          yard: {
            vendor: {
              user: true,
            },
          },
          user: true,
        },
      });

      if (bookingsMonth.length === 0) {
        throw new NotFoundException('Không tìm thấy gói đặt sân theo tháng phù hợp.');
      }

      const unpaidList = bookingsMonth.filter(
        (b) => (b.status || 'unpaid') === 'unpaid',
      );
      if (unpaidList.length === 0) {
        throw new BadRequestException(
          'Tất cả gói đặt sân tháng được chọn đều đã được thanh toán hoặc bị hủy.',
        );
      }

      // Check expired
      const now = getVietnamDate();
      const nowMs = now.getTime();
      const expiredList: BookingsMonth[] = [];

      for (const bm of unpaidList) {
        const startMs = toDateTimeMs(bm.startDate, bm.startTime);
        if (startMs <= nowMs) {
          bm.status = 'cancelled';
          await queryRunner.manager.save(BookingsMonth, bm);
          expiredList.push(bm);
        }
      }

      if (expiredList.length > 0) {
        await queryRunner.commitTransaction();
        const details = expiredList
          .map(
            (b) =>
              `"#BM-${b.id}" (bắt đầu ngày ${toDateString(b.startDate)} lúc ${b.startTime})`,
          )
          .join(', ');
        throw new BadRequestException(
          `Gói đặt sân ${details} đã quá thời gian bắt đầu nên hệ thống đã tự động huỷ. Bạn không thể tiếp tục thanh toán!`,
        );
      }

      // Check slot conflict with lock
      for (const bm of unpaidList) {
        if (bm.yard && bm.yard.id) {
          // Check conflict with other paid monthly bookings
          const reqStartDate = toDateString(bm.startDate);
          const reqEndDate = toDateString(bm.endDate);
          const reqStartMins = timeToMinutes(bm.startTime);
          const reqEndMins = timeToMinutes(bm.endTime);

          const conflictPaidMonth = await queryRunner.manager
            .createQueryBuilder(BookingsMonth, 'bm')
            .innerJoinAndSelect('bm.yard', 'yard')
            .where('yard.id = :yardId', { yardId: bm.yard.id })
            .andWhere('bm.status = :status', { status: 'paid' })
            .andWhere('bm.id != :currentId', { currentId: bm.id })
            .andWhere('bm.startDate <= :reqEndDate AND bm.endDate >= :reqStartDate', {
              reqStartDate,
              reqEndDate,
            })
            .getMany();

          for (const cpm of conflictPaidMonth) {
            const cStartMins = timeToMinutes(cpm.startTime);
            const cEndMins = timeToMinutes(cpm.endTime);
            if (cStartMins < reqEndMins && cEndMins > reqStartMins) {
              const yardName = bm.yard?.yardName || 'này';
              throw new BadRequestException(
                `Rất tiếc! Sân "${yardName}" đã được người khác thanh toán gói tháng trước đó (#BM-${cpm.id}) trong khung giờ ${cpm.startTime} - ${cpm.endTime}. Vui lòng đổi khung giờ hoặc chọn sân khác.`,
              );
            }
          }

          // Check conflict with paid single daily bookings
          const searchStart = new Date(`${reqStartDate}T00:00:00+07:00`);
          const searchEnd = new Date(`${reqEndDate}T23:59:59+07:00`);

          const conflictPaidDaily = await queryRunner.manager
            .createQueryBuilder(Booking, 'b')
            .innerJoinAndSelect('b.yard', 'yard')
            .where('yard.id = :yardId', { yardId: bm.yard.id })
            .andWhere('b.status = :status', { status: 'paid' })
            .andWhere('b.startTime <= :searchEnd AND b.endTime >= :searchStart', {
              searchStart,
              searchEnd,
            })
            .getMany();

          for (const cpd of conflictPaidDaily) {
            const pbParts = getVietnamTimeParts(new Date(cpd.startTime));
            const pbEndParts = getVietnamTimeParts(new Date(cpd.endTime));
            const pbDate = pbParts.dateStr;

            if (pbDate >= reqStartDate && pbDate <= reqEndDate) {
              const pbStartMins = parseInt(pbParts.hours, 10) * 60 + parseInt(pbParts.minutes, 10);
              const pbEndMins = parseInt(pbEndParts.hours, 10) * 60 + parseInt(pbEndParts.minutes, 10);

              if (pbStartMins < reqEndMins && pbEndMins > reqStartMins) {
                const startStr = `${pbParts.hours}:${pbParts.minutes}`;
                const endStr = `${pbEndParts.hours}:${pbEndParts.minutes}`;
                const dateStr = pbParts.formattedDate;
                const yardName = bm.yard?.yardName || 'này';

                throw new BadRequestException(
                  `Rất tiếc! Sân "${yardName}" đã có người thanh toán lịch lẻ vào lúc ${startStr} - ${endStr} (ngày ${dateStr}). Vui lòng chọn khung giờ khác.`,
                );
              }
            }
          }
        }
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const bm of unpaidList) {
        let bookingCost = Number(bm.priced || 0);
        if (bookingCost <= 0) {
          const yardRate = Number(bm.yard?.price || 0);
          const startMins = timeToMinutes(bm.startTime);
          const endMins = timeToMinutes(bm.endTime);
          const durationHours = Math.max(1, (endMins - startMins) / 60);

          // Calculate total days
          const startD = new Date(`${toDateString(bm.startDate)}T00:00:00`);
          const endD = new Date(`${toDateString(bm.endDate)}T00:00:00`);
          const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          bookingCost = yardRate * durationHours * diffDays;
        }
        totalAmount += bookingCost;
      }

      // Check player wallet balance
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

      // Create transaction record for user
      const playerTx = queryRunner.manager.create(CoinTransaction, {
        userId,
        type: CoinTransactionType.PAYMENT,
        amount: -totalAmount,
        balanceAfter: newPlayerBalance,
        transactionCode: `PAY_MONTH_${Date.now()}_${userId}`,
        description: `Thanh toán ${unpaidList.length} gói đặt sân theo tháng qua Xu trong ví`,
        status: CoinTransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(CoinTransaction, playerTx);

      const savedPaidBookingsMonth: BookingsMonth[] = [];
      for (const bm of unpaidList) {
        let bookingCost = Number(bm.priced || 0);
        if (bookingCost <= 0) {
          const yardRate = Number(bm.yard?.price || 0);
          const startMins = timeToMinutes(bm.startTime);
          const endMins = timeToMinutes(bm.endTime);
          const durationHours = Math.max(1, (endMins - startMins) / 60);

          const startD = new Date(`${toDateString(bm.startDate)}T00:00:00`);
          const endD = new Date(`${toDateString(bm.endDate)}T00:00:00`);
          const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          bookingCost = yardRate * durationHours * diffDays;
          bm.priced = bookingCost;
        }

        const vendorOwnerUserId = bm.yard?.vendor?.user?.id;
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
            transactionCode: `REC_BM_${bm.id}_${Date.now()}`,
            description: `Nhận tiền thanh toán gói tháng sân ${bm.yard?.yardName || ''} (Mã #BM-${bm.id}) từ người chơi ${user.username}`,
            status: CoinTransactionStatus.COMPLETED,
          });
          await queryRunner.manager.save(CoinTransaction, vendorTx);
        }

        bm.status = 'paid';
        const savedPaid = await queryRunner.manager.save(BookingsMonth, bm);
        savedPaidBookingsMonth.push(savedPaid);
      }

      await queryRunner.commitTransaction();

      // Async email notification dispatch
      if (user && user.email) {
        for (const savedPaid of savedPaidBookingsMonth) {
          try {
            const qrInfo = this.getBookingMonthQrInfo(savedPaid);
            this.mailService
              .sendBookingMonthConfirmationEmail(user.email, user.username, {
                id: savedPaid.id,
                yardName: savedPaid.yard?.yardName || 'Sân thi đấu',
                vendorName: savedPaid.yard?.vendor?.vendorName,
                startDate: toDateString(savedPaid.startDate),
                endDate: toDateString(savedPaid.endDate),
                startTime: savedPaid.startTime,
                endTime: savedPaid.endTime,
                bookingType: savedPaid.bookingType,
                priced: Number(savedPaid.priced || 0),
                verifyUrl: qrInfo.verifyUrl,
              })
              .catch(() => { });
          } catch (err) { }
        }
      }

      return {
        success: true,
        message: `Thanh toán thành công ${unpaidList.length} gói đặt sân theo tháng bằng Xu!`,
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
   * Processes direct Xu refund for monthly booking in 'refund' status.
   */
  async processRefund(bookingMonthId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const bm = await queryRunner.manager.findOne(BookingsMonth, {
        where: { id: bookingMonthId, user: { id: userId } },
        relations: { yard: { vendor: true }, user: true },
      });

      if (!bm) {
        throw new NotFoundException(
          `Không tìm thấy gói đặt sân theo tháng #BM-${bookingMonthId}.`,
        );
      }

      if (bm.status !== 'refund') {
        if (bm.status === 'refunded') {
          throw new BadRequestException(
            `Gói đặt sân tháng #BM-${bookingMonthId} đã được hoàn tiền thành công trước đó.`,
          );
        }
        if (bm.status === 'cancelled') {
          throw new BadRequestException(
            `Gói đặt sân tháng #BM-${bookingMonthId} đã bị hủy.`,
          );
        }
        throw new BadRequestException(
          `Gói đặt sân tháng #BM-${bookingMonthId} hiện không ở trạng thái chờ hoàn tiền.`,
        );
      }

      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, { userId, balance: 0 });
      }

      const refundAmount = Number(bm.priced || 0);
      const currentBalance = Number(wallet.balance || 0);
      const newBalance = currentBalance + refundAmount;
      wallet.balance = newBalance;
      await queryRunner.manager.save(Wallet, wallet);

      const coinTx = queryRunner.manager.create(CoinTransaction, {
        userId,
        type: CoinTransactionType.REFUND,
        amount: refundAmount,
        balanceAfter: newBalance,
        transactionCode: `REFUND_BM_${bm.id}_${Date.now()}`,
        description: `Hoàn xu gói đặt sân theo tháng #BM-${bm.id} (${bm.yard?.yardName || 'Sân'})`,
        status: CoinTransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(CoinTransaction, coinTx);

      bm.status = 'refunded';
      await queryRunner.manager.save(BookingsMonth, bm);

      await queryRunner.commitTransaction();
      await this.syncYardStatusesRealtime();

      return {
        success: true,
        message: `Đã hoàn thành công ${refundAmount.toLocaleString('vi-VN')} Xu vào ví của bạn! Gói đặt sân đã chuyển sang Đã Hoàn Tiền.`,
        refundedAmount: refundAmount,
        newBalance,
        bookingMonthId: bm.id,
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
   * Paid monthly bookings cannot be cancelled by users.
   */
  async cancelPaidBookingMonth(bookingMonthId: number, userId: number) {
    const bm = await this.repository.findOne({
      where: { id: bookingMonthId, user: { id: userId } },
      relations: { yard: { vendor: { user: true } }, user: true },
    });

    if (!bm) {
      throw new NotFoundException(
        `Không tìm thấy gói đặt sân theo tháng #BM-${bookingMonthId}`,
      );
    }

    throw new BadRequestException(
      'Gói đặt sân theo tháng đã thanh toán không hỗ trợ tự hủy đơn trên hệ thống. Vui lòng liên hệ trực tiếp chủ sân nếu cần hỗ trợ.',
    );
  }

  /**
   * QR Redirect verification.
   */
  verifyQrRedirect(id: string, sig: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const targetUrl = `${frontendUrl}/verify-qr?type=month&id=${id || ''}&sig=${encodeURIComponent(sig || '')}`;
    return {
      url: targetUrl,
      statusCode: 302,
    };
  }

  /**
   * Verifies QR code and returns active validity for monthly booking.
   */
  async verifyQr(bookingMonthId: number, sig: string) {
    if (!bookingMonthId || isNaN(bookingMonthId)) {
      throw new BadRequestException('Mã gói đặt sân tháng (id) không hợp lệ');
    }
    if (!sig) {
      throw new BadRequestException('Mã chữ ký xác thực (sig) không được để trống');
    }

    const bm = await this.repository.findOne({
      where: { id: bookingMonthId },
      relations: { yard: { vendor: true, sportType: true, typeYard: true }, user: { detailUser: true } },
      withDeleted: true,
    });

    if (!bm) {
      throw new NotFoundException(
        `Gói đặt sân tháng với mã #BM-${bookingMonthId} không tồn tại trong hệ thống`,
      );
    }

    const expectedSig = this.generateBookingMonthSignature(bm);
    if (expectedSig.toLowerCase() !== sig.trim().toLowerCase()) {
      throw new BadRequestException(
        `Chữ ký xác thực QR không hợp lệ! Dữ liệu gói đặt sân tháng #BM-${bookingMonthId} có dấu hiệu bị thay đổi hoặc giả mạo.`,
      );
    }

    if (bm.status !== 'paid') {
      throw new BadRequestException(
        `Gói đặt sân tháng #BM-${bookingMonthId} chưa được thanh toán (Trạng thái hiện tại: ${bm.status || 'unpaid'}).`,
      );
    }

    const now = getVietnamDate();
    const nowParts = getVietnamTimeParts(now);
    const todayStr = nowParts.dateStr;
    const currentMins = parseInt(nowParts.hours, 10) * 60 + parseInt(nowParts.minutes, 10);

    const startDateStr = toDateString(bm.startDate);
    const endDateStr = toDateString(bm.endDate);
    const startMins = timeToMinutes(bm.startTime);
    const endMins = timeToMinutes(bm.endTime);

    let timeStatus: 'upcoming' | 'active' | 'expired' = 'active';
    let timeMessage = '';

    if (todayStr > endDateStr) {
      timeStatus = 'expired';
      timeMessage = `Gói đặt sân tháng đã hết hạn (Thời hạn kết thúc ngày ${endDateStr}).`;
    } else if (todayStr < startDateStr) {
      timeStatus = 'upcoming';
      timeMessage = `Gói đặt sân tháng chưa đến ngày bắt đầu (Bắt đầu từ ngày ${startDateStr}).`;
    } else {
      // Within date range, check time of day
      if (currentMins >= startMins && currentMins < endMins) {
        timeStatus = 'active';
        timeMessage = `Gói đặt sân tháng hợp lệ! Khách hàng đang trong khung giờ thi đấu hàng ngày (${bm.startTime} - ${bm.endTime}).`;
      } else if (currentMins < startMins) {
        timeStatus = 'active';
        timeMessage = `Gói đặt sân tháng còn hiệu lực! Chưa tới khung giờ thi đấu hôm nay (${bm.startTime} - ${bm.endTime}).`;
      } else {
        timeStatus = 'active';
        timeMessage = `Gói đặt sân tháng còn hiệu lực! Khung giờ thi đấu hôm nay (${bm.startTime} - ${bm.endTime}) đã kết thúc.`;
      }
    }

    return {
      success: true,
      valid: timeStatus !== 'expired',
      message: `Xác thực thành công gói đặt sân tháng #BM-${bookingMonthId}`,
      timeStatus,
      timeMessage,
      bookingMonth: {
        id: bm.id,
        yardId: bm.yard?.id,
        yardName: bm.yard?.yardName,
        vendorName: bm.yard?.vendor?.vendorName,
        vendorAddress: bm.yard?.vendor?.vendorAddress,
        sportName: bm.yard?.sportType?.sportName || 'Thể thao',
        typeName: bm.yard?.typeYard?.typeName || 'Sân tiêu chuẩn',
        username: bm.user?.username,
        email: bm.user?.email,
        phone: bm.user?.detailUser?.phone || (bm.user as any)?.phone || '',
        userPhone: bm.user?.detailUser?.phone || (bm.user as any)?.phone || '',
        startDate: bm.startDate,
        endDate: bm.endDate,
        startTime: bm.startTime,
        endTime: bm.endTime,
        bookingType: bm.bookingType,
        priced: bm.priced,
        status: bm.status,
      },
    };
  }
}
