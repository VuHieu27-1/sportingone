import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupTeamsService } from './group-teams.service';
import { GroupTeamsController } from './group-teams.controller';
import { GroupTeam } from './entities/group-team.entity';
import { Group } from '../groups/entities/group.entity';
import { Team } from '../teams/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupTeam, Group, Team])],
  controllers: [GroupTeamsController],
  providers: [GroupTeamsService],
  exports: [TypeOrmModule],
})
export class GroupTeamsModule {}
