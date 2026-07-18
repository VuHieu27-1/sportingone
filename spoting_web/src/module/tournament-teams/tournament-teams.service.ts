import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateTournamentTeamDto } from './dto/create-tournament-team.dto';
import { UpdateTournamentTeamDto } from './dto/update-tournament-team.dto';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';

@Injectable()
export class TournamentTeamsService {
  constructor(
    @InjectRepository(TournamentTeam) private readonly repository: Repository<TournamentTeam>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    @InjectRepository(Tournament) private readonly tournamentRepository: Repository<Tournament>
  ) {}

  async create(dto: CreateTournamentTeamDto) {
    const { teamId, tournamentId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<TournamentTeam>);
    const teamVal = await this.teamRepository.findOne({ where: { id: dto.teamId } });
    if (!teamVal) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }
    entity.team = teamVal;
    const tournamentVal = await this.tournamentRepository.findOne({ where: { id: dto.tournamentId } });
    if (!tournamentVal) {
      throw new NotFoundException(`Tournament with ID ${dto.tournamentId} not found`);
    }
    entity.tournament = tournamentVal;
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: { team: true, tournament: true }
    });
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { team: true, tournament: true }
    });
    if (!entity) {
      throw new NotFoundException(`TournamentTeam with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateTournamentTeamDto) {
    const entity = await this.findOne(id);
    const { teamId, tournamentId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);
    if (dto.teamId !== undefined) {
      const teamVal = await this.teamRepository.findOne({ where: { id: dto.teamId } });
      if (!teamVal) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }
      entity.team = teamVal;
    }
    if (dto.tournamentId !== undefined) {
      const tournamentVal = await this.tournamentRepository.findOne({ where: { id: dto.tournamentId } });
      if (!tournamentVal) {
        throw new NotFoundException(`Tournament with ID ${dto.tournamentId} not found`);
      }
      entity.tournament = tournamentVal;
    }
    return this.repository.save(entity);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
