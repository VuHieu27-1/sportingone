import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly repository: Repository<Booking>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async create(dto: CreateBookingDto) {
    const { yardId, userId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Booking>);
    const yardVal = await this.yardRepository.findOne({
      where: { id: dto.yardId },
      relations: { vendor: true }
    });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    if (yardVal.vendor && yardVal.vendor.status !== 'active') {
      throw new BadRequestException(`Vendor of this yard is not active (status: ${yardVal.vendor.status})`);
    }
    entity.yard = yardVal;
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { yard: true, user: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: true, user: true }
    });
    if (!entity) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateBookingDto) {
    const entity = await this.findOne(id);
    const { yardId, userId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({
        where: { id: dto.yardId },
        relations: { vendor: true }
      });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
      }
      if (yardVal.vendor && yardVal.vendor.status !== 'active') {
        throw new BadRequestException(`Vendor of this yard is not active (status: ${yardVal.vendor.status})`);
      }
      entity.yard = yardVal;
    }
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
