import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repository: Repository<Notification>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async create(dto: CreateNotificationDto) {
    const { userId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Notification>);
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { user: true, notificationUsers: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { user: true, notificationUsers: true }
    });
    if (!entity) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateNotificationDto) {
    const entity = await this.findOne(id);
    const { userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.userId !== undefined) {
      const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
      if (!userVal) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      entity.user = userVal;
    }
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
