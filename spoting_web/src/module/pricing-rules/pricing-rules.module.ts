import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingRule } from './entities/pricing-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PricingRule])],
  exports: [TypeOrmModule],
})
export class PricingRulesModule {}
