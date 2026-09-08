import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateDetailUserDto } from './dto/create-detail-user.dto';
import { UpdateDetailUserDto } from './dto/update-detail-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailUser } from './entities/detail-user.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { UserAddress } from '../user_address/entities/user_address.entity';

import { OpenRouteServiceService } from '../../common/open-route-service/open-route-service.service';
import { calculateHaversineDistance } from '../../common/utils/distance.util';
import { calculatePriorityScore } from '../../common/utils/priority-score.util';

@Injectable()
export class DetailUsersService {
  constructor(
    @InjectRepository(DetailUser)
    private readonly detailUserRepository: Repository<DetailUser>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor) private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(UserAddress) private readonly userAddressRepository: Repository<UserAddress>,
    private readonly openRouteService: OpenRouteServiceService,
  ) { }

  private validateDetailUserData(dto: { phone?: string; birthday?: string }) {
    if (dto.phone !== undefined && dto.phone !== null && dto.phone.trim() !== '') {
      const cleanPhone = dto.phone.trim();
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        throw new BadRequestException(
          'Số điện thoại phải bao gồm đúng 10 chữ số và không chứa chữ hoặc ký tự đặc biệt.',
        );
      }
    }

    if (dto.birthday !== undefined && dto.birthday !== null && dto.birthday.trim() !== '') {
      const cleanDob = dto.birthday.trim();
      const birthDate = new Date(cleanDob);
      const birthYear = birthDate.getFullYear();
      const currentYear = new Date().getFullYear();

      if (isNaN(birthYear) || birthYear >= currentYear) {
        throw new BadRequestException(
          `Năm sinh không hợp lệ.`,
        );
      }
    }
  }

  /**
   * Creates or saves record.
   */
  async create(createDetailUserDto: CreateDetailUserDto) {
    this.validateDetailUserData(createDetailUserDto);
    const user = await this.userRepository.findOne({
      where: { id: createDetailUserDto.userId },
      relations: { detailUser: true },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${createDetailUserDto.userId} not found`,
      );
    }
    if (user.detailUser) {
      throw new BadRequestException(
        `DetailUser for User ID ${createDetailUserDto.userId} already exists`,
      );
    }
    const detailUser = this.detailUserRepository.create(createDetailUserDto);

    if (createDetailUserDto.latitude !== undefined) detailUser.latitude = createDetailUserDto.latitude;
    if (createDetailUserDto.longitude !== undefined) detailUser.longitude = createDetailUserDto.longitude;

    return this.detailUserRepository.save(detailUser);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.detailUserRepository.find();
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    return this.detailUserRepository.findOne({ where: { id } });
  }

  /**
   * Retrieves OneByUserId information.
   */
  async findOneByUserId(userId: number) {
    return this.detailUserRepository.findOne({ where: { userId } });
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateDetailUserDto: UpdateDetailUserDto) {
    this.validateDetailUserData(updateDetailUserDto);
    const detailUser = await this.findOne(id);
    if (!detailUser) {
      throw new NotFoundException(`DetailUser with ID ${id} not found`);
    }

    this.detailUserRepository.merge(detailUser, updateDetailUserDto);

    if (updateDetailUserDto.latitude !== undefined) detailUser.latitude = updateDetailUserDto.latitude;
    if (updateDetailUserDto.longitude !== undefined) detailUser.longitude = updateDetailUserDto.longitude;

    return this.detailUserRepository.save(detailUser);
  }

  /**
   * Updates ByUserId details.
   */
  async updateByUserId(userId: number, updateDetailUserDto: UpdateDetailUserDto) {
    this.validateDetailUserData(updateDetailUserDto);
    let detailUser = await this.findOneByUserId(userId);

    if (!detailUser) {
      detailUser = this.detailUserRepository.create({
        ...updateDetailUserDto,
        userId,
      });
    } else {
      this.detailUserRepository.merge(detailUser, updateDetailUserDto);
    }

    if (updateDetailUserDto.latitude !== undefined) detailUser.latitude = updateDetailUserDto.latitude;
    if (updateDetailUserDto.longitude !== undefined) detailUser.longitude = updateDetailUserDto.longitude;

    return this.detailUserRepository.save(detailUser);
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number) {
    const detailUser = await this.findOne(id);
    if (!detailUser) {
      throw new NotFoundException(`DetailUser with ID ${id} not found`);
    }
    return this.detailUserRepository.softDelete(id);
  }

  /**
   * Deletes or cancels ByUserId.
   */
  async removeByUserId(userId: number) {
    const detailUser = await this.findOneByUserId(userId);
    if (!detailUser) {
      throw new NotFoundException(`DetailUser for User ID ${userId} not found`);
    }
    return this.detailUserRepository.softDelete({ userId });
  }

  /**
   * Helper method to calculate straight-line distance in kilometers and meters
   * between 2 sets of coordinates (lat1, lon1) and (lat2, lon2).
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): { distanceKm: number; distanceMeters: number } {
    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Retrieves active vendors and calculates distance from the logged-in user's coordinates.
   */
  async getVendorDistances(userId: number) {
    const userAddresses = await this.userAddressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    const defaultAddress = userAddresses.length > 0 ? userAddresses[0] : null;
    const detailUser = await this.findOneByUserId(userId);

    let userLat: number | null = defaultAddress?.latitude !== null && defaultAddress?.latitude !== undefined
      ? Number(defaultAddress.latitude)
      : (detailUser?.latitude !== null && detailUser?.latitude !== undefined ? Number(detailUser.latitude) : null);

    let userLng: number | null = defaultAddress?.longitude !== null && defaultAddress?.longitude !== undefined
      ? Number(defaultAddress.longitude)
      : (detailUser?.longitude !== null && detailUser?.longitude !== undefined ? Number(detailUser.longitude) : null);

    const addressText = defaultAddress?.address || '';

    if (userLat === null || userLng === null) {
      return {
        userLocation: null,
        vendors: [],
      };
    }

    const activeVendors = await this.vendorRepository.find({
      where: { status: 'active' },
      relations: { yards: { sportType: true } },
    });

    let statsMap = new Map<number, { averageRating: number; totalReviews: number }>();
    let systemAvgRating = 4.5;
    try {
      const [statsQuery, overallAvgQuery] = await Promise.all([
        this.vendorRepository.manager.query(`
          SELECT y.vendor_id, AVG(r.rating) AS avg_rating, COUNT(r.id) AS total_reviews
          FROM rates r
          INNER JOIN yards y ON r.yard_id = y.id
          WHERE r.rate_id IS NULL AND r.status = 'active' AND r.rating IS NOT NULL AND r.ondeleted IS NULL AND y.ondeleted IS NULL
          GROUP BY y.vendor_id
        `),
        this.vendorRepository.manager.query(`
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

    const vendorsWithDistance = activeVendors.map((vendor) => {
      let distanceKm: number | null = null;
      let distanceMeters: number | null = null;

      if (
        vendor.latitude !== null &&
        vendor.latitude !== undefined &&
        vendor.longitude !== null &&
        vendor.longitude !== undefined
      ) {
        const vLat = Number(vendor.latitude);
        const vLng = Number(vendor.longitude);
        const dist = this.calculateHaversineDistance(userLat!, userLng!, vLat, vLng);
        distanceKm = dist.distanceKm;
        distanceMeters = dist.distanceMeters;
      }

      const s = statsMap.get(vendor.id) || { averageRating: 0, totalReviews: 0 };

      // Calculate PriorityScore: 50% DistanceScore + 25% OpenStatusScore + 25% BayesianRatingScore
      const priorityResult = calculatePriorityScore({
        distanceKm,
        openTime: vendor.openTime,
        closeTime: vendor.closeTime,
        rating: s.averageRating,
        totalReviews: s.totalReviews,
        systemAvgRating,
        confidenceThreshold: 50,
      });

      return {
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
        rating: s.averageRating,
        averageRating: s.averageRating,
        totalReviews: s.totalReviews,
        priorityScore: priorityResult.priorityScore,
        distanceScore: priorityResult.distanceScore,
        openStatusScore: priorityResult.openStatusScore,
        bayesianRating: priorityResult.bayesianRating,
        bayesianRatingScore: priorityResult.bayesianRatingScore,
        openStatus: priorityResult.openStatus,
        yards: Array.isArray(vendor.yards) ? vendor.yards.map((y) => ({
          id: y.id,
          yardName: y.yardName,
          price: y.price,
          peakHourPrice: y.peakHourPrice,
          status: y.status,
          sportType: y.sportType ? { id: y.sportType.id, sportName: y.sportType.sportName } : null,
        })) : [],
      };
    });

    // Sort descending by PriorityScore (Highest score recommended first)
    vendorsWithDistance.sort((a, b) => {
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

      // Tie breaker 2: Vendor ID ASC
      return a.id - b.id;
    });

    return {
      userLocation: {
        userId,
        latitude: userLat,
        longitude: userLng,
        address: addressText,
      },
      vendors: vendorsWithDistance,
    };
  }

  /**
   * Calculates distance to active vendors for guest users based on passed latitude and longitude.
   */
  async getGuestVendorDistances(query: {
    lat?: number | string;
    lng?: number | string;
    latitude?: number | string;
    longitude?: number | string;
  }) {
    const rawLat = query.lat ?? query.latitude;
    const rawLng = query.lng ?? query.longitude;

    if (rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
      throw new BadRequestException(
        'Tọa độ vị trí (lat và lng) là bắt buộc để tính khoảng cách cho khách (guest).',
      );
    }

    const userLat = Number(rawLat);
    const userLng = Number(rawLng);

    if (isNaN(userLat) || isNaN(userLng)) {
      throw new BadRequestException(
        'Tọa độ vị trí (lat và lng) không hợp lệ.',
      );
    }

    // Only active vendors per strict rule — JOIN yards + sportType in a single query
    const activeVendors = await this.vendorRepository.find({
      where: { status: 'active' },
      relations: { yards: { sportType: true } },
    });

    const vendorsWithDistance = activeVendors.map((vendor) => {
      let distanceKm: number | null = null;
      let distanceMeters: number | null = null;

      if (
        vendor.latitude !== null &&
        vendor.latitude !== undefined &&
        vendor.longitude !== null &&
        vendor.longitude !== undefined
      ) {
        const vLat = Number(vendor.latitude);
        const vLng = Number(vendor.longitude);
        const dist = this.calculateHaversineDistance(userLat, userLng, vLat, vLng);
        distanceKm = dist.distanceKm;
        distanceMeters = dist.distanceMeters;
      }

      return {
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
        yards: Array.isArray(vendor.yards) ? vendor.yards.map((y) => ({
          id: y.id,
          yardName: y.yardName,
          price: y.price,
          peakHourPrice: y.peakHourPrice,
          status: y.status,
          sportType: y.sportType ? { id: y.sportType.id, sportName: y.sportType.sportName } : null,
        })) : [],
      };
    });

    // Sort vendors by distanceKm ascending (vendors with null distance placed at the end)
    vendorsWithDistance.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return {
      userLocation: {
        latitude: userLat,
        longitude: userLng,
      },
      vendors: vendorsWithDistance,
    };
  }
}
