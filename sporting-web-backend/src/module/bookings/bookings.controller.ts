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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PayBookingsWithWalletDto } from './dto/pay-wallet-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() createDto: CreateBookingDto) {
    createDto.userId = req.user.id;
    return this.service.create(createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay-with-wallet')
  payWithWallet(@Request() req: any, @Body() dto: PayBookingsWithWalletDto) {
    return this.service.payBookingsWithWallet(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyBookings(@Request() req: any) {
    return this.service.findMyBookings(req.user.id);
  }

  /**
   * Retrieves All information or filtered by yardId
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Request() req: any,
    @Query('yardId') yardId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      yardId: yardId ? Number(yardId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
      date,
      status,
      currentUser: req.user,
    });
  }

  @Get('check-availability')
  checkAvailability(
    @Query('yardId') yardId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const yId = Number(yardId);
    return this.service.checkYardAvailability(yId, startTime || '', endTime || '');
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
    return this.service.cancelPaidBooking(+id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBookingDto) {
    return this.service.update(+id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restoreBooking(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
