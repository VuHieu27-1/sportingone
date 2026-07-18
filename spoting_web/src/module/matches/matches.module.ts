import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchsService } from './matches.service';
import { MatchsController } from './matches.controller';
import { Match } from './entities/match.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Group } from '../groups/entities/group.entity';
import { Yard } from '../yards/entities/yard.entity';
import { Team } from '../teams/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Tournament, Group, Yard, Team, Team, Team])],
  controllers: [MatchsController],
  providers: [MatchsService],
  exports: [TypeOrmModule],
})
export class MatchesModule {}
