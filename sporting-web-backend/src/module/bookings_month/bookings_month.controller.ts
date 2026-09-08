import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Redirect,
} from '@nestjs/common';
import { BookingsMonthService } from './bookings_month.service';
import { CreateBookingsMonthDto } from './dto/create-bookings_month.dto';
import { UpdateBookingsMonthDto } from './dto/update-bookings_month.dto';
import { PayBookingsMonthWithWalletDto } from './dto/pay-wallet-bookings-month.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings-month')
export class BookingsMonthController {
  constructor(private readonly service: BookingsMonthService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() createDto: CreateBookingsMonthDto) {
    createDto.userId = req.user.id;
    return this.service.create(createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay-with-wallet')
  payWithWallet(@Request() req: any, @Body() dto: PayBookingsMonthWithWalletDto) {
    return this.service.payBookingsMonthWithWallet(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyBookings(@Request() req: any) {
    return this.service.findMyBookings(req.user.id);
  }

  /**
   * Retrieves all monthly bookings or filtered by yardId / startDate / endDate / status.
   */
  @Get()
  findAll(
    @Query('yardId') yardId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      yardId: yardId ? Number(yardId) : undefined,
      startDate,
      endDate,
      status,
    });
  }

  @Get('check-availability')
  checkAvailability(
    @Query('yardId') yardId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const yId = Number(yardId);
    return this.service.checkYardAvailability(
      yId,
      startDate || '',
      endDate || '',
      startTime || '',
      endTime || '',
    );
  }

  @Get('verify_qr')
  @Redirect()
  verifyQr(@Query('id') id: string, @Query('sig') sig: string) {
    return this.service.verifyQrRedirect(id, sig);
  }

  @Get('verify_qr_data')
  verifyQrData(@Query('id') id: string, @Query('sig') sig: string) {
    return this.service.verifyQr(+id, sig);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/process-refund')
  processRefund(@Request() req: any, @Param('id') id: string) {
    return this.service.processRefund(+id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel-paid')
  cancelPaid(@Request() req: any, @Param('id') id: string) {
    return this.service.cancelPaidBookingMonth(+id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBookingsMonthDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restoreBookingMonth(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
