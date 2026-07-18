import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateTypesDto } from './dto/create-type.dto';
import { UpdateTypesDto } from './dto/update-type.dto';
import { Types } from './entities/type.entity';

@Injectable()
export class TypessService {
  constructor(
    @InjectRepository(Types) private readonly repository: Repository<Types>
  ) {}

  async create(dto: CreateTypesDto) {
    const entity = this.repository.create(dto as DeepPartial<Types>);
    
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      
    });
    if (!entity) {
      throw new NotFoundException(`Types with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateTypesDto) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, dto as any);
    
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
