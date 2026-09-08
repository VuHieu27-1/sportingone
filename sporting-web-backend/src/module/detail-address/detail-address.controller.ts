import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DetailAddressService } from './detail-address.service';

@Controller('detail-address')
export class DetailAddressController {
  constructor(private readonly detailAddressService: DetailAddressService) {}

  /**
   * Retrieves AllProvinces information.
   */
  @Get('provinces')
  async getAllProvinces() {
    return this.detailAddressService.getAllProvinces();
  }

  @Get('provinces/:code/wards')
  async getWardsByProvince(@Param('code', ParseIntPipe) code: number) {
    return this.detailAddressService.getWardsByProvince(code);
  }

  @Get('geocode')
  async geocodeAddress(@Query('address') address: string) {
    return this.detailAddressService.geocodeAddress(address);
  }
}
