import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private readonly repository: Repository<Team>,
    @InjectRepository(User)
    private readonly captainRepository: Repository<User>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateTeamDto) {
    const { captainId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Team>);
    if (dto.captainId !== undefined && dto.captainId !== null) {
      const captainVal = await this.captainRepository.findOne({
        where: { id: dto.captainId },
      });
      if (!captainVal) {
        throw new NotFoundException(`User with ID ${dto.captainId} not found`);
      }
      entity.captain = captainVal;
    }
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { captain: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { captain: true },
    });
    if (!entity) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateTeamDto) {
    const entity = await this.findOne(id);
    const { captainId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.captainId !== undefined) {
      if (dto.captainId === null) {
        entity.captain = null as any;
      } else {
        const captainVal = await this.captainRepository.findOne({
          where: { id: dto.captainId },
        });
        if (!captainVal) {
          throw new NotFoundException(
            `User with ID ${dto.captainId} not found`,
          );
        }
        entity.captain = captainVal;
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
