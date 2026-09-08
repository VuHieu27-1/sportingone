import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { PricingRule } from './entities/pricing-rule.entity';
import { Yard } from '../yards/entities/yard.entity';

@Injectable()
export class PricingRulesService {
  constructor(
    @InjectRepository(PricingRule)
    private readonly repository: Repository<PricingRule>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreatePricingRuleDto) {
    const { yardId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<PricingRule>);
    const yardVal = await this.yardRepository.findOne({
      where: { id: dto.yardId },
    });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    entity.yard = yardVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { yard: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: true },
    });
    if (!entity) {
      throw new NotFoundException(`PricingRule with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdatePricingRuleDto) {
    const entity = await this.findOne(id);
    const { yardId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({
        where: { id: dto.yardId },
      });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
      }
      entity.yard = yardVal;
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
