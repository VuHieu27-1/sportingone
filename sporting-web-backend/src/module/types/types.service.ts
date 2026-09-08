import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateTypesDto } from './dto/create-type.dto';
import { UpdateTypesDto } from './dto/update-type.dto';
import { Types } from './entities/type.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';

@Injectable()
export class TypessService {
  constructor(
    @InjectRepository(Types) private readonly repository: Repository<Types>,
    @InjectRepository(SportType)
    private readonly sportTypeRepository: Repository<SportType>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateTypesDto) {
    const { sportTypeId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Types>);

    if (sportTypeId) {
      const sportTypeVal = await this.sportTypeRepository.findOne({
        where: { id: sportTypeId },
      });
      if (!sportTypeVal) {
        throw new NotFoundException(
          `SportType with ID ${sportTypeId} not found`,
        );
      }
      entity.sportType = sportTypeVal;
    }

    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { sportType: true },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { sportType: true },
    });
    if (!entity) {
      throw new NotFoundException(`Types with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateTypesDto) {
    const entity = await this.findOne(id);
    const { sportTypeId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);

    if (sportTypeId !== undefined) {
      if (sportTypeId === null) {
        entity.sportType = null as any;
      } else {
        const sportTypeVal = await this.sportTypeRepository.findOne({
          where: { id: sportTypeId },
        });
        if (!sportTypeVal) {
          throw new NotFoundException(
            `SportType with ID ${sportTypeId} not found`,
          );
        }
        entity.sportType = sportTypeVal;
      }
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
