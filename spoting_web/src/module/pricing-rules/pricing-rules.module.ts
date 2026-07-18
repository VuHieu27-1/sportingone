import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingRulesService } from './pricing-rules.service';
import { PricingRulesController } from './pricing-rules.controller';
import { PricingRule } from './entities/pricing-rule.entity';
import { Yard } from '../yards/entities/yard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PricingRule, Yard])],
  controllers: [PricingRulesController],
  providers: [PricingRulesService],
  exports: [TypeOrmModule],
})
export class PricingRulesModule {}
