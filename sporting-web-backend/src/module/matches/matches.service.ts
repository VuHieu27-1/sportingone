import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Match } from './entities/match.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Group } from '../groups/entities/group.entity';
import { Yard } from '../yards/entities/yard.entity';
import { Team } from '../teams/entities/team.entity';

@Injectable()
export class MatchsService {
  constructor(
    @InjectRepository(Match) private readonly repository: Repository<Match>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Yard) private readonly yardRepository: Repository<Yard>,
    @InjectRepository(Team) private readonly team1Repository: Repository<Team>,
    @InjectRepository(Team) private readonly team2Repository: Repository<Team>,
    @InjectRepository(Team) private readonly winnerRepository: Repository<Team>,
  ) {}

  /**
   * Creates or saves record.
   */
  async create(dto: CreateMatchDto) {
    const {
      tournamentId,
      groupId,
      yardId,
      team1Id,
      team2Id,
      winnerId,
      ...cleanDto
    } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Match>);
    const tournamentVal = await this.tournamentRepository.findOne({
      where: { id: dto.tournamentId },
    });
    if (!tournamentVal) {
      throw new NotFoundException(
        `Tournament with ID ${dto.tournamentId} not found`,
      );
    }
    entity.tournament = tournamentVal;
    const groupVal = await this.groupRepository.findOne({
      where: { id: dto.groupId },
    });
    if (!groupVal) {
      throw new NotFoundException(`Group with ID ${dto.groupId} not found`);
    }
    entity.group = groupVal;
    const yardVal = await this.yardRepository.findOne({
      where: { id: dto.yardId },
    });
    if (!yardVal) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }
    entity.yard = yardVal;
    const team1Val = await this.team1Repository.findOne({
      where: { id: dto.team1Id },
    });
    if (!team1Val) {
      throw new NotFoundException(`Team with ID ${dto.team1Id} not found`);
    }
    entity.team1 = team1Val;
    const team2Val = await this.team2Repository.findOne({
      where: { id: dto.team2Id },
    });
    if (!team2Val) {
      throw new NotFoundException(`Team with ID ${dto.team2Id} not found`);
    }
    entity.team2 = team2Val;
    if (dto.winnerId !== undefined && dto.winnerId !== null) {
      const winnerVal = await this.winnerRepository.findOne({
        where: { id: dto.winnerId },
      });
      if (!winnerVal) {
        throw new NotFoundException(`Team with ID ${dto.winnerId} not found`);
      }
      entity.winner = winnerVal;
    }
    return this.repository.save(entity);
  }

  /**
   * Retrieves All information.
   */
  async findAll() {
    return this.repository.find({
      relations: {
        tournament: true,
        group: true,
        yard: true,
        team1: true,
        team2: true,
        winner: true,
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
        tournament: true,
        group: true,
        yard: true,
        team1: true,
        team2: true,
        winner: true,
      },
    });
    if (!entity) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates record details.
   */
  async update(id: number, dto: UpdateMatchDto) {
    const entity = await this.findOne(id);
    const {
      tournamentId,
      groupId,
      yardId,
      team1Id,
      team2Id,
      winnerId,
      ...cleanDto
    } = dto;
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
    if (dto.groupId !== undefined) {
      const groupVal = await this.groupRepository.findOne({
        where: { id: dto.groupId },
      });
      if (!groupVal) {
        throw new NotFoundException(`Group with ID ${dto.groupId} not found`);
      }
      entity.group = groupVal;
    }
    if (dto.yardId !== undefined) {
      const yardVal = await this.yardRepository.findOne({
        where: { id: dto.yardId },
      });
      if (!yardVal) {
        throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
      }
      entity.yard = yardVal;
    }
    if (dto.team1Id !== undefined) {
      const team1Val = await this.team1Repository.findOne({
        where: { id: dto.team1Id },
      });
      if (!team1Val) {
        throw new NotFoundException(`Team with ID ${dto.team1Id} not found`);
      }
      entity.team1 = team1Val;
    }
    if (dto.team2Id !== undefined) {
      const team2Val = await this.team2Repository.findOne({
        where: { id: dto.team2Id },
      });
      if (!team2Val) {
        throw new NotFoundException(`Team with ID ${dto.team2Id} not found`);
      }
      entity.team2 = team2Val;
    }
    if (dto.winnerId !== undefined) {
      if (dto.winnerId === null) {
        entity.winner = null;
      } else {
        const winnerVal = await this.winnerRepository.findOne({
          where: { id: dto.winnerId },
        });
        if (!winnerVal) {
          throw new NotFoundException(`Team with ID ${dto.winnerId} not found`);
        }
        entity.winner = winnerVal;
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
