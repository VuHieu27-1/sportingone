import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusPoint } from './entities/bonus-point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BonusPoint])],
  exports: [TypeOrmModule],
})
export class BonusPointsModule {}
