import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
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
  ) {}

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

    let booking: Booking | null = null;
    if (dto.bookingId) {
      booking = await this.bookingRepository.findOne({
        where: { id: dto.bookingId },
      });
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
