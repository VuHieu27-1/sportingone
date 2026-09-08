import { Controller, Get, Query, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { GenerateQrDto } from './common/banks/dto/generate-qr.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  /**
   * Retrieves Hello information.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Retrieves Time information.
   */
  @Get('time')
  getTime() {
    return this.appService.getTime();
  }

  @Get('gps')
  getGps(
    @Req() req: any,
    @Query('ip') queryIp?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.appService.getDeviceLocation(req, queryIp, lat, lng);
  }

  /**
   * API endpoint to generate bank transfer QR code.
   */
  @Get('qr/bank')
  generateBankQr(@Query() query: GenerateQrDto) {
    return this.appService.generateBankQr(query);
  }
}


