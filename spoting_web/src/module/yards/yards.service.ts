import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateYardDto } from './dto/create-yard.dto';
import { UpdateYardDto } from './dto/update-yard.dto';
import { Yard } from './entities/yard.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Types } from '../types/entities/type.entity';

@Injectable()
export class YardsService {
  constructor(
    @InjectRepository(Yard) private readonly repository: Repository<Yard>,
    @InjectRepository(SportType) private readonly sportTypeRepository: Repository<SportType>,
    @InjectRepository(Vendor) private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Types) private readonly typeYardRepository: Repository<Types>
  ) { }

  async create(dto: CreateYardDto) {
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Yard>);
    if (dto.sportTypeId !== undefined && dto.sportTypeId !== null) {
      const sportTypeVal = await this.sportTypeRepository.findOne({ where: { id: dto.sportTypeId } });
      if (!sportTypeVal) {
        throw new NotFoundException(`SportType with ID ${dto.sportTypeId} not found`);
      }
      entity.sportType = sportTypeVal;
    }
    if (dto.vendorId !== undefined && dto.vendorId !== null) {
      const vendorVal = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
      if (!vendorVal) {
        throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
      }
      entity.vendor = vendorVal;
    }
    if (dto.saleId !== undefined && dto.saleId !== null) {
      const saleVal = await this.saleRepository.findOne({ where: { id: dto.saleId } });
      if (!saleVal) {
        throw new NotFoundException(`Sale with ID ${dto.saleId} not found`);
      }
      entity.sale = saleVal;
    }
    if (dto.typeYardId !== undefined && dto.typeYardId !== null) {
      const typeYardVal = await this.typeYardRepository.findOne({ where: { id: dto.typeYardId } });
      if (!typeYardVal) {
        throw new NotFoundException(`Types with ID ${dto.typeYardId} not found`);
      }
      entity.typeYard = typeYardVal;
    }
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { sportType: true, vendor: true, sale: true, typeYard: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { sportType: true, vendor: true, sale: true, typeYard: true }
    });
    if (!entity) {
      throw new NotFoundException(`Yard with ID ${id} not found`);
    }
    return entity;
  }

  async findYardByVendor(id: number) {
    const entity = await this.repository.find({
      where: { vendor: { id } },
      relations: { sportType: true, vendor: true, sale: true, typeYard: true }
    })
    if (!entity) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateYardDto) {
    const entity = await this.findOne(id);
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.sportTypeId !== undefined) {
      if (dto.sportTypeId === null) {
        entity.sportType = null as any;
      } else {
        const sportTypeVal = await this.sportTypeRepository.findOne({ where: { id: dto.sportTypeId } });
        if (!sportTypeVal) {
          throw new NotFoundException(`SportType with ID ${dto.sportTypeId} not found`);
        }
        entity.sportType = sportTypeVal;
      }
    }
    if (dto.vendorId !== undefined) {
      if (dto.vendorId === null) {
        entity.vendor = null as any;
      } else {
        const vendorVal = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
        if (!vendorVal) {
          throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
        }
        entity.vendor = vendorVal;
      }
    }
    if (dto.saleId !== undefined) {
      if (dto.saleId === null) {
        entity.sale = null as any;
      } else {
        const saleVal = await this.saleRepository.findOne({ where: { id: dto.saleId } });
        if (!saleVal) {
          throw new NotFoundException(`Sale with ID ${dto.saleId} not found`);
        }
        entity.sale = saleVal;
      }
    }
    if (dto.typeYardId !== undefined) {
      if (dto.typeYardId === null) {
        entity.typeYard = null as any;
      } else {
        const typeYardVal = await this.typeYardRepository.findOne({ where: { id: dto.typeYardId } });
        if (!typeYardVal) {
          throw new NotFoundException(`Types with ID ${dto.typeYardId} not found`);
        }
        entity.typeYard = typeYardVal;
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
