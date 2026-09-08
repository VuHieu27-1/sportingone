import { Controller, Get } from '@nestjs/common';
import { BanksApiService } from './banks.service';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksApiService: BanksApiService) {}

  /**
   * Retrieves Banks information.
   */
  @Get()
  async getBanks() {
    return this.banksApiService.getVietQRBanks();
  }
}
