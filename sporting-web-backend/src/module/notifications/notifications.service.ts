import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, In } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationUser } from '../notification-users/entities/notification-user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(NotificationUser)
    private readonly notificationUserRepository: Repository<NotificationUser>,
  ) {}

  /**
   * Creates or saves record with receivers.
   */
  async create(dto: CreateNotificationDto) {
    const { userId, receiverIds, ...cleanDto } = dto;
    const entity = this.repository.create(
      cleanDto as DeepPartial<Notification>,
    );
    const userVal = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: { detailUser: true, role: true },
    });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    const savedNotification = await this.repository.save(entity);

    if (receiverIds && Array.isArray(receiverIds) && receiverIds.length > 0) {
      const receivers = await this.userRepository.findBy({
        id: In(receiverIds),
      });

      if (receivers.length > 0) {
        const notificationUsers = receivers.map((receiver) =>
          this.notificationUserRepository.create({
            notification: savedNotification,
            receiver,
            status: 'unread',
          }),
        );
        await this.notificationUserRepository.save(notificationUsers);
      }
    }

    return this.findOne(savedNotification.id);
  }

  /**
   * Helper to send automated system/admin notification to a single user.
   */
  async sendSystemNotification(
    receiverId: number,
    notificationName: string,
    contents: string,
    senderUserId?: number,
  ) {
    try {
      let senderUser: User | null = null;
      if (senderUserId) {
        senderUser = await this.userRepository.findOne({
          where: { id: senderUserId },
        });
      }
      if (!senderUser) {
        senderUser = await this.userRepository.findOne({
          where: { role: { roleName: 'admin' } },
        });
        if (!senderUser) {
          senderUser = await this.userRepository.findOne({
            where: { id: 1 },
          });
        }
      }

      if (!senderUser) return null;

      const receiver = await this.userRepository.findOne({
        where: { id: receiverId },
      });
      if (!receiver) return null;

      const notification = this.repository.create({
        notificationName,
        contents,
        user: senderUser,
      });
      const savedNotification = await this.repository.save(notification);

      const notifUser = this.notificationUserRepository.create({
        notification: savedNotification,
        receiver,
        status: 'unread',
      });
      await this.notificationUserRepository.save(notifUser);
      return savedNotification;
    } catch (err) {
      console.error('Failed to send automated notification:', err);
      return null;
    }
  }

  /**
   * Retrieves All notifications with full relations.
   */
  async findAll() {
    return this.repository.find({
      relations: {
        user: { detailUser: true, role: true },
        notificationUsers: {
          receiver: { detailUser: true, role: true },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Retrieves One notification with full relations.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: {
        user: { detailUser: true, role: true },
        notificationUsers: {
          receiver: { detailUser: true, role: true },
        },
      },
    });
    if (!entity) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateNotificationDto) {
    const entity = await this.findOne(id);
    const { userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
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
