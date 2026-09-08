import { Module } from '@nestjs/common';
import { BanksApiService } from './banks.service';
import { BanksController } from './banks.controller';

@Module({
  controllers: [BanksController],
  providers: [BanksApiService],
  exports: [BanksApiService],
})
export class BanksModule {}
