import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, DataSource } from 'typeorm';
import { CreateYardDto } from './dto/create-yard.dto';
import { UpdateYardDto } from './dto/update-yard.dto';
import { Yard } from './entities/yard.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Types } from '../types/entities/type.entity';
import { UserAddress } from '../user_address/entities/user_address.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingsMonth } from '../bookings_month/entities/bookings_month.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  CoinTransaction,
  CoinTransactionType,
  CoinTransactionStatus,
} from '../coin_transactions/entities/coin_transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { getVietnamDate, getVietnamTimeParts } from '../../common/utils/date.util';
import { calculateHaversineDistance } from '../../common/utils/distance.util';
import { calculatePriorityScore } from '../../common/utils/priority-score.util';

@Injectable()
export class YardsService {
  constructor(
    @InjectRepository(Yard) private readonly repository: Repository<Yard>,
    @InjectRepository(SportType)
    private readonly sportTypeRepository: Repository<SportType>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Types)
    private readonly typeYardRepository: Repository<Types>,
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepository: Repository<CoinTransaction>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Creates or saves record.
   */
  async create(dto: CreateYardDto) {
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Yard>);
    if (!entity.status) {
      entity.status = 'available';
    }

    if (dto.vendorId) {
      const vendorVal = await this.vendorRepository.findOne({
        where: { id: dto.vendorId },
      });
      if (!vendorVal) {
        throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
      }
      entity.vendor = vendorVal;
    }

    if (dto.sportTypeId) {
      const sportTypeVal = await this.sportTypeRepository.findOne({
        where: { id: dto.sportTypeId },
      });
      if (sportTypeVal) entity.sportType = sportTypeVal;
    }

    if (dto.saleId) {
      const saleVal = await this.saleRepository.findOne({
        where: { id: dto.saleId },
      });
      if (saleVal) entity.sale = saleVal;
    }

    if (dto.typeYardId) {
      const typeYardVal = await this.typeYardRepository.findOne({
        where: { id: dto.typeYardId },
      });
      if (typeYardVal) entity.typeYard = typeYardVal;
    }

    return this.repository.save(entity);
  }

  /**
   * Dedicated API Endpoint for Admin & Vendor to paginate Yards using SQL LIMIT & OFFSET
   */
  async findAdminVendorPaginated(query: {
    page?: number;
    limit?: number;
    vendorId?: number;
    userId?: number;
    search?: string;
  }) {
    const pageNum = Math.max(1, Number(query.page) || 1);
    const limitNum = Math.max(1, Number(query.limit) || 8);
    const offsetNum = (pageNum - 1) * limitNum;

    const qb = this.repository
      .createQueryBuilder('yard')
      .withDeleted()
      .leftJoinAndSelect('yard.sportType', 'sportType')
      .leftJoinAndSelect('yard.vendor', 'vendor')
      .leftJoinAndSelect('yard.sale', 'sale')
      .leftJoinAndSelect('yard.typeYard', 'typeYard')
      .leftJoinAndSelect('yard.images', 'images')
      .leftJoinAndSelect('vendor.user', 'user')
      .orderBy('yard.id', 'DESC')
      .limit(limitNum)
      .offset(offsetNum);

    if (query.vendorId) {
      qb.andWhere('vendor.id = :vendorId', { vendorId: query.vendorId });
    }

    if (query.userId) {
      qb.andWhere('user.id = :userId', { userId: query.userId });
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      qb.andWhere(
        '(yard.yardName LIKE :search OR vendor.vendorName LIKE :search)',
        { search: searchPattern },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
  }

  /**
   * Retrieves All information including soft-deleted yards for Admin.
   */
  async findAll() {
    return this.repository.find({
      withDeleted: true,
      relations: { sportType: true, vendor: true, sale: true, typeYard: true, images: true },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieves MyYards information.
   */
  async findMyYards(currentUserId: number) {
    return this.repository.find({
      where: { vendor: { user: { id: currentUserId }, status: 'active' } },
      relations: { sportType: true, vendor: true, sale: true, typeYard: true, images: true },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { sportType: true, vendor: { user: true }, sale: true, typeYard: true, images: true },
    });
    if (!entity) {
      throw new NotFoundException(`Yard with ID ${id} not found`);
    }

    try {
      const statsQuery = await this.dataSource.query(
        `SELECT AVG(rating) AS avg_rating, COUNT(id) AS total_reviews 
         FROM rates 
         WHERE yard_id = ? AND rate_id IS NULL AND status = 'active' AND rating IS NOT NULL AND ondeleted IS NULL`,
        [id],
      );
      const avg = statsQuery?.[0]?.avg_rating ? Number(parseFloat(statsQuery[0].avg_rating).toFixed(1)) : 0;
      const total = statsQuery?.[0]?.total_reviews ? Number(statsQuery[0].total_reviews) : 0;
      (entity as any).rating = avg;
      (entity as any).averageRating = avg;
      (entity as any).totalReviews = total;
    } catch {
      (entity as any).rating = 0;
      (entity as any).averageRating = 0;
      (entity as any).totalReviews = 0;
    }

    return entity;
  }

  /**
   * Retrieves YardByVendor information.
   */
  async findYardByVendor(vendorId: number) {
    const yards = await this.repository.find({
      where: { vendor: { id: vendorId, status: 'active' } },
      relations: { sportType: true, vendor: true, sale: true, typeYard: true, images: true },
      order: { id: 'DESC' },
    });

    try {
      const rateStatsQuery: { yard_id: number; avg_rating: string; total_reviews: string }[] = await this.dataSource.query(`
        SELECT yard_id, AVG(rating) AS avg_rating, COUNT(id) AS total_reviews 
        FROM rates 
        WHERE rate_id IS NULL AND status = 'active' AND rating IS NOT NULL AND ondeleted IS NULL
        GROUP BY yard_id
      `);

      const rateStatsMap = new Map<number, { averageRating: number; totalReviews: number }>();
      rateStatsQuery.forEach((row) => {
        rateStatsMap.set(Number(row.yard_id), {
          averageRating: Number(parseFloat(row.avg_rating || '0').toFixed(1)),
          totalReviews: Number(row.total_reviews || 0),
        });
      });

      return yards.map((y) => {
        const stats = rateStatsMap.get(y.id) || { averageRating: 0, totalReviews: 0 };
        return {
          ...y,
          rating: stats.averageRating,
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
        };
      });
    } catch {
      return yards;
    }
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateYardDto) {
    const entity = await this.findOne(id);
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);

    if (dto.sportTypeId !== undefined) {
      if (dto.sportTypeId === null) {
        entity.sportType = null as any;
      } else {
        const sportTypeVal = await this.sportTypeRepository.findOne({
          where: { id: dto.sportTypeId },
        });
        if (sportTypeVal) entity.sportType = sportTypeVal;
      }
    }

    if (dto.vendorId !== undefined) {
      if (dto.vendorId === null) {
        entity.vendor = null as any;
      } else {
        const vendorVal = await this.vendorRepository.findOne({
          where: { id: dto.vendorId },
        });
        if (vendorVal) entity.vendor = vendorVal;
      }
    }

    if (dto.saleId !== undefined) {
      if (dto.saleId === null) {
        entity.sale = null as any;
      } else {
        const saleVal = await this.saleRepository.findOne({
          where: { id: dto.saleId },
        });
        if (saleVal) entity.sale = saleVal;
      }
    }

    if (dto.typeYardId !== undefined) {
      if (dto.typeYardId === null) {
        entity.typeYard = null as any;
      } else {
        const typeYardVal = await this.typeYardRepository.findOne({
          where: { id: dto.typeYardId },
        });
        if (typeYardVal) entity.typeYard = typeYardVal;
      }
    }

    return this.repository.save(entity);
  }

  /**
   * Deletes or cancels yard record.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);
    if (!entity) {
      throw new NotFoundException(`Yard with ID ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = getVietnamDate();
      const futureBookings = await queryRunner.manager
        .createQueryBuilder(Booking, 'booking')
        .leftJoinAndSelect('booking.user', 'user')
        .leftJoinAndSelect('booking.yard', 'yard')
        .leftJoinAndSelect('yard.vendor', 'vendor')
        .where('booking.yard_id = :yardId', { yardId: id })
        .andWhere('booking.endTime > :now', { now })
        .andWhere('booking.ondeleted IS NULL')
        .andWhere('booking.status IN (:...statuses)', { statuses: ['paid', 'unpaid', 'refund'] })
        .orderBy('booking.id', 'ASC')
        .getMany();

      let refundedCount = 0;
      let totalRefundAmount = 0;
      const notificationsToSend: { userId: number; title: string; content: string }[] = [];

      // 2. Process refund for each future booking
      for (const booking of futureBookings) {
        if (booking.status === 'paid' || booking.status === 'refund') {
          // Calculate refund amount
          const price = Number(booking.priced || booking.yard?.price || entity.price || 0);
          const startMs = new Date(booking.startTime).getTime();
          const endMs = new Date(booking.endTime).getTime();
          const durationHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
          const refundAmount =
            price > 0
              ? booking.priced && Number(booking.priced) > 0
                ? Number(booking.priced)
                : price * durationHours
              : 0;

          if (booking.user) {
            const userId = booking.user.id;

            // Find or create wallet for user
            let wallet = await queryRunner.manager.findOne(Wallet, {
              where: { userId },
              lock: { mode: 'pessimistic_write' },
            });
            if (!wallet) {
              wallet = queryRunner.manager.create(Wallet, { userId, balance: 0 });
            }

            if (refundAmount > 0) {
              const currentBalance = Number(wallet.balance || 0);
              const newBalance = currentBalance + refundAmount;
              wallet.balance = newBalance;
              await queryRunner.manager.save(Wallet, wallet);

              const coinTx = queryRunner.manager.create(CoinTransaction, {
                userId,
                type: CoinTransactionType.REFUND,
                amount: refundAmount,
                balanceAfter: newBalance,
                transactionCode: `REFUND_YARD_DEL_${booking.id}_${Date.now()}`,
                description: `Hoàn tiền đặt sân (${entity.yardName}) do sân bị ngừng hoạt động / xóa`,
                status: CoinTransactionStatus.COMPLETED,
              });
              await queryRunner.manager.save(CoinTransaction, coinTx);

              refundedCount++;
              totalRefundAmount += refundAmount;

              const startStr = new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(booking.startTime).toLocaleDateString('vi-VN');
              const endStr = new Date(booking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(booking.endTime).toLocaleDateString('vi-VN');

              notificationsToSend.push({
                userId,
                title: `[Sporting ONE] Hoàn tiền đơn đặt sân`,
                content: `Sân thi đấu "${entity.yardName}" hiện đã bị xóa khỏi hệ thống. Chúng tôi đã hoàn trả ${refundAmount.toLocaleString('vi-VN')} Xu vào ví tài khoản (Wallet) cho đơn đặt sân (${startStr} - ${endStr}) của bạn. Vui lòng kiểm tra ví tài khoản của bạn!`,
              });
            }
          }

          // Mark booking as refunded
          booking.status = 'refunded';
          await queryRunner.manager.save(Booking, booking);
        } else if (booking.status === 'unpaid') {
          // Unpaid future booking: cancel it
          booking.status = 'cancelled';
          await queryRunner.manager.save(Booking, booking);

          if (booking.user) {
            notificationsToSend.push({
              userId: booking.user.id,
              title: `[Sporting ONE] Hủy đơn đặt sân`,
              content: `Sân thi đấu "${entity.yardName}" hiện đã bị xóa khỏi hệ thống. Đơn đặt sân chưa thanh toán của bạn đã được hệ thống tự động hủy.`,
            });
          }
        }
      }

      // 2.2 Process refund/cancellation for future monthly bookings (BookingsMonth)
      const todayStr = getVietnamTimeParts(now).dateStr;
      const futureMonthBookings = await queryRunner.manager
        .createQueryBuilder(BookingsMonth, 'bm')
        .leftJoinAndSelect('bm.user', 'user')
        .leftJoinAndSelect('bm.yard', 'yard')
        .where('bm.yard_id = :yardId', { yardId: id })
        .andWhere('bm.endDate >= :todayStr', { todayStr })
        .andWhere('bm.ondeleted IS NULL')
        .andWhere('bm.status IN (:...statuses)', { statuses: ['paid', 'unpaid', 'refund'] })
        .orderBy('bm.id', 'ASC')
        .getMany();

      for (const bm of futureMonthBookings) {
        if (bm.status === 'paid' || bm.status === 'refund') {
          const refundAmount = Number(bm.priced || 0);
          if (bm.user && refundAmount > 0) {
            const userId = bm.user.id;
            let wallet = await queryRunner.manager.findOne(Wallet, {
              where: { userId },
              lock: { mode: 'pessimistic_write' },
            });
            if (!wallet) {
              wallet = queryRunner.manager.create(Wallet, { userId, balance: 0 });
            }
            const currentBalance = Number(wallet.balance || 0);
            const newBalance = currentBalance + refundAmount;
            wallet.balance = newBalance;
            await queryRunner.manager.save(Wallet, wallet);

            const coinTx = queryRunner.manager.create(CoinTransaction, {
              userId,
              type: CoinTransactionType.REFUND,
              amount: refundAmount,
              balanceAfter: newBalance,
              transactionCode: `REFUND_YARD_DEL_BM_${bm.id}_${Date.now()}`,
              description: `Hoàn tiền gói đặt sân theo tháng (${entity.yardName}) do sân bị ngừng hoạt động / xóa`,
              status: CoinTransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(CoinTransaction, coinTx);

            notificationsToSend.push({
              userId,
              title: `[Sporting ONE] Hoàn tiền gói tháng đặt sân`,
              content: `Sân thi đấu "${entity.yardName}" hiện đã bị xóa khỏi hệ thống. Chúng tôi đã hoàn trả ${refundAmount.toLocaleString('vi-VN')} Xu vào ví tài khoản của bạn cho gói đặt sân theo tháng (#BM-${bm.id}).`,
            });
          }
          bm.status = 'refunded';
          await queryRunner.manager.save(BookingsMonth, bm);
        } else if (bm.status === 'unpaid') {
          bm.status = 'cancelled';
          await queryRunner.manager.save(BookingsMonth, bm);
          if (bm.user) {
            notificationsToSend.push({
              userId: bm.user.id,
              title: `[Sporting ONE] Hủy gói tháng đặt sân`,
              content: `Sân thi đấu "${entity.yardName}" hiện đã bị xóa khỏi hệ thống. Gói đặt sân theo tháng chưa thanh toán của bạn đã được hệ thống tự động hủy.`,
            });
          }
        }
      }

      // 3. Soft delete the yard
      await queryRunner.manager.softDelete(Yard, id);

      await queryRunner.commitTransaction();

      // 4. Send asynchronous automated notifications to all affected users
      for (const notif of notificationsToSend) {
        try {
          await this.notificationsService.sendSystemNotification(
            notif.userId,
            notif.title,
            notif.content,
          );
        } catch (err) {
          console.error(`Failed to send notification to user ${notif.userId}:`, err);
        }
      }

      return {
        success: true,
        message:
          refundedCount > 0
            ? `Xoá sân #${id} thành công. Đã tự động hoàn trả ${refundedCount} đơn đặt sân (${totalRefundAmount.toLocaleString('vi-VN')} Xu) vào ví và gửi thông báo tới người dùng!`
            : `Xoá sân #${id} (${entity.yardName}) thành công.`,
        refundedCount,
        totalRefundAmount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Restores a soft-deleted yard record.
   */
  async restore(id: number) {
    await this.repository.restore(id);
    return { success: true, message: `Khôi phục sân #${id} thành công` };
  }

  /**
   * Retrieves all active yards sorted by vendor distance (ASC) -> court ID (ASC).
   * Only yards from active vendors (status === 'active') are returned.
   */
  async findYardsSortedByVendorDistance(query: {
    lat?: number | string;
    lng?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    userId?: number;
  }) {
    const rawLat = query.lat ?? query.latitude;
    const rawLng = query.lng ?? query.longitude;

    let userLat: number | null = null;
    let userLng: number | null = null;

    if (rawLat !== undefined && rawLat !== null && rawLng !== undefined && rawLng !== null) {
      const parsedLat = Number(rawLat);
      const parsedLng = Number(rawLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        userLat = parsedLat;
        userLng = parsedLng;
      }
    }

    // Fallback for logged-in users if lat/lng were omitted: use saved DB user address coordinates
    if ((userLat === null || userLng === null) && query.userId) {
      try {
        const userAddresses = await this.userAddressRepository.find({
          where: { userId: query.userId },
          order: { isDefault: 'DESC', createdAt: 'DESC' },
        });
        const defaultAddress = userAddresses.length > 0 ? userAddresses[0] : null;
        if (
          defaultAddress &&
          defaultAddress.latitude !== null &&
          defaultAddress.latitude !== undefined &&
          defaultAddress.longitude !== null &&
          defaultAddress.longitude !== undefined
        ) {
          userLat = Number(defaultAddress.latitude);
          userLng = Number(defaultAddress.longitude);
        }
      } catch (e) {
        // Fallback silently if address lookup fails
      }
    }

    const yards = await this.repository.find({
      where: {
        vendor: { status: 'active' },
      },
      relations: {
        sportType: true,
        vendor: true,
        sale: true,
        typeYard: true,
        images: true,
      },
    });

    let rateStatsMap = new Map<number, { averageRating: number; totalReviews: number }>();
    let systemAvgRating = 4.5;
    try {
      const [rateStatsQuery, overallAvgQuery] = await Promise.all([
        this.dataSource.query(`
          SELECT yard_id, AVG(rating) AS avg_rating, COUNT(id) AS total_reviews 
          FROM rates 
          WHERE rate_id IS NULL AND status = 'active' AND rating IS NOT NULL AND ondeleted IS NULL
          GROUP BY yard_id
        `),
        this.dataSource.query(`
          SELECT AVG(rating) AS system_avg 
          FROM rates 
          WHERE rate_id IS NULL AND status = 'active' AND rating IS NOT NULL AND ondeleted IS NULL
        `),
      ]);

      if (overallAvgQuery?.[0]?.system_avg) {
        systemAvgRating = Number(parseFloat(overallAvgQuery[0].system_avg).toFixed(2));
      }

      rateStatsQuery.forEach((row: any) => {
        rateStatsMap.set(Number(row.yard_id), {
          averageRating: Number(parseFloat(row.avg_rating || '0').toFixed(1)),
          totalReviews: Number(row.total_reviews || 0),
        });
      });
    } catch {
      // Fallback if query fails
    }

    const yardsWithDistance = yards.map((yard) => {
      let distanceKm: number | null = null;
      let distanceMeters: number | null = null;

      const vendor = yard.vendor;
      if (
        userLat !== null &&
        userLng !== null &&
        vendor &&
        vendor.latitude !== null &&
        vendor.latitude !== undefined &&
        vendor.longitude !== null &&
        vendor.longitude !== undefined
      ) {
        const vLat = Number(vendor.latitude);
        const vLng = Number(vendor.longitude);
        if (!isNaN(vLat) && !isNaN(vLng)) {
          const dist = calculateHaversineDistance(userLat, userLng, vLat, vLng);
          distanceKm = dist.distanceKm;
          distanceMeters = dist.distanceMeters;
        }
      }

      const stats = rateStatsMap.get(yard.id) || { averageRating: 0, totalReviews: 0 };
      const priorityResult = calculatePriorityScore({
        distanceKm,
        openTime: vendor?.openTime,
        closeTime: vendor?.closeTime,
        rating: stats.averageRating,
        totalReviews: stats.totalReviews,
        systemAvgRating,
        confidenceThreshold: 20,
      });

      return {
        ...yard,
        rating: stats.averageRating,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        priorityScore: priorityResult.priorityScore,
        distanceScore: priorityResult.distanceScore,
        openStatusScore: priorityResult.openStatusScore,
        bayesianRating: priorityResult.bayesianRating,
        bayesianRatingScore: priorityResult.bayesianRatingScore,
        openStatus: priorityResult.openStatus,
        vendor: vendor
          ? {
            id: vendor.id,
            vendorName: vendor.vendorName,
            avatar: vendor.avatar,
            vendorAddress: vendor.vendorAddress,
            vendorPhone: vendor.vendorPhone,
            openTime: vendor.openTime,
            closeTime: vendor.closeTime,
            status: vendor.status,
            latitude: vendor.latitude !== null ? Number(vendor.latitude) : null,
            longitude: vendor.longitude !== null ? Number(vendor.longitude) : null,
            distanceKm,
            distanceMeters,
          }
          : null,
        distanceKm,
        distanceMeters,
      };
    });

    // Sort descending by PriorityScore (Highest score recommended first)
    yardsWithDistance.sort((a, b) => {
      const scoreA = (a as any).priorityScore ?? 0;
      const scoreB = (b as any).priorityScore ?? 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Tie breaker 1: Distance (closer is better)
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;

      // Tie breaker 2: Court ID ASC
      return a.id - b.id;
    });

    return yardsWithDistance;
  }
}
