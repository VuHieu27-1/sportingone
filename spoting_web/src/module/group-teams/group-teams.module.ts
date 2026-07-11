import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupTeam } from './entities/group-team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupTeam])],
  exports: [TypeOrmModule],
})
export class GroupTeamsModule {}
