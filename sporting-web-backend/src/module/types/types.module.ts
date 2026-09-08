import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypessService } from './types.service';
import { TypessController } from './types.controller';
import { Types } from './entities/type.entity';
import { User } from '../users/entities/user.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Types, User, SportType])],
  controllers: [TypessController],
  providers: [TypessService],
  exports: [TypeOrmModule],
})
export class TypesModule {}
