import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { getVietnamDate } from '../../common/utils/date.util';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import type { BufferedFile } from '../../common/google-drive/google-drive.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
    private readonly googleDriveService: GoogleDriveService,
  ) { }

  /**
   * Creates or saves record.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {

    const user = this.userRepository.create(createUserDto);
    if (user.password) {
      if (!user.password.startsWith('$2')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
    if (createUserDto.username) {
      const user = await this.userRepository.findOne({
        where: { username: createUserDto.username },
      });
      if (user) {
        throw new ConflictException(
          `User with name "${createUserDto.username}" already exists`,
        );
      }
    }
    if (!createUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { roleName: 'user' },
      });
      if (!role) {
        throw new NotFoundException(`Role with name "user" not found`);
      }
      user.role = role;
    }
    if (createUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: createUserDto.roleId },
      });
      if (role) {
        user.role = role;
      }
    }
    return this.userRepository.save(user);
  }

  /**
   * Validates and verifies parameters for checkIsOnline.
   */
  checkIsOnline(statusTime: Date | string | null | undefined): boolean {
    if (!statusTime) return false;
    const statusDate = new Date(statusTime).getTime();
    if (isNaN(statusDate)) return false;

    const timeoutMinutes = Number(
      this.configService.get('USER_ONLINE_TIMEOUT_MINUTES') ||
      process.env.USER_ONLINE_TIMEOUT_MINUTES ||
      5,
    );
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = Date.now();
    const diff = Math.abs(now - statusDate);
    const vnShift = 7 * 3600 * 1000;
    const diffVn = Math.abs(diff - vnShift);

    return diff <= timeoutMs || diffVn <= timeoutMs;
  }

  /**
   * Updates StatusTime details.
   */
  async updateStatusTime(userId: number) {
    if (isNaN(userId) || !userId) {
      throw new BadRequestException(`ID người dùng không hợp lệ (${userId})`);
    }

    const now = new Date();
    await this.userRepository.update(userId, { statusTime: now });

    return {
      success: true,
      message: 'Cập nhật status_time thành công',
      statusTime: now,
      isOnline: true,
    };
  }

  /**
   * Retrieves UserStatus information.
   */
  async getUserStatus(userId: number) {
    if (isNaN(userId) || !userId) {
      throw new BadRequestException(`ID người dùng không hợp lệ (${userId})`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, username: true, email: true, avatar: true, statusTime: true },
    });

    if (!user) {
      throw new NotFoundException(`User với ID ${userId} không tồn tại`);
    }

    const isOnline = this.checkIsOnline(user.statusTime);
    const lastSeenSecondsAgo = user.statusTime
      ? Math.max(0, Math.floor((Date.now() - new Date(user.statusTime).getTime()) / 1000))
      : null;

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline,
      statusTime: user.statusTime,
      lastSeenSecondsAgo,
    };
  }

  /**
   * Retrieves AllUsersStatus information.
   */
  async getAllUsersStatus() {
    const users = await this.userRepository.find({
      select: { id: true, username: true, email: true, avatar: true, statusTime: true },
    });

    return users.map((user) => {
      const isOnline = this.checkIsOnline(user.statusTime);
      const lastSeenSecondsAgo = user.statusTime
        ? Math.max(0, Math.floor((Date.now() - new Date(user.statusTime).getTime()) / 1000))
        : null;

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline,
        statusTime: user.statusTime,
        lastSeenSecondsAgo,
      };
    });
  }

  /**
   * Retrieves All information including soft-deleted users for Admin.
   */
  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find({
      withDeleted: true,
      relations: {
        role: true,
        detailUser: true,
        addresses: true,
      },
    });
    for (let i = 0; i < users.length; i++) {
      delete (users[i] as Partial<User>).password;
      (users[i] as any).isOnline = this.checkIsOnline(users[i].statusTime);
    }
    return users;
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number): Promise<User> {
    if (isNaN(id) || !id) {
      throw new BadRequestException(`ID người dùng không hợp lệ (${id})`);
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        role: true,
        detailUser: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    delete (user as Partial<User>).password;
    (user as any).isOnline = this.checkIsOnline(user.statusTime);
    return user;
  }

  /**
   * Updates record details.
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          `User with name "${updateUserDto.username}" already exists`,
        );
      }
    }
    if (updateUserDto.password) {
      updateUserDto.password = bcrypt.hashSync(updateUserDto.password, 10);
    }
    this.userRepository.merge(user, updateUserDto);

    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (role) {
        user.role = role;
      }
    }

    const savedUser = await this.userRepository.save(user);
    (savedUser as any).isOnline = this.checkIsOnline(savedUser.statusTime);
    return savedUser;
  }

  /**
   * Deletes or cancels record.
   */
  async remove(id: number): Promise<string> {
    const user = await this.findOne(id);
    if (!user.username) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.softDelete(id);
    return 'Delete success';
  }

  /**
   * Restores a soft-deleted user.
   */
  async restore(id: number) {
    await this.userRepository.restore(id);
    return { success: true, message: `Khôi phục tài khoản người dùng #${id} thành công` };
  }

  /**
   * Retrieves OneByUsername information.
   */
  async findOneByUsername(username: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: {
        role: true,
        detailUser: true,
        addresses: true,
      },
    });
    if (user) {
      (user as any).isOnline = this.checkIsOnline(user.statusTime);
    }
    return user;
  }

  /**
   * Retrieves OneByEmail information.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: {
        role: true,
        detailUser: true,
        addresses: true,
      },
    });
    if (user) {
      (user as any).isOnline = this.checkIsOnline(user.statusTime);
    }
    return user;
  }

  /**
   * Counts the number of users whose username starts with the specified prefix
   */
  async countByUsernamePrefix(prefix: string): Promise<number> {
    return this.userRepository.count({
      where: {
        username: Like(`${prefix}%`),
      },
    });
  }

  /**
   * Uploads and updates user avatar image to Google Drive folder avatar-user
   */
  async updateAvatar(userId: number, file: BufferedFile) {
    if (isNaN(userId) || !userId) {
      throw new BadRequestException(`Invalid User ID (${userId})`);
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Please select an image file to upload');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Please upload an image file (JPEG, PNG, WEBP, GIF, SVG)');
    }

    // Limit maximum file size to 10MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Image size exceeds the allowed limit (maximum 10MB)');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        role: true,
        detailUser: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old avatar from Google Drive if exists
    if (user.avatar) {
      const oldFileId = this.googleDriveService.extractFileIdFromUrl(user.avatar);
      if (oldFileId) {
        await this.googleDriveService.deleteFile(oldFileId);
      }
    }

    // Upload new image to Google Drive folder avatar-user
    const uploadResult = await this.googleDriveService.uploadAvatar(
      file.buffer,
      file.originalname || 'avatar.jpg',
      file.mimetype,
      user.id,
    );

    // Update avatar URL for user
    user.avatar = uploadResult.directUrl;
    const savedUser = await this.userRepository.save(user);

    delete (savedUser as Partial<User>).password;
    (savedUser as any).isOnline = this.checkIsOnline(savedUser.statusTime);

    return {
      success: true,
      message: 'Successfully updated avatar',
      avatar: uploadResult.directUrl,
      fileId: uploadResult.fileId,
      user: savedUser,
    };
  }
}

