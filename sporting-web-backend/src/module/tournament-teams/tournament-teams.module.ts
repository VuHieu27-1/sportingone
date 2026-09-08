import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentTeamsService } from './tournament-teams.service';
import { TournamentTeamsController } from './tournament-teams.controller';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentTeam, Team, Tournament])],
  controllers: [TournamentTeamsController],
  providers: [TournamentTeamsService],
  exports: [TypeOrmModule],
})
export class TournamentTeamsModule {}
