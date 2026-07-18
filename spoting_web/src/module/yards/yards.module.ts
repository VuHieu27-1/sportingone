import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YardsService } from './yards.service';
import { YardsController } from './yards.controller';
import { Yard } from './entities/yard.entity';
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Types } from '../types/entities/type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Yard, SportType, Vendor, Sale, Types])],
  controllers: [YardsController],
  providers: [YardsService],
  exports: [TypeOrmModule],
})
export class YardsModule {}
