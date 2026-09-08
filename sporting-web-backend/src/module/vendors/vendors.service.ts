import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { OpenRouteServiceService } from '../../common/open-route-service/open-route-service.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GoogleDriveService, BufferedFile } from '../../common/google-drive/google-drive.service';
import { calculateHaversineDistance } from '../../common/utils/distance.util';
import { calculatePriorityScore } from '../../common/utils/priority-score.util';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private readonly repository: Repository<Vendor>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    private readonly openRouteService: OpenRouteServiceService,
    private readonly notificationsService: NotificationsService,
    private readonly googleDriveService: GoogleDriveService,
  ) { }

  private validateVendorPhone(phone?: string | null) {
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      const cleanPhone = phone.trim();
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        throw new BadRequestException(
          'Số điện thoại phải bao gồm đúng 10 chữ số và không chứa chữ hoặc ký tự đặc biệt.',
        );
      }
    }
  }

  /**
   * Creates or saves record.
   */
  async create(dto: CreateVendorDto, currentUserId?: number) {
    this.validateVendorPhone(dto.vendorPhone);
    const targetUserId = dto.userId ?? currentUserId;

    if (!targetUserId) {
      throw new BadRequestException('userId is required');
    }

    if (
      currentUserId !== undefined &&
      dto.userId !== undefined &&
      dto.userId !== currentUserId
    ) {
      throw new ForbiddenException(
        'userId in token must match userId creating the vendor request',
      );
    }

    const userVal = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: { role: true },
    });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    const { userId, status, ...cleanDto } = dto;
    const entity = this.repository.create({
      ...cleanDto,
      openTime: dto.openTime || '06:00',
      closeTime: dto.closeTime || '23:00',
      status: status || 'pending',
    } as DeepPartial<Vendor>);

    if (
      (dto.latitude === undefined || dto.latitude === null) &&
      (dto.longitude === undefined || dto.longitude === null) &&
      dto.vendorAddress &&
      dto.vendorAddress.trim()
    ) {
      const geo = await this.openRouteService.geocodeAddress(dto.vendorAddress);
      if (geo) {
        entity.latitude = geo.lat;
        entity.longitude = geo.lng;
      }
    } else {
      if (dto.latitude !== undefined) entity.latitude = dto.latitude;
      if (dto.longitude !== undefined) entity.longitude = dto.longitude;
    }

    entity.user = userVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information with yards and sport types including soft-deleted for Admin.
   */
  async findAll(status?: string, userLat?: number, userLng?: number) {
    const effectiveStatus = status || 'active';
    const where: any = { status: effectiveStatus as any };
    const vendors = await this.repository.find({
      where,
      withDeleted: false,
      relations: {
        user: { role: true },
        yards: { sportType: true, typeYard: true },
      },
    });

    let statsMap = new Map<number, { averageRating: number; totalReviews: number }>();
    let systemAvgRating = 4.5;
    try {
      const [statsQuery, overallAvgQuery] = await Promise.all([
        this.repository.manager.query(`
          SELECT y.vendor_id, AVG(r.rating) AS avg_rating, COUNT(r.id) AS total_reviews
          FROM rates r
          INNER JOIN yards y ON r.yard_id = y.id
          WHERE r.rate_id IS NULL AND r.status = 'active' AND r.rating IS NOT NULL AND r.ondeleted IS NULL AND y.ondeleted IS NULL
          GROUP BY y.vendor_id
        `),
        this.repository.manager.query(`
          SELECT AVG(rating) AS system_avg 
          FROM rates 
          WHERE rate_id IS NULL AND status = 'active' AND rating IS NOT NULL AND ondeleted IS NULL
        `),
      ]);

      if (overallAvgQuery?.[0]?.system_avg) {
        systemAvgRating = Number(parseFloat(overallAvgQuery[0].system_avg).toFixed(2));
      }

      statsQuery.forEach((row: any) => {
        statsMap.set(Number(row.vendor_id), {
          averageRating: Number(parseFloat(row.avg_rating || '0').toFixed(1)),
          totalReviews: Number(row.total_reviews || 0),
        });
      });
    } catch {
      // Fallback silently if query fails
    }

    const vendorsWithPriority = vendors.map((v) => {
      const s = statsMap.get(v.id) || { averageRating: 0, totalReviews: 0 };
      let distanceKm: number | null = null;
      let distanceMeters: number | null = null;

      if (
        userLat !== undefined &&
        userLng !== undefined &&
        !isNaN(userLat) &&
        !isNaN(userLng) &&
        v.latitude !== null &&
        v.latitude !== undefined &&
        v.longitude !== null &&
        v.longitude !== undefined
      ) {
        const vLat = Number(v.latitude);
        const vLng = Number(v.longitude);
        if (!isNaN(vLat) && !isNaN(vLng)) {
          const dist = calculateHaversineDistance(userLat, userLng, vLat, vLng);
          distanceKm = dist.distanceKm;
          distanceMeters = dist.distanceMeters;
        }
      }

      const priorityResult = calculatePriorityScore({
        distanceKm,
        openTime: v.openTime,
        closeTime: v.closeTime,
        rating: s.averageRating,
        totalReviews: s.totalReviews,
        systemAvgRating,
        confidenceThreshold: 50,
      });

      return {
        ...v,
        rating: s.averageRating,
        averageRating: s.averageRating,
        totalReviews: s.totalReviews,
        distanceKm,
        distanceMeters,
        priorityScore: priorityResult.priorityScore,
        distanceScore: priorityResult.distanceScore,
        openStatusScore: priorityResult.openStatusScore,
        bayesianRatingScore: priorityResult.bayesianRatingScore,
        openStatus: priorityResult.openStatus,
      };
    });

    // Sort descending by PriorityScore
    vendorsWithPriority.sort((a, b) => {
      const scoreA = (a as any).priorityScore ?? 0;
      const scoreB = (b as any).priorityScore ?? 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;

      return a.id - b.id;
    });

    return vendorsWithPriority;
  }

  /**
   * Dedicated API for Admin to paginate Vendors using SQL LIMIT & OFFSET
   */
  async findAdminVendorPaginated(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const pageNum = Math.max(1, Number(query.page) || 1);
    const limitNum = Math.max(1, Number(query.limit) || 8);
    const offsetNum = (pageNum - 1) * limitNum;

    const qb = this.repository
      .createQueryBuilder('vendor')
      .withDeleted()
      .leftJoinAndSelect('vendor.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('vendor.yards', 'yards')
      .leftJoinAndSelect('yards.sportType', 'sportType')
      .leftJoinAndSelect('yards.typeYard', 'typeYard')
      .orderBy('vendor.id', 'DESC')
      .limit(limitNum)
      .offset(offsetNum);

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('vendor.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim() !== '') {
      const searchPattern = `%${query.search.trim()}%`;
      qb.andWhere(
        '(vendor.vendorName LIKE :search OR vendor.vendorAddress LIKE :search OR user.username LIKE :search)',
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
   * Retrieves ByUserId information with yards and sport types.
   */
  async findByUserId(userId: number) {
    return this.repository.find({
      where: { user: { id: userId } },
      relations: {
        user: { role: true },
        yards: { sportType: true, typeYard: true },
      },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieves One information with yards, sport types and rating stats.
   */
  async findOne(id: number) {
    if (isNaN(id)) {
      throw new BadRequestException('ID nhà cung cấp (vendor ID) không hợp lệ.');
    }
    const entity = await this.repository.findOne({
      where: { id },
      relations: {
        user: { role: true },
        yards: { sportType: true, typeYard: true },
      },
    });
    if (!entity) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    try {
      const statsQuery = await this.repository.manager.query(
        `SELECT AVG(r.rating) AS avg_rating, COUNT(r.id) AS total_reviews
         FROM rates r
         INNER JOIN yards y ON r.yard_id = y.id
         WHERE y.vendor_id = ? AND r.rate_id IS NULL AND r.status = 'active' AND r.rating IS NOT NULL AND r.ondeleted IS NULL AND y.ondeleted IS NULL`,
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
   * Updates record details.
   */
  async update(id: number, dto: UpdateVendorDto) {
    this.validateVendorPhone(dto.vendorPhone);
    const entity = await this.findOne(id);
    const { userId, ...cleanDto } = dto;

    const oldAddress = entity.vendorAddress;
    this.repository.merge(entity, cleanDto);

    // Whenever vendorAddress is updated to a new address, automatically geocode & update latitude and longitude
    if (dto.vendorAddress !== undefined && dto.vendorAddress !== oldAddress) {
      if (dto.vendorAddress && dto.vendorAddress.trim()) {
        const geo = await this.openRouteService.geocodeAddress(dto.vendorAddress);
        if (geo) {
          entity.latitude = geo.lat;
          entity.longitude = geo.lng;
        } else {
          entity.latitude = null;
          entity.longitude = null;
        }
      } else {
        entity.latitude = null;
        entity.longitude = null;
      }
    } else {
      if (dto.latitude !== undefined) entity.latitude = dto.latitude;
      if (dto.longitude !== undefined) entity.longitude = dto.longitude;
    }

    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({
        where: { id: dto.userId },
        relations: { role: true },
      });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
    }

    if (dto.status === 'active') {
      if (!entity.activatedAt) {
        entity.activatedAt = new Date();
      }
      if (entity.user) {
        let vendorRole = await this.roleRepository.findOne({
          where: { roleName: 'vendor' },
        });
        if (!vendorRole) {
          vendorRole = this.roleRepository.create({ roleName: 'vendor' });
          vendorRole = await this.roleRepository.save(vendorRole);
        }
        entity.user.role = vendorRole;
        await this.userRepository.save(entity.user);

        // Automatically send vendor approval notification
        await this.notificationsService.sendSystemNotification(
          entity.user.id,
          `Congratulations! Vendor profile "${entity.vendorName}" has been approved`,
          `Congratulations! Your sports venue partner profile "${entity.vendorName}" has been officially approved by the Sporting ONE administrator. You can now start managing sports venues and receiving online bookings.`,
        );
      }
    } else if ((dto.status === 'reject' || dto.status === 'pending') && entity.user) {
      const activeOtherVendors = await this.repository.find({
        where: { user: { id: entity.user.id }, status: 'active' },
      });
      const remainingActive = activeOtherVendors.filter((v) => v.id !== id);
      if (remainingActive.length === 0) {
        let userRole = await this.roleRepository.findOne({
          where: { roleName: 'user' },
        });
        if (userRole) {
          entity.user.role = userRole;
          await this.userRepository.save(entity.user);
        }
      }

      if (dto.status === 'reject') {
        const reasonText = dto.reason ? `\nRejection reason: ${dto.reason}.` : '';
        // Automatically send vendor rejection notification
        await this.notificationsService.sendSystemNotification(
          entity.user.id,
          `Vendor registration profile "${entity.vendorName}" has been rejected`,
          `Your sports venue partner registration profile "${entity.vendorName}" has been rejected.${reasonText}\nPlease check your profile information and venue licenses to update and resubmit for approval.`,
        );
      }
    }

    return this.repository.save(entity);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.softDelete(id);
    return 'Delete success';
  }

  /**
   * Updates MyVendorHours details.
   */
  async updateMyVendorHours(userId: number, openTime?: string, closeTime?: string) {
    if (!userId) return { success: false, message: 'User ID required' };
    if (!openTime && !closeTime) {
      return { success: true, message: 'No operating hours provided for update' };
    }
    const userVendors = await this.findByUserId(userId);
    if (!userVendors || userVendors.length === 0) {
      return { success: false, message: 'No vendors found for this user' };
    }
    const updatedVendors: Vendor[] = [];
    for (const v of userVendors) {
      if (openTime && openTime.trim() !== '') v.openTime = openTime.trim();
      if (closeTime && closeTime.trim() !== '') v.closeTime = closeTime.trim();
      const saved = await this.repository.save(v);
      updatedVendors.push(saved);
    }
    return { success: true, message: 'Updated vendor operating hours', data: updatedVendors };
  }

  /**
   * Uploads and updates vendor avatar image to Google Drive folder avatar-vendor.
   */
  async updateAvatar(
    vendorId: number,
    file: BufferedFile,
    currentUserId?: number,
    userRole?: string,
  ) {
    if (isNaN(vendorId) || !vendorId) {
      throw new BadRequestException(`Invalid Vendor ID (${vendorId})`);
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Please select an image file to upload');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/jpg',
      'image/svg+xml',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Please upload an image file (JPEG, PNG, WEBP, GIF, SVG)',
      );
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        'Image size exceeds the allowed limit (maximum 10MB)',
      );
    }

    const vendor = await this.repository.findOne({
      where: { id: vendorId },
      relations: {
        user: true,
        yards: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const isOwner = currentUserId && vendor.user?.id === currentUserId;
    const roleStr = (typeof userRole === 'object' ? (userRole as any)?.roleName : userRole) || '';
    const isAdmin = roleStr.toLowerCase().includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update the avatar for this vendor');
    }
    if (vendor.avatar) {
      const oldFileId = this.googleDriveService.extractFileIdFromUrl(vendor.avatar);
      if (oldFileId) {
        await this.googleDriveService.deleteFile(oldFileId);
      }
    }

    const uploadResult = await this.googleDriveService.uploadVendorAvatar(
      file.buffer,
      file.originalname || 'vendor_avatar.jpg',
      file.mimetype,
      vendor.id,
    );

    vendor.avatar = uploadResult.directUrl;
    const savedVendor = await this.repository.save(vendor);

    return {
      success: true,
      message: 'Successfully updated vendor avatar',
      avatar: uploadResult.directUrl,
      fileId: uploadResult.fileId,
      vendor: savedVendor,
    };
  }

  /**
   * Deletes vendor avatar from Google Drive and database.
   */
  async deleteAvatar(
    vendorId: number,
    currentUserId?: number,
    userRole?: string,
  ) {
    if (isNaN(vendorId) || !vendorId) {
      throw new BadRequestException(`Invalid Vendor ID (${vendorId})`);
    }

    const vendor = await this.repository.findOne({
      where: { id: vendorId },
      relations: {
        user: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const isOwner = currentUserId && vendor.user?.id === currentUserId;
    const roleStr = (typeof userRole === 'object' ? (userRole as any)?.roleName : userRole) || '';
    const isAdmin = roleStr.toLowerCase().includes('admin');

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete the avatar for this vendor');
    }

    if (vendor.avatar) {
      const oldFileId = this.googleDriveService.extractFileIdFromUrl(vendor.avatar);
      if (oldFileId) {
        await this.googleDriveService.deleteFile(oldFileId);
      }
      vendor.avatar = null;
      await this.repository.save(vendor);
    }

    return {
      success: true,
      message: 'Successfully deleted vendor avatar',
      vendor,
    };
  }

  /**
   * Restores a soft-deleted vendor record.
   */
  async restore(id: number) {
    await this.repository.restore(id);
    return { success: true, message: `Khôi phục cơ sở Vendor #${id} thành công` };
  }
}
