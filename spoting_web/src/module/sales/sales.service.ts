import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly repository: Repository<Sale>
  ) {}

  async create(dto: CreateSaleDto) {
    const entity = this.repository.create(dto as DeepPartial<Sale>);
    
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
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateSaleDto) {
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
