import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly repository: Repository<Group>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateGroupDto) {
    const { tournamentId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Group>);
    const tournamentVal = await this.tournamentRepository.findOne({
      where: { id: dto.tournamentId },
    });
    if (!tournamentVal) {
      throw new NotFoundException(
        `Tournament with ID ${dto.tournamentId} not found`,
      );
    }
    entity.tournament = tournamentVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { tournament: true, groupTeams: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { tournament: true, groupTeams: true },
    });
    if (!entity) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateGroupDto) {
    const entity = await this.findOne(id);
    const { tournamentId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.tournamentId !== undefined) {
      const tournamentVal = await this.tournamentRepository.findOne({
        where: { id: dto.tournamentId },
      });
      if (!tournamentVal) {
        throw new NotFoundException(
          `Tournament with ID ${dto.tournamentId} not found`,
        );
      }
      entity.tournament = tournamentVal;
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
