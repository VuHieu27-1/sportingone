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
    @InjectRepository(BonusPoint) private readonly repository: Repository<BonusPoint>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async create(dto: CreateBonusPointDto) {
    const { userId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<BonusPoint>);
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { user: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { user: true }
    });
    if (!entity) {
      throw new NotFoundException(`BonusPoint with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateBonusPointDto) {
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
