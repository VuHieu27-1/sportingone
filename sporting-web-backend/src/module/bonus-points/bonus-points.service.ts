import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateBonusPointDto } from './dto/create-bonus-point.dto';
import { UpdateBonusPointDto } from './dto/update-bonus-point.dto';
import { BonusPoint } from './entities/bonus-point.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BonusPointsService {
  constructor(
    @InjectRepository(BonusPoint)
    private readonly repository: Repository<BonusPoint>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateBonusPointDto) {
    const { userId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<BonusPoint>);
    const userVal = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { user: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!entity) {
      throw new NotFoundException(`BonusPoint with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateBonusPointDto) {
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
