import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentTeam } from './entities/tournament-team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentTeam])],
  exports: [TypeOrmModule],
})
export class TournamentTeamsModule {}
