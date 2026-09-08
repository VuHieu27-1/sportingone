import { Module } from '@nestjs/common';
import { DetailAddressController } from './detail-address.controller';
import { DetailAddressService } from './detail-address.service';
import { ProvincesApiService } from '../../common/provinces/provinces.service';
import { OpenRouteServiceModule } from '../../common/open-route-service/open-route-service.module';

@Module({
  imports: [OpenRouteServiceModule],
  controllers: [DetailAddressController],
  providers: [DetailAddressService, ProvincesApiService],
  exports: [DetailAddressService, ProvincesApiService],
})
export class DetailAddressModule {}
