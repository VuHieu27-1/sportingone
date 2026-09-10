import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, LessThan } from 'typeorm';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { ReplyRateDto } from './dto/reply-rate.dto';
import { Rate } from './entities/rate.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

import { GoogleDriveService, type BufferedFile } from '../../common/google-drive/google-drive.service';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,
    @InjectRepository(Yard)
    private readonly yardRepository: Repository<Yard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly googleDriveService: GoogleDriveService,
  ) { }

  /**
   * Check if a user is eligible to review a specific yard based on completed bookings.
   */
  async checkEligibility(yardId: number, userId: number) {
    if (!yardId || !userId) {
      return {
        canReview: false,
        reason: 'NO_BOOKING',
        message: 'Thiếu thông tin người dùng hoặc sân.',
        eligibleBookings: [],
        upcomingBookings: [],
      };
    }

    const now = new Date();

    const allUserYardBookings = await this.bookingRepository.find({
      where: {
        user: { id: userId },
        yard: { id: yardId },
        status: 'paid',
      },
      order: { startTime: 'DESC' },
    });

    if (allUserYardBookings.length === 0) {
      return {
        canReview: false,
        reason: 'NO_BOOKING',
        message: 'Bạn cần đặt và hoàn thành một lượt chơi tại sân này trước khi có thể đánh giá.',
        eligibleBookings: [],
        upcomingBookings: [],
      };
    }

    const existingRates = await this.rateRepository.find({
      where: {
        yard: { id: yardId },
        user: { id: userId },
        parentRate: IsNull(),
      },
      relations: { booking: true },
    });
    const reviewedBookingIds = new Set(
      existingRates.map((r) => r.booking?.id).filter(Boolean),
    );

    const completedBookings = allUserYardBookings.filter(
      (b) => new Date(b.endTime) < now,
    );
    const upcomingBookings = allUserYardBookings.filter(
      (b) => new Date(b.endTime) >= now,
    );

    const eligibleBookings = completedBookings.filter(
      (b) => !reviewedBookingIds.has(b.id),
    );

    if (eligibleBookings.length > 0) {
      return {
        canReview: true,
        reason: null,
        message: 'Bạn có thể gửi đánh giá cho lượt chơi đã hoàn thành.',
        eligibleBookings: eligibleBookings.map((b) => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
          priced: b.priced,
        })),
        upcomingBookings: upcomingBookings.map((b) => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      };
    }

    if (upcomingBookings.length > 0 && completedBookings.length === 0) {
      return {
        canReview: false,
        reason: 'UPCOMING_ONLY',
        message: 'Bạn có một lượt đặt sân sắp tới. Bạn có thể đánh giá sau khi hoàn thành lượt chơi.',
        eligibleBookings: [],
        upcomingBookings: upcomingBookings.map((b) => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      };
    }

    return {
      canReview: false,
      reason: 'ALL_REVIEWED',
      message: 'Bạn đã đánh giá tất cả các lượt chơi trước đó tại sân này. Hãy tiếp tục đặt sân để trải nghiệm và gửi đánh giá mới!',
      eligibleBookings: [],
      upcomingBookings: upcomingBookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    };
  }

  /**
   * Create a new yard review or reply to an existing review.
   */
  async create(dto: CreateRateDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const yard = await this.yardRepository.findOne({
      where: { id: dto.yardId },
    });
    if (!yard) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }

    let parentRate: Rate | null = null;
    if (dto.rateId) {
      parentRate = await this.rateRepository.findOne({
        where: { id: dto.rateId },
      });
      if (!parentRate) {
        throw new NotFoundException(
          `Parent Rate with ID ${dto.rateId} not found`,
        );
      }
    } else {
      if (!dto.rating) {
        throw new BadRequestException('Rating (1-5 stars) is required for main review');
      }
    }

    let booking: Booking | null = null;

    // Enforce booking eligibility for main reviews
    if (!dto.rateId) {
      const now = new Date();

      if (dto.bookingId) {
        const foundBooking = await this.bookingRepository.findOne({
          where: { id: dto.bookingId },
          relations: { user: true, yard: true },
        });
        if (!foundBooking) {
          throw new NotFoundException('Không tìm thấy thông tin lượt đặt sân.');
        }
        if (Number(foundBooking.user?.id) !== Number(dto.userId)) {
          throw new ForbiddenException('Lượt đặt sân này không thuộc về tài khoản của bạn.');
        }
        if (Number(foundBooking.yard?.id) !== Number(dto.yardId)) {
          throw new BadRequestException('Lượt đặt sân này không thuộc về sân đang đánh giá.');
        }
        if (foundBooking.status !== 'paid') {
          throw new BadRequestException('Lượt đặt sân chưa được thanh toán thành công hoặc đã bị huỷ.');
        }
        if (new Date(foundBooking.endTime) >= now) {
          throw new BadRequestException('Lượt đặt sân này chưa kết thúc thời gian chơi.');
        }

        // Check if booking has already been reviewed
        const alreadyReviewed = await this.rateRepository.findOne({
          where: {
            booking: { id: foundBooking.id },
            parentRate: IsNull(),
          },
        });
        if (alreadyReviewed) {
          throw new BadRequestException('Lượt đặt sân này đã được đánh giá trước đó.');
        }

        booking = foundBooking;
      } else {
        // Automatically find user's eligible completed booking for this yard
        const eligibleBookings = await this.bookingRepository.find({
          where: {
            user: { id: dto.userId },
            yard: { id: dto.yardId },
            status: 'paid',
            endTime: LessThan(now),
          },
          order: { endTime: 'DESC' },
        });

        // Find which bookings have already been reviewed
        const existingRates = await this.rateRepository.find({
          where: {
            yard: { id: dto.yardId },
            user: { id: dto.userId },
            parentRate: IsNull(),
          },
          relations: { booking: true },
        });
        const reviewedBookingIds = new Set(
          existingRates.map((r) => r.booking?.id).filter(Boolean),
        );

        const availableBooking = eligibleBookings.find(
          (b) => !reviewedBookingIds.has(b.id),
        );

        if (!availableBooking) {
          throw new BadRequestException(
            'Bạn cần đặt và hoàn thành một lượt chơi tại sân này trước khi có thể đánh giá.',
          );
        }

        booking = availableBooking;
      }
    }

    const rate = this.rateRepository.create({
      user,
      yard,
      booking,
      parentRate,
      rating: dto.rating ?? null,
      comment: dto.comment ?? null,
      images: dto.images ?? null,
    });

    return this.rateRepository.save(rate);
  }

  /**
   * Reply directly to an existing review.
   */
  async reply(parentRateId: number, dto: ReplyRateDto) {
    const parentRate = await this.rateRepository.findOne({
      where: { id: parentRateId },
      relations: { yard: true },
    });
    if (!parentRate) {
      throw new NotFoundException(
        `Rate with ID ${parentRateId} not found`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const replyRate = this.rateRepository.create({
      user,
      yard: parentRate.yard,
      parentRate,
      rating: null,
      comment: dto.comment,
      images: dto.images ?? null,
    });

    return this.rateRepository.save(replyRate);
  }

  /**
   * Retrieve all reviews and ratings breakdown for a specific yard.
   */
  async findByYard(yardId: number) {
    const yard = await this.yardRepository.findOne({
      where: { id: yardId },
    });
    if (!yard) {
      throw new NotFoundException(`Yard with ID ${yardId} not found`);
    }

    const allRates = await this.rateRepository.find({
      where: {
        yard: { id: yardId },
        status: 'active',
      },
      relations: {
        user: true,
        booking: true,
        parentRate: {
          user: true,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const rootReviews: Rate[] = [];
    const repliesMap = new Map<number, Rate[]>();

    allRates.forEach((r) => {
      if (!r.parentRate) {
        r.replies = [];
        rootReviews.push(r);
      } else {
        const pId = r.parentRate.id;
        if (!repliesMap.has(pId)) {
          repliesMap.set(pId, []);
        }
        repliesMap.get(pId)!.push(r);
      }
    });

    const collectAllReplies = (parentId: number): Rate[] => {
      const direct = repliesMap.get(parentId) || [];
      const result: Rate[] = [];
      direct.forEach((child) => {
        child.replies = collectAllReplies(child.id);
        result.push(child);
      });
      return result;
    };

    rootReviews.forEach((root) => {
      root.replies = collectAllReplies(root.id);
    });

    rootReviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalReviews = rootReviews.length;
    const ratingBreakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    let totalScore = 0;
    let validRatingCount = 0;

    rootReviews.forEach((r) => {
      if (r.rating && r.rating >= 1 && r.rating <= 5) {
        ratingBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
        totalScore += r.rating;
        validRatingCount++;
      }
    });

    const averageRating =
      validRatingCount > 0
        ? Number((totalScore / validRatingCount).toFixed(1))
        : 0;

    return {
      yardId,
      stats: {
        totalReviews,
        averageRating,
        ratingBreakdown,
      },
      data: rootReviews,
    };
  }

  /**
   * Retrieve all reviews for all yards belonging to a specific vendor.
   */
  async findByVendor(vendorId: number) {
    const yards = await this.yardRepository.find({
      where: { vendor: { id: vendorId } },
    });

    if (!yards || yards.length === 0) {
      return {
        vendorId,
        stats: {
          totalReviews: 0,
          averageRating: 0,
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        data: [],
      };
    }

    const yardIds = yards.map((y) => y.id);
    const allRates = await this.rateRepository.find({
      where: {
        yard: { id: In(yardIds) },
        status: 'active',
      },
      relations: {
        yard: true,
        user: true,
        booking: true,
        parentRate: {
          user: true,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const rootReviews: Rate[] = [];
    const repliesMap = new Map<number, Rate[]>();

    allRates.forEach((r) => {
      if (!r.parentRate) {
        r.replies = [];
        rootReviews.push(r);
      } else {
        const pId = r.parentRate.id;
        if (!repliesMap.has(pId)) {
          repliesMap.set(pId, []);
        }
        repliesMap.get(pId)!.push(r);
      }
    });

    const collectAllReplies = (parentId: number): Rate[] => {
      const direct = repliesMap.get(parentId) || [];
      const result: Rate[] = [];
      direct.forEach((child) => {
        child.replies = collectAllReplies(child.id);
        result.push(child);
      });
      return result;
    };

    rootReviews.forEach((root) => {
      root.replies = collectAllReplies(root.id);
    });

    rootReviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalReviews = rootReviews.length;
    const ratingBreakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    let totalScore = 0;
    let validRatingCount = 0;

    rootReviews.forEach((r) => {
      if (r.rating && r.rating >= 1 && r.rating <= 5) {
        ratingBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
        totalScore += r.rating;
        validRatingCount++;
      }
    });

    const averageRating =
      validRatingCount > 0
        ? Number((totalScore / validRatingCount).toFixed(1))
        : 0;

    return {
      vendorId,
      stats: {
        totalReviews,
        averageRating,
        ratingBreakdown,
      },
      data: rootReviews,
    };
  }

  /**
   * Retrieve reviews created by a specific user.
   */
  async findByUser(userId: number) {
    return this.rateRepository.find({
      where: { user: { id: userId } },
      relations: {
        yard: true,
        user: true,
        booking: true,
        parentRate: true,
        replies: {
          user: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Retrieve all reviews in the system.
   */
  async findAll() {
    return this.rateRepository.find({
      relations: {
        yard: true,
        user: true,
        booking: true,
        parentRate: true,
        replies: {
          user: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Retrieve a review by ID including replies tree.
   */
  async findOne(id: number) {
    const rate = await this.rateRepository.findOne({
      where: { id },
      relations: {
        yard: true,
        user: true,
        booking: true,
        parentRate: true,
        replies: {
          user: true,
        },
      },
    });

    if (!rate) {
      throw new NotFoundException(`Rate with ID ${id} not found`);
    }

    return rate;
  }

  /**
   * Update review content or rating.
   */
  async update(id: number, dto: UpdateRateDto) {
    const rate = await this.findOne(id);

    if (dto.rating !== undefined) {
      rate.rating = dto.rating;
    }
    if (dto.comment !== undefined) {
      rate.comment = dto.comment;
    }
    if (dto.images !== undefined) {
      rate.images = dto.images;
    }

    return this.rateRepository.save(rate);
  }

  /**
   * Increment / decrement like count for a review (Facebook-like toggle).
   */
  async like(id: number, action?: string) {
    const rate = await this.findOne(id);
    const currentLikes = Number(rate.likesCount || 0);

    if (action === 'unlike') {
      rate.likesCount = Math.max(0, currentLikes - 1);
    } else if (action === 'like') {
      rate.likesCount = currentLikes + 1;
    } else {
      rate.likesCount = currentLikes + 1;
    }

    return this.rateRepository.save(rate);
  }

  /**
   * Upload multiple image files to Google Drive rates-images folder and attach to rate.
   */
  async uploadImages(files: BufferedFile[], rateId?: number) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một hình ảnh để tải lên');
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const uploadResult = await this.googleDriveService.uploadRateImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        rateId,
      );
      uploadedUrls.push(uploadResult.directUrl);
    }

    if (rateId) {
      const rate = await this.findOne(rateId);
      const currentImages = Array.isArray(rate.images) ? rate.images : [];
      rate.images = [...currentImages, ...uploadedUrls];
      await this.rateRepository.save(rate);
    }

    return {
      success: true,
      urls: uploadedUrls,
      message: `Đã tải lên ${uploadedUrls.length} hình ảnh thành công`,
    };
  }

  /**
   * Soft delete a review and clean up drive images if any.
   */
  async remove(id: number) {
    const rate = await this.findOne(id);

    if (Array.isArray(rate.images)) {
      for (const imgUrl of rate.images) {
        const fileId = this.googleDriveService.extractFileIdFromUrl(imgUrl);
        if (fileId) {
          await this.googleDriveService.deleteFile(fileId);
        }
      }
    }

    await this.rateRepository.softDelete(id);
    return { success: true, message: `Rate #${id} deleted successfully` };
  }
}
