import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateNotificationUserDto } from './dto/create-notification-user.dto';
import { UpdateNotificationUserDto } from './dto/update-notification-user.dto';
import { NotificationUser } from './entities/notification-user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationUsersService {
  constructor(
    @InjectRepository(NotificationUser)
    private readonly repository: Repository<NotificationUser>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly receiverRepository: Repository<User>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateNotificationUserDto) {
    const { notificationId, receiverId, ...cleanDto } = dto;
    const entity = this.repository.create(
      cleanDto as DeepPartial<NotificationUser>,
    );
    const notificationVal = await this.notificationRepository.findOne({
      where: { id: dto.notificationId },
    });
    if (!notificationVal) {
      throw new NotFoundException(
        `Notification with ID ${dto.notificationId} not found`,
      );
    }
    entity.notification = notificationVal;
    const receiverVal = await this.receiverRepository.findOne({
      where: { id: dto.receiverId },
    });
    if (!receiverVal) {
      throw new NotFoundException(`User with ID ${dto.receiverId} not found`);
    }
    entity.receiver = receiverVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information with relations, optionally filtered by receiverId.
   */
  async findAll(receiverId?: number) {
    if (receiverId) {
      return this.repository.find({
        where: { receiver: { id: receiverId } },
        relations: {
          notification: { user: { detailUser: true } },
          receiver: { detailUser: true },
        },
        order: {
          id: 'DESC',
        },
      });
    }
    return this.repository.find({
      relations: {
        notification: { user: { detailUser: true } },
        receiver: { detailUser: true },
      },
      order: {
        id: 'DESC',
      },
    });
  }

  /**
   * Marks all notifications of a specific receiver as read.
   */
  async markAllAsRead(receiverId: number) {
    await this.repository.update(
      { receiver: { id: receiverId }, status: 'unread' },
      { status: 'read' },
    );
    return { success: true, message: 'Đã đánh dấu tất cả là đã đọc' };
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { notification: true, receiver: true },
    });
    if (!entity) {
      throw new NotFoundException(`NotificationUser with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateNotificationUserDto) {
    const entity = await this.findOne(id);
    const { notificationId, receiverId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.notificationId !== undefined) {
      const notificationVal = await this.notificationRepository.findOne({
        where: { id: dto.notificationId },
      });
      if (!notificationVal) {
        throw new NotFoundException(
          `Notification with ID ${dto.notificationId} not found`,
        );
      }
      entity.notification = notificationVal;
    }
    if (dto.receiverId !== undefined) {
      const receiverVal = await this.receiverRepository.findOne({
        where: { id: dto.receiverId },
      });
      if (!receiverVal) {
        throw new NotFoundException(`User with ID ${dto.receiverId} not found`);
      }
      entity.receiver = receiverVal;
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
}
