import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { Tournament } from './entities/tournament.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, SportType, Vendor])],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TypeOrmModule],
})
export class TournamentsModule {}
