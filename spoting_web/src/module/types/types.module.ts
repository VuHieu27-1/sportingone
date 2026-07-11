import { Module } from '@nestjs/common';
import { TypesService } from './types.service';
import { TypesController } from './types.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Types } from './entities/type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Types])],
  controllers: [TypesController],
  providers: [TypesService],
})
export class TypesModule {}
