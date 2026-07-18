import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Yard } from '../yards/entities/yard.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repository: Repository<Payment>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>
  ) {}

  async create(dto: CreatePaymentDto) {
    const { yardId, userId, bookingId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Payment>);
    const yardVal = await this.yardRepository.findOne({ where: { id: dto.yardId } });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    entity.yard = yardVal;
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    entity.user = userVal;
    if (dto.bookingId !== undefined && dto.bookingId !== null) {
      const bookingVal = await this.bookingRepository.findOne({ where: { id: dto.bookingId } });
      if (!bookingVal) {
        throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
      }
      entity.booking = bookingVal;
    }
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { yard: true, user: true, booking: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: true, user: true, booking: true }
    });
    if (!entity) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdatePaymentDto) {
    const entity = await this.findOne(id);
    const { yardId, userId, bookingId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({ where: { id: dto.yardId } });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
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
    if (dto.bookingId !== undefined) {
      if (dto.bookingId === null) {
        entity.booking = null as any;
      } else {
        const bookingVal = await this.bookingRepository.findOne({ where: { id: dto.bookingId } });
        if (!bookingVal) {
          throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
        }
        entity.booking = bookingVal;
      }
    }
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
