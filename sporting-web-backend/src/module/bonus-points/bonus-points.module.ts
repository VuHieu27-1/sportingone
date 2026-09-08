import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusPointsService } from './bonus-points.service';
import { BonusPointsController } from './bonus-points.controller';
import { BonusPoint } from './entities/bonus-point.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BonusPoint, User])],
  controllers: [BonusPointsController],
  providers: [BonusPointsService],
  exports: [TypeOrmModule],
})
export class BonusPointsModule {}
