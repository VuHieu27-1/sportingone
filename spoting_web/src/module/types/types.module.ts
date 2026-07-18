import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypessService } from './types.service';
import { TypessController } from './types.controller';
import { Types } from './entities/type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Types])],
  controllers: [TypessController],
  providers: [TypessService],
  exports: [TypeOrmModule],
})
export class TypesModule {}
