import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportTypesService } from './sport-types.service';
import { SportTypesController } from './sport-types.controller';
import { SportType } from './entities/sport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SportType])],
  controllers: [SportTypesController],
  providers: [SportTypesService],
  exports: [TypeOrmModule],
})
export class SportTypesModule {}
