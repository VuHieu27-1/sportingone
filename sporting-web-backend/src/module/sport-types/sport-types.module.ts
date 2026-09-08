import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportTypesService } from './sport-types.service';
import { SportTypesController } from './sport-types.controller';
import { SportType } from './entities/sport-type.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SportType, User])],
  controllers: [SportTypesController],
  providers: [SportTypesService],
  exports: [TypeOrmModule],
})
export class SportTypesModule {}
