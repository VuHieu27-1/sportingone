import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportType } from './entities/sport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SportType])],
  exports: [TypeOrmModule],
})
export class SportTypesModule {}
