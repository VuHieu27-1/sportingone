import { Module } from '@nestjs/common';
import { YardsService } from './yards.service';
import { YardsController } from './yards.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Yard } from './entities/yard.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Types } from '../types/entities/type.entity';
import { Sale } from '../sales/entities/sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Yard, Vendor, Types, Sale])],
  controllers: [YardsController],
  providers: [YardsService],
})
export class YardsModule {}
