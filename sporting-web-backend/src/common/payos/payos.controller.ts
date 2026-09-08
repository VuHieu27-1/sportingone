import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PayOSService } from './payos.service';
import { CreatePayOSPaymentDto, UpdatePayOSStatusDto, CancelPayOSPaymentDto } from './dto';
import { JwtAuthGuard } from '../../module/auth/guards/jwt-auth.guard';

@Controller('payment')
export class PayOSController {
  constructor(private readonly payOSService: PayOSService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create-payment')
  createPaymentLink(@Body() body: CreatePayOSPaymentDto) {
    return this.payOSService.createPaymentLink(body);
  }

  @Get('payment-info/:orderCode')
  getPaymentInfo(@Param('orderCode') orderCode: string) {
    return this.payOSService.getPaymentInfo(+orderCode);
  }

  @Post('update-status')
  updatePaymentStatus(@Body() body: UpdatePayOSStatusDto) {
    return this.payOSService.updatePaymentStatus(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-payment')
  cancelPaymentLink(@Body() body: CancelPayOSPaymentDto) {
    return this.payOSService.cancelPaymentLink(body);
  }

  @Post('webhook')
  handlePayOSWebhook(@Body() webhookBody: any) {
    return this.payOSService.handleWebhook(webhookBody);
  }
}
