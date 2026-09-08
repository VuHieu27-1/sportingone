import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateGroupTeamDto } from './dto/create-group-team.dto';
import { UpdateGroupTeamDto } from './dto/update-group-team.dto';
import { GroupTeam } from './entities/group-team.entity';
import { Group } from '../groups/entities/group.entity';
import { Team } from '../teams/entities/team.entity';

@Injectable()
export class GroupTeamsService {
  constructor(
    @InjectRepository(GroupTeam)
    private readonly repository: Repository<GroupTeam>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateGroupTeamDto) {
    const { groupId, teamId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<GroupTeam>);
    const groupVal = await this.groupRepository.findOne({
      where: { id: dto.groupId },
    });
    if (!groupVal) {
      throw new NotFoundException(`Group with ID ${dto.groupId} not found`);
    }
    entity.group = groupVal;
    const teamVal = await this.teamRepository.findOne({
      where: { id: dto.teamId },
    });
    if (!teamVal) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }
    entity.team = teamVal;
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: { group: true, team: true },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { group: true, team: true },
    });
    if (!entity) {
      throw new NotFoundException(`GroupTeam with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateGroupTeamDto) {
    const entity = await this.findOne(id);
    const { groupId, teamId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto);
    if (dto.groupId !== undefined) {
      const groupVal = await this.groupRepository.findOne({
        where: { id: dto.groupId },
      });
      if (!groupVal) {
        throw new NotFoundException(`Group with ID ${dto.groupId} not found`);
      }
      entity.group = groupVal;
    }
    if (dto.teamId !== undefined) {
      const teamVal = await this.teamRepository.findOne({
        where: { id: dto.teamId },
      });
      if (!teamVal) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }
      entity.team = teamVal;
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
