import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { Camera } from './entities/camera.entity';
import { Yard } from '../yards/entities/yard.entity';

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(Camera) private readonly repository: Repository<Camera>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>
  ) {}

  async create(dto: CreateCameraDto) {
    const { yardId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Camera>);
    const yardVal = await this.yardRepository.findOne({ where: { id: dto.yardId } });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    entity.yard = yardVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { yard: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: true }
    });
    if (!entity) {
      throw new NotFoundException(`Camera with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateCameraDto) {
    const entity = await this.findOne(id);
    const { yardId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({ where: { id: dto.yardId } });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
      }
      entity.yard = yardVal;
    }
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
