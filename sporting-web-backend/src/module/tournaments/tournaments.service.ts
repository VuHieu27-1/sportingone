import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly repository: Repository<Tournament>,
    @InjectRepository(SportType)
    private readonly sportTypeRepository: Repository<SportType>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateTournamentDto) {
    const { sportTypeId, vendorId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Tournament>);
    const sportTypeVal = await this.sportTypeRepository.findOne({
      where: { id: dto.sportTypeId },
    });
    if (!sportTypeVal) {
      throw new NotFoundException(
        `SportType with ID ${dto.sportTypeId} not found`,
      );
    }
    entity.sportType = sportTypeVal;
    const vendorVal = await this.vendorRepository.findOne({
      where: { id: dto.vendorId },
    });
    if (!vendorVal) {
      throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
    }
    entity.vendor = vendorVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: {
        sportType: true,
        groups: true,
        tournamentTeams: true,
        vendor: { yards: true },
      },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: {
        sportType: true,
        vendor: true,
        groups: true,
        tournamentTeams: true,
      },
    });
    if (!entity) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateTournamentDto) {
    const entity = await this.findOne(id);
    const { sportTypeId, vendorId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.sportTypeId !== undefined) {
      const sportTypeVal = await this.sportTypeRepository.findOne({
        where: { id: dto.sportTypeId },
      });
      if (!sportTypeVal) {
        throw new NotFoundException(
          `SportType with ID ${dto.sportTypeId} not found`,
        );
      }
      entity.sportType = sportTypeVal;
    }
    if (dto.vendorId !== undefined) {
      const vendorVal = await this.vendorRepository.findOne({
        where: { id: dto.vendorId },
      });
      if (!vendorVal) {
        throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
      }
      entity.vendor = vendorVal;
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
