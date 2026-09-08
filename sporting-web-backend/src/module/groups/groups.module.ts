import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './entities/group.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Tournament])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [TypeOrmModule],
})
export class GroupsModule {}
