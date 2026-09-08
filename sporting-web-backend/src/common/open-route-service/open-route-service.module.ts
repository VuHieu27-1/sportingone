import { Module } from '@nestjs/common';
import { OpenRouteServiceService } from './open-route-service.service';

@Module({
  providers: [OpenRouteServiceService],
  exports: [OpenRouteServiceService],
})
export class OpenRouteServiceModule {}
