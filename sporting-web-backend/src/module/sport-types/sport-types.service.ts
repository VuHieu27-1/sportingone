import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateSportTypeDto } from './dto/create-sport-type.dto';
import { UpdateSportTypeDto } from './dto/update-sport-type.dto';
import { SportType } from './entities/sport-type.entity';

@Injectable()
export class SportTypesService {
  constructor(
    @InjectRepository(SportType)
    private readonly repository: Repository<SportType>,
  ) { }

  /**
   * Creates or saves record.
   */
  async create(dto: CreateSportTypeDto) {
    const entity = this.repository.create(dto as DeepPartial<SportType>);

    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({});
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
    });
    if (!entity) {
      throw new NotFoundException(`SportType with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateSportTypeDto) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, dto);

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
